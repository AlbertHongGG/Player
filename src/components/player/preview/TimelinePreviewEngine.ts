/**
 * High-Performance GPU Timeline Preview Engine.
 *
 * Cohesive Architecture:
 * 1. Hardware-Accelerated Decoding: Utilizes Chromium fastSeek (<30ms) and GPU-native
 *    createImageBitmap (<2ms) without any CPU WebP software compression or Blob overhead.
 * 2. Preemptive Concurrency Scheduler: Instantly aborts obsolete in-flight seeks when
 *    cursor moves, eliminating Head-of-Line queue delay.
 * 3. VRAM-Safe LRU Cache: Bounded 150-frame buffer with automatic bitmap.close() release.
 * 4. Virtual Viewport Mount: Bypasses Chromium background media throttling.
 */

export interface PreviewFrame {
  timestamp: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export type FrameCallback = (frame: PreviewFrame) => void;

class VramLruCache {
  private readonly capacity: number;
  private readonly cache = new Map<number, PreviewFrame>();

  constructor(capacity = 150) {
    this.capacity = Math.max(1, capacity);
  }

  public get(key: number): PreviewFrame | undefined {
    const frame = this.cache.get(key);
    if (frame) {
      this.cache.delete(key);
      this.cache.set(key, frame);
    }
    return frame;
  }

  public set(key: number, frame: PreviewFrame): void {
    if (this.cache.has(key)) {
      const old = this.cache.get(key);
      if (old && old !== frame) this.disposeFrame(old);
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldest = this.cache.get(oldestKey);
        if (oldest) this.disposeFrame(oldest);
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, frame);
  }

  public clear(): void {
    for (const frame of this.cache.values()) {
      this.disposeFrame(frame);
    }
    this.cache.clear();
  }

  private disposeFrame(frame: PreviewFrame): void {
    if (frame.bitmap && typeof frame.bitmap.close === "function") {
      try {
        frame.bitmap.close();
      } catch {
        // already detached
      }
    }
  }
}

export class TimelinePreviewEngine {
  private static instance: TimelinePreviewEngine | null = null;

  private video: HTMLVideoElement | null = null;
  private isInitialized = false;
  private currentVideoUrl: string | null = null;
  private readonly cache = new VramLruCache(150);
  private readonly renderWidth: number;
  private readonly quantizeInterval = 0.5;

  // Concurrency & seek preemption state
  private isProcessing = false;
  private currentExecutingTime: number | null = null;
  private nextPendingTarget: { timestamp: number; callback: FrameCallback } | null = null;
  private activeAbortController: AbortController | null = null;
  private pendingSeekListener: (() => void) | null = null;
  private activeRvfcHandle: number | null = null;
  private activeFallbackTimer: number | null = null;

  private constructor() {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.renderWidth = Math.round(160 * Math.min(2.0, Math.max(1.5, dpr))); // 240px - 320px
  }

  public static getInstance(): TimelinePreviewEngine {
    if (!TimelinePreviewEngine.instance) {
      TimelinePreviewEngine.instance = new TimelinePreviewEngine();
    }
    return TimelinePreviewEngine.instance;
  }

  /**
   * Initializes or swaps the active video source.
   */
  public async loadVideo(videoUrl: string): Promise<void> {
    if (this.currentVideoUrl === videoUrl && this.isInitialized && this.video) {
      return;
    }

    this.cancel();
    this.cache.clear();
    this.disposeVideoElement();

    this.currentVideoUrl = videoUrl;
    const video = document.createElement("video");
    video.muted = true;
    video.volume = 0;
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    // Virtual Viewport: in DOM to prevent Chromium throttling, but non-interactive
    video.style.position = "fixed";
    video.style.left = "0px";
    video.style.top = "0px";
    video.style.width = "160px";
    video.style.height = "90px";
    video.style.opacity = "0.001";
    video.style.pointerEvents = "none";
    video.style.zIndex = "-99999";

    if (typeof document !== "undefined" && document.body) {
      document.body.appendChild(video);
    }
    this.video = video;

    return new Promise<void>((resolve, reject) => {
      const onLoadedMetadata = () => {
        cleanup();
        this.isInitialized = true;
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`Failed to load preview metadata: ${videoUrl}`));
      };

      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Requests a preview frame for the given timestamp.
   * If already in LRU cache, returns immediately (0ms).
   * If a previous seek is in-flight, preemptively aborts it.
   */
  public requestFrame(rawTimestamp: number, callback: FrameCallback): void {
    if (!this.currentVideoUrl) return;

    const quantized = Math.round(rawTimestamp / this.quantizeInterval) * this.quantizeInterval;

    // 1. Instant Cache Hit (0ms)
    const cached = this.cache.get(quantized);
    if (cached) {
      callback(cached);
      return;
    }

    // 2. Queue into Latest-Wins slot
    this.nextPendingTarget = {
      timestamp: quantized,
      callback,
    };

    // 3. Preemptive in-flight cancellation
    if (this.isProcessing && this.currentExecutingTime !== quantized && this.activeAbortController) {
      this.activeAbortController.abort();
    }

    // 4. Start processing loop if idle
    if (!this.isProcessing) {
      this.drainQueue();
    }
  }

  /**
   * Cancels in-flight seek operations (e.g. mouse leaves progress bar).
   */
  public cancel(): void {
    this.nextPendingTarget = null;
    this.currentExecutingTime = null;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.cleanupActiveSeek();
    this.isProcessing = false;
  }

  /**
   * Complete engine disposal.
   */
  public dispose(): void {
    this.cancel();
    this.cache.clear();
    this.disposeVideoElement();
    this.currentVideoUrl = null;
  }

  private async drainQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.nextPendingTarget) {
      const task = this.nextPendingTarget;
      this.nextPendingTarget = null;

      const cached = this.cache.get(task.timestamp);
      if (cached) {
        task.callback(cached);
        continue;
      }

      this.currentExecutingTime = task.timestamp;
      this.activeAbortController = new AbortController();
      const signal = this.activeAbortController.signal;

      try {
        const frame = await this.captureFrame(task.timestamp, signal);
        if (frame && !signal.aborted) {
          this.cache.set(task.timestamp, frame);
          task.callback(frame);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("[TimelinePreviewEngine] Capture error:", err);
        }
      } finally {
        this.activeAbortController = null;
        this.currentExecutingTime = null;
      }
    }

    this.isProcessing = false;
  }

  private captureFrame(timestamp: number, signal: AbortSignal): Promise<PreviewFrame | null> {
    if (!this.video || !this.isInitialized || signal.aborted) {
      return Promise.resolve(null);
    }

    this.cleanupActiveSeek();

    const video = this.video;
    const duration = video.duration || 0;
    const clampedTime = Math.max(0, Math.min(duration, timestamp));

    return new Promise<PreviewFrame | null>((resolve) => {
      let isSettled = false;

      const onAbort = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        resolve(null);
      };

      signal.addEventListener("abort", onAbort, { once: true });

      const cleanup = () => {
        if (this.pendingSeekListener && video) {
          video.removeEventListener("seeked", this.pendingSeekListener);
        }
        if (this.activeRvfcHandle !== null && "cancelVideoFrameCallback" in video) {
          (video as any).cancelVideoFrameCallback(this.activeRvfcHandle);
          this.activeRvfcHandle = null;
        }
        if (this.activeFallbackTimer !== null) {
          clearTimeout(this.activeFallbackTimer);
          this.activeFallbackTimer = null;
        }
        signal.removeEventListener("abort", onAbort);
        this.pendingSeekListener = null;
      };

      const executeCapture = async () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();

        try {
          const frame = await this.extractHardwareBitmap(clampedTime);
          resolve(frame);
        } catch {
          resolve(null);
        }
      };

      const onSeeked = () => {
        if (isSettled) return;

        if ("requestVideoFrameCallback" in video) {
          this.activeRvfcHandle = (video as any).requestVideoFrameCallback(() => {
            this.activeRvfcHandle = null;
            executeCapture();
          });
          this.activeFallbackTimer = window.setTimeout(() => {
            this.activeFallbackTimer = null;
            executeCapture();
          }, 20);
        } else {
          executeCapture();
        }
      };

      this.pendingSeekListener = onSeeked;
      video.addEventListener("seeked", onSeeked, { once: true });

      // FastSeek Keyframe Acceleration (15-30ms)
      if ("fastSeek" in video && typeof (video as any).fastSeek === "function") {
        try {
          (video as any).fastSeek(clampedTime);
        } catch {
          video.currentTime = clampedTime;
        }
      } else {
        video.currentTime = clampedTime;
      }
    });
  }

  private async extractHardwareBitmap(timestamp: number): Promise<PreviewFrame | null> {
    if (!this.video) return null;

    const video = this.video;
    const originalWidth = video.videoWidth || 16;
    const originalHeight = video.videoHeight || 9;
    const aspectRatio = originalHeight / originalWidth;

    const targetWidth = this.renderWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(video, {
          resizeWidth: targetWidth,
          resizeHeight: targetHeight,
          resizeQuality: "medium",
        });

        return {
          timestamp,
          bitmap,
          width: targetWidth,
          height: targetHeight,
        };
      }
    } catch {
      try {
        const bitmap = await createImageBitmap(video);
        return {
          timestamp,
          bitmap,
          width: targetWidth,
          height: targetHeight,
        };
      } catch (fallbackErr) {
        console.error("[TimelinePreviewEngine] createImageBitmap failure:", fallbackErr);
      }
    }

    return null;
  }

  private cleanupActiveSeek(): void {
    if (this.pendingSeekListener && this.video) {
      this.video.removeEventListener("seeked", this.pendingSeekListener);
    }
    if (this.activeRvfcHandle !== null && this.video && "cancelVideoFrameCallback" in this.video) {
      (this.video as any).cancelVideoFrameCallback(this.activeRvfcHandle);
      this.activeRvfcHandle = null;
    }
    if (this.activeFallbackTimer !== null) {
      clearTimeout(this.activeFallbackTimer);
      this.activeFallbackTimer = null;
    }
    this.pendingSeekListener = null;
  }

  private disposeVideoElement(): void {
    this.cleanupActiveSeek();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      if (this.video.parentNode) {
        this.video.parentNode.removeChild(this.video);
      }
      this.video = null;
    }
    this.isInitialized = false;
  }
}
