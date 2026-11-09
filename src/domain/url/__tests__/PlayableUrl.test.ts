import { safeDecodeUri } from "../safeDecode.ts";
import { PlayableUrl } from "../PlayableUrl.ts";

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message || ""}`
    );
  }
}

export function runPlayableUrlTests() {
  console.log("=== Testing safeDecodeUri ===");
  // 1. Normal percent-encoded Chinese
  const encoded1 = "https://anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/";
  assertEqual(safeDecodeUri(encoded1), "https://anime1.me/category/2026年春季/");
  console.log("✔ Decodes valid percent-encoded UTF-8 correctly");

  // 2. Incomplete / malformed percent sequence (should NOT throw)
  const malformed1 = "https://anime1.me/category/2026%e";
  const decodedMalformed = safeDecodeUri(malformed1);
  assertEqual(decodedMalformed, "https://anime1.me/category/2026%e");
  console.log("✔ Does not throw on truncated percent '%e'");

  // 3. Mixed valid and invalid percent
  const mixed = "https://anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/%e";
  assertEqual(safeDecodeUri(mixed), "https://anime1.me/category/2026年春季/%e");
  console.log("✔ Decodes valid cluster while preserving trailing malformed token");

  // 4. Preserves reserved query characters
  const queryUrl = "https://anime1.me/?s=%E6%90%96%E6%9B%B3%E9%9C%B2%E7%87%9F&page=2";
  assertEqual(safeDecodeUri(queryUrl), "https://anime1.me/?s=搖曳露營&page=2");
  console.log("✔ Decodes query parameter while preserving '&' and '='");

  console.log("\n=== Testing PlayableUrl Value Object ===");
  // 5. PlayableUrl with raw encoded URL
  const pUrl1 = PlayableUrl.parse("https://anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/");
  assertEqual(pUrl1.isValid, true);
  assertEqual(pUrl1.providerId, "anime1");
  assertEqual(pUrl1.hostname, "anime1.me");
  assertEqual(pUrl1.displayUrl, "https://anime1.me/category/2026年春季/");
  assertEqual(pUrl1.wireUrl, "https://anime1.me/category/2026%E5%B9%B4%E6%98%A5%E5%AD%A3/");
  console.log("✔ PlayableUrl produces clean displayUrl and valid wireUrl from percent-encoded input");

  // 6. PlayableUrl with raw Unicode Chinese URL
  const pUrl2 = PlayableUrl.parse("https://anime1.me/category/2026年春季/");
  assertEqual(pUrl2.isValid, true);
  assertEqual(pUrl2.displayUrl, "https://anime1.me/category/2026年春季/");
  assertEqual(pUrl2.wireUrl, "https://anime1.me/category/2026%E5%B9%B4%E6%98%A5%E5%AD%A3/");
  assertEqual(pUrl1.equals(pUrl2), true);
  console.log("✔ PlayableUrl handles already-decoded Unicode input identically and equals() passes");

  // 7. Auto-prepending https://
  const pUrl3 = PlayableUrl.parse("anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/");
  assertEqual(pUrl3.isValid, true);
  assertEqual(pUrl3.displayUrl, "https://anime1.me/category/2026年春季/");
  assertEqual(pUrl3.equals(pUrl1), true);
  console.log("✔ Auto-prepends https:// when protocol is omitted");

  // 8. Plain keyword search fallback
  const pUrl4 = PlayableUrl.parse("搖曳露營");
  assertEqual(pUrl4.isValid, false);
  assertEqual(pUrl4.displayUrl, "搖曳露營");
  assertEqual(pUrl4.providerId, "unknown");
  console.log("✔ Non-URL input safely marked invalid with clean displayUrl");

  // 9. Pagination stripping: /page/2 and /page/2/
  const pUrl5 = PlayableUrl.parse("https://anime1.me/category/2025%e5%b9%b4%e5%86%ac%e5%ad%a3/%e8%97%a5%e5%b8%ab%e5%b0%91%e5%a5%b3%e7%9a%84%e7%8d%a8%e8%aa%9e-%e7%ac%ac%e4%ba%8c%e5%ad%a3/page/2");
  assertEqual(pUrl5.displayUrl, "https://anime1.me/category/2025年冬季/藥師少女的獨語-第二季/");
  assertEqual(pUrl5.wireUrl, "https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB%E5%B0%91%E5%A5%B3%E7%9A%84%E7%8D%A8%E8%AA%9E-%E7%AC%AC%E4%BA%8C%E5%AD%A3/");

  const pUrl6 = PlayableUrl.parse("https://anime1.me/category/2025%e5%b9%b4%e5%86%ac%e5%ad%a3/%e8%97%a5%e5%b8%ab%e5%b0%91%e5%a5%b3%e7%9a%84%e7%8d%a8%e8%aa%9e-%e7%ac%ac%e4%ba%8c%e5%ad%a3/page/2/");
  assertEqual(pUrl5.equals(pUrl6), true);

  const pUrl7 = PlayableUrl.parse("https://anime1.me/category/2025%e5%b9%b4%e5%86%ac%e5%ad%a3/%e8%97%a5%e5%b8%ab%e5%b0%91%e5%a5%b3%e7%9a%84%e7%8d%a8%e8%aa%9e-%e7%ac%ac%e4%ba%8c%e5%ad%a3");
  assertEqual(pUrl5.equals(pUrl7), true);
  console.log("✔ PlayableUrl normalizes /page/2, /page/2/ and trailing slashes to identical canonical URL");

  // 10. Query pagination stripping: ?page=2
  const pUrl8 = PlayableUrl.parse("https://anime1.me/?s=%E8%97%A5%E5%B8%AB&page=2");
  assertEqual(pUrl8.displayUrl, "https://anime1.me/?s=藥師");
  console.log("✔ PlayableUrl strips pagination query parameters");
}
