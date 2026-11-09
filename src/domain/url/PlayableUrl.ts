import { safeDecodeUri } from "./safeDecode.ts";

export type ProviderId = "anime1" | "unknown";

/**
 * Value Object representing a playable anime source URL.
 * Strictly separates:
 * 1. `displayUrl`: Clean, human-readable Unicode IRI for UI presentation (no `%e...`).
 * 2. `wireUrl`: RFC-3986 percent-encoded canonical ASCII URI for IPC and network transport.
 */
export class PlayableUrl {
  /** The raw input string given by the user */
  readonly raw: string;
  /** Human-readable, clean Unicode representation for UI display */
  readonly displayUrl: string;
  /** Standard RFC-3986 percent-encoded URI for network requests and backend IPC */
  readonly wireUrl: string;
  /** The recognized provider identifier */
  readonly providerId: ProviderId;
  /** Extracted domain/hostname (lowercase), or null if not a valid URL */
  readonly hostname: string | null;
  /** Whether the string represents a syntactically valid HTTP/HTTPS URL */
  readonly isValid: boolean;

  private constructor(
    raw: string,
    displayUrl: string,
    wireUrl: string,
    providerId: ProviderId,
    hostname: string | null,
    isValid: boolean
  ) {
    this.raw = raw;
    this.displayUrl = displayUrl;
    this.wireUrl = wireUrl;
    this.providerId = providerId;
    this.hostname = hostname;
    this.isValid = isValid;
    Object.freeze(this);
  }

  /**
   * Factory method: parses any raw user input or pasted text into a PlayableUrl.
   * Resilient to whitespace, missing protocol, and percent-encoded characters.
   */
  static parse(input: string | null | undefined): PlayableUrl {
    if (!input) {
      return new PlayableUrl("", "", "", "unknown", null, false);
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return new PlayableUrl(input, "", "", "unknown", null, false);
    }

    // Auto-prepend https:// if domain-like without scheme
    let candidate = trimmed;
    if (!candidate.includes("://")) {
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(candidate)) {
        candidate = `https://${candidate}`;
      }
    }

    // First safely decode candidate to ensure clean Unicode base
    const cleanCandidate = safeDecodeUri(candidate);

    try {
      const parsed = new URL(cleanCandidate);

      // Canonicalize path: remove /page/\d+ pagination and ensure category trailing slash
      const decodedPath = safeDecodeUri(parsed.pathname);
      const trimmedPath = decodedPath.replace(/\/+$/, "");
      const pageMatch = trimmedPath.match(/^(.*)\/page\/\d+$/i);
      if (pageMatch) {
        parsed.pathname = `${pageMatch[1]}/`;
      } else if (trimmedPath.startsWith("/category/") && !decodedPath.endsWith("/")) {
        parsed.pathname = `${trimmedPath}/`;
      }

      // Canonicalize query: remove page / paged query params
      parsed.searchParams.delete("page");
      parsed.searchParams.delete("paged");

      // Browser URL automatically produces RFC-3986 wire format in .href
      const wireUrl = parsed.href;
      // Display URL is the cleanly decoded version of the normalized URL
      const displayUrl = safeDecodeUri(wireUrl);

      const hostname = parsed.hostname.toLowerCase();
      let providerId: ProviderId = "unknown";
      if (hostname === "anime1.me" || hostname.endsWith(".anime1.me")) {
        providerId = "anime1";
      }

      return new PlayableUrl(
        input,
        displayUrl,
        wireUrl,
        providerId,
        hostname,
        true
      );
    } catch {
      // Not a valid URL (e.g. plain search keyword or corrupted text)
      const displayUrl = safeDecodeUri(trimmed);
      return new PlayableUrl(
        input,
        displayUrl,
        trimmed,
        "unknown",
        null,
        false
      );
    }
  }

  /**
   * Creates an empty PlayableUrl.
   */
  static empty(): PlayableUrl {
    return new PlayableUrl("", "", "", "unknown", null, false);
  }

  /**
   * Returns human-readable display string for UI components.
   */
  toDisplayString(): string {
    return this.displayUrl;
  }

  /**
   * Returns RFC-3986 wire string for network/IPC transport.
   */
  toWireString(): string {
    return this.wireUrl;
  }

  /**
   * Checks whether this URL is supported by an active provider.
   */
  isSupported(): boolean {
    return this.isValid && this.providerId !== "unknown";
  }

  /**
   * Checks if this URL is blank.
   */
  isEmpty(): boolean {
    return !this.displayUrl;
  }

  /**
   * Value equality comparison based on canonical wire URL.
   */
  equals(other: PlayableUrl | string | null | undefined): boolean {
    if (!other) return false;
    const otherWire = other instanceof PlayableUrl ? other.wireUrl : PlayableUrl.parse(other).wireUrl;
    return this.wireUrl === otherWire;
  }
}
