export const MIN_PLAYBACK_SPEED = 0.1;
export const MAX_PLAYBACK_SPEED = 16.0;
export const PLAYBACK_SPEED_STEP = 0.1;
export const NORMAL_PLAYBACK_SPEED = 1.0;

/**
 * Rounds a playback speed rate to 1 decimal place to eliminate floating point issues (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */
export const roundSpeed = (rate: number): number => {
  return Math.round(rate * 10) / 10;
};

/**
 * Clamps speed within [MIN_PLAYBACK_SPEED, MAX_PLAYBACK_SPEED] with 1 decimal precision.
 */
export const clampSpeed = (rate: number): number => {
  const rounded = roundSpeed(rate);
  return Math.max(MIN_PLAYBACK_SPEED, Math.min(MAX_PLAYBACK_SPEED, rounded));
};

/**
 * Steps playback speed up or down by delta (default 0.1), clamped cleanly.
 */
export const stepSpeed = (currentRate: number, delta: number = PLAYBACK_SPEED_STEP): number => {
  return clampSpeed(currentRate + delta);
};

/**
 * Toggles between normal speed (1.0x) and previous playback speed.
 * If current speed is not 1.0x, stores current speed into previous and sets 1.0x.
 * If current speed is 1.0x, restores previous speed.
 */
export const toggleNormalSpeed = (
  currentRate: number,
  previousRate: number
): { nextRate: number; nextPreviousRate: number } => {
  if (currentRate !== NORMAL_PLAYBACK_SPEED) {
    return {
      nextRate: NORMAL_PLAYBACK_SPEED,
      nextPreviousRate: currentRate,
    };
  }
  return {
    nextRate: clampSpeed(previousRate),
    nextPreviousRate: previousRate,
  };
};

/**
 * Formats a playback speed for UI presentation (e.g. "1.5x", "2x", "0.5x").
 */
export const formatSpeedDisplay = (rate: number): string => {
  const clean = clampSpeed(rate);
  return `${clean}x`;
};
