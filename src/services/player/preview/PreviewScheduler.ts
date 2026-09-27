import { IThumbnailProvider, ThumbnailFrame, ThumbnailOptions } from "./types";
import { ThumbnailLRUCache } from "./ThumbnailLRUCache";

export type FrameReadyCallback = (frame: ThumbnailFrame) => void;

/**
 * Preemptive Concurrency Scheduler for timeline preview extraction.
 *
 * Performance Architecture:
 * 1. Preemptive In-Flight Cancellation: When a new mouse position arrives, any pending or in-flight
 *    video seek is immediately aborted via AbortController, completely eliminating Head-of-Line blocking.
 * 2. Timestamp Quantization: Buckets timestamps to maximize LRU cache hit rate during continuous hover.
 * 3. Latest-Wins Atomic Slot: Always executes the most recent user cursor position.
 */
export class PreviewScheduler {
  private readonly provider: IThumbnailProvider;
  private readonly cache: ThumbnailLRUCache;
  private quantizeInterval: number;

  private isProcessing = false;
  private currentExecutingTimestamp: number | null = null;
  private nextPendingTarget: { timestamp: number; callback: FrameReadyCallback } | null = null;
  private activeAbortController: AbortController | null = null;

  constructor(provider: IThumbnailProvider, cache: ThumbnailLRUCache, options?: ThumbnailOptions) {
    this.provider = provider;
    this.cache = cache;
    this.quantizeInterval = options?.quantizeInterval || 0.5;
  }

  public setQuantizeInterval(interval: number): void {
    this.quantizeInterval = Math.max(0.1, interval);
  }

  /**
   * Quantizes the timestamp to the configured interval (e.g. 1.34s -> 1.5s with interval=0.5).
   */
  public quantize(timestamp: number): number {
    return Math.round(timestamp / this.quantizeInterval) * this.quantizeInterval;
  }

  /**
   * Schedules a frame extraction for the specified timestamp.
   * If already cached, immediately invokes the callback.
   * If busy extracting a different frame, preemptively aborts it and queues the newest target.
   */
  public requestFrame(rawTimestamp: number, onFrameReady: FrameReadyCallback): void {
    const quantized = this.quantize(rawTimestamp);

    // 1. Instant Cache Hit (0ms)
    const cached = this.cache.get(quantized);
    if (cached) {
      onFrameReady(cached);
      return;
    }

    // 2. Queue into Latest-Wins single slot
    this.nextPendingTarget = {
      timestamp: quantized,
      callback: onFrameReady,
    };

    // 3. Preemptive cancellation: If an in-flight seek is working on a DIFFERENT frame, abort it!
    if (this.isProcessing && this.currentExecutingTimestamp !== quantized && this.activeAbortController) {
      this.activeAbortController.abort();
    }

    // 4. Trigger processing loop if idle
    if (!this.isProcessing) {
      this.drainQueue();
    }
  }

  /**
   * Cancels any pending or in-flight frame extraction.
   */
  public cancel(): void {
    this.nextPendingTarget = null;
    this.currentExecutingTimestamp = null;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.isProcessing = false;
  }

  private async drainQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.nextPendingTarget) {
      const currentTask = this.nextPendingTarget;
      this.nextPendingTarget = null; // Cleared so subsequent mouse moves can register

      // Check cache again in case another operation populated it
      const cached = this.cache.get(currentTask.timestamp);
      if (cached) {
        currentTask.callback(cached);
        continue;
      }

      this.currentExecutingTimestamp = currentTask.timestamp;
      this.activeAbortController = new AbortController();
      const signal = this.activeAbortController.signal;

      try {
        const frame = await this.provider.captureFrame(currentTask.timestamp, signal);

        // Only commit if this task wasn't aborted midway
        if (frame && !signal.aborted) {
          this.cache.set(currentTask.timestamp, frame);
          currentTask.callback(frame);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("[PreviewScheduler] Error extracting frame:", err);
        }
      } finally {
        this.activeAbortController = null;
        this.currentExecutingTimestamp = null;
      }
    }

    this.isProcessing = false;
  }
}
