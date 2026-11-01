// Every revealed correct answer earns coins. Saving still waits until the game finishes.
export function pendingCoins(earned) {
  return Math.max(0, earned || 0);
}
