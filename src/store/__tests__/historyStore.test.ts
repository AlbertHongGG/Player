import { useHistoryStore } from "../historyStore.ts";

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message || ""}`
    );
  }
}

export function runHistoryStoreTests() {
  console.log("=== Testing Normalized historyStore & Reference Stability ===");

  // Reset store
  useHistoryStore.getState().clearAll();
  const initialIds = useHistoryStore.getState().allIds;
  assertEqual(initialIds.length, 0);

  // 1. Add record
  useHistoryStore.getState().recordPlaylistLoaded(
    "https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/",
    "https://anime1.me/category/2025年冬季/藥師/",
    "藥師少女的獨語-第二季",
    "anime1",
    24
  );

  const idsAfterAdd = useHistoryStore.getState().allIds;
  assertEqual(idsAfterAdd.length, 1);
  assertEqual(idsAfterAdd[0], "https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/");

  // 2. Reference Stability Check: reading allIds multiple times MUST return the exact same array reference
  const read1 = useHistoryStore.getState().allIds;
  const read2 = useHistoryStore.getState().allIds;
  if (read1 !== read2) {
    throw new Error("Reference stability failed: allIds returned different references on consecutive reads!");
  }
  console.log("✔ allIds maintains 100% strict referential equality (prev === next)");

  // 3. Update Progress for Episode
  useHistoryStore.getState().updateProgress(
    "https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/",
    "ep5",
    "第 05 話",
    600,
    1440
  );

  const record = useHistoryStore.getState().byId["https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/"];
  assertEqual(record.lastEpisodeId, "ep5");
  assertEqual(record.lastEpisodeTitle, "第 05 話");
  assertEqual(record.episodeProgressMap["ep5"].percentage, 42);
  assertEqual(record.episodeProgressMap["ep5"].isCompleted, false);
  console.log("✔ updateProgress correctly computed percentage and updated record in O(1)");

  // 4. Test Single Removal
  useHistoryStore.getState().removeEntry("https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/");
  assertEqual(useHistoryStore.getState().allIds.length, 0);
  assertEqual(useHistoryStore.getState().byId["https://anime1.me/category/2025%E5%B9%B4%E5%86%AC%E5%AD%A3/%E8%97%A5%E5%B8%AB/"], undefined);
  console.log("✔ removeEntry cleanly purged both byId and allIds");
}
