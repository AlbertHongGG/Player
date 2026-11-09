import { calculateProgress, getResumeTime } from "../rules.ts";

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message || ""}`
    );
  }
}

export function runHistoryDomainTests() {
  console.log("=== Testing calculateProgress & getResumeTime ===");
  // 1. Initial short watch (< 15s) -> resumeTime is null
  const shortWatch = calculateProgress("ep1", "第 01 話", 8, 1440);
  assertEqual(shortWatch.percentage, 1);
  assertEqual(shortWatch.isCompleted, false);
  assertEqual(getResumeTime(shortWatch), null);
  console.log("✔ < 15s watch is ignored for resume");

  // 2. Active watch (> 15s, < 90%) -> resumeTime returns position
  const midWatch = calculateProgress("ep1", "第 01 話", 500, 1440);
  assertEqual(midWatch.percentage, 35);
  assertEqual(midWatch.isCompleted, false);
  assertEqual(getResumeTime(midWatch), 500);
  console.log("✔ Mid-watch returns exact resume position");

  // 3. Near end (> 90%) -> isCompleted is true, resumeTime is null
  const completedWatch = calculateProgress("ep1", "第 01 話", 1350, 1440);
  assertEqual(completedWatch.percentage, 94);
  assertEqual(completedWatch.isCompleted, true);
  assertEqual(getResumeTime(completedWatch), null);
  console.log("✔ > 90% watch is marked completed and resumeTime returns null");

  // 4. Remaining <= 30s -> isCompleted is true
  const nearEndWatch = calculateProgress("ep1", "第 01 話", 1420, 1440);
  assertEqual(nearEndWatch.isCompleted, true);
  assertEqual(getResumeTime(nearEndWatch), null);
  console.log("✔ <= 30s remaining is marked completed");
}
