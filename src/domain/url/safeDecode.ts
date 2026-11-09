/**
 * Safe URI decoding utilities that will never throw URIError on malformed
 * or truncated percent-encoded sequences (e.g. `%e`, partial pastes, etc.).
 */

const RESERVED_URI_CHARS = new Set([
  ":", "/", "?", "#", "[", "]", "@",
  "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
]);

/**
 * Safely decodes percent-encoded UTF-8 sequences in a URI/URL string.
 * - Decodes multilingual Unicode characters (e.g., Chinese, Japanese, Korean, emoji).
 * - Leaves URI structural reserved characters intact if they were explicitly percent-encoded (e.g. %2F, %3F).
 * - Resilient against truncated / malformed tokens (like `%e` or `%E0%A4`). Never throws URIError.
 */
export function safeDecodeUri(uri: string): string {
  if (!uri) return "";

  // 1. Happy path: standard decodeURI
  try {
    return decodeURI(uri);
  } catch {
    // 2. Resilient fallback when uri contains malformed or incomplete percent sequences
    return resilientDecodeUri(uri);
  }
}

function resilientDecodeUri(uri: string): string {
  // Matches consecutive valid %XX hex byte sequences
  const percentRunRegex = /(?:%[0-9a-fA-F]{2})+/g;

  return uri.replace(percentRunRegex, (match) => {
    try {
      // Collect raw bytes
      const bytes: number[] = [];
      for (let i = 0; i < match.length; i += 3) {
        bytes.push(parseInt(match.substring(i + 1, i + 3), 16));
      }

      // Decode bytes using non-fatal UTF-8 decoder
      const uint8 = new Uint8Array(bytes);
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(uint8);

      // Re-encode any URI reserved structural characters that shouldn't be decoded across a full URL
      let result = "";
      for (const char of decoded) {
        if (RESERVED_URI_CHARS.has(char)) {
          // Keep percent encoded form if it was reserved
          const hex = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
          result += `%${hex}`;
        } else {
          result += char;
        }
      }
      return result;
    } catch {
      // If anything unexpected happens, keep original match
      return match;
    }
  });
}
