function gatherInputsForTick(tick: number) {
  // For each player, pick the best known input for this tick.
  // If missing, you can:
  // - reuse last input
  // - or use a neutral input
  const result = new Map(); // playerId -> Input
  for (const [playerId, history] of inputHistory) {
    const input = history.get(tick) ?? history.get(tick - 1) ?? defaultInput();
    result.set(playerId, input);
  }
  return result;
}

function findRollbackTickIfNeeded(currentTick: number, newInputsForTick) {
  // If you just received inputs for some past tick K < currentTick,
  // and they differ from what you previously assumed, you must rollback to K.
  // For now, imagine we track "dirty" ticks externally and return the earliest.
  return null; // placeholder
}

function performRollback(rollbackTick: number, currentTick: number) {
  // 1. restore state at rollbackTick
  const baseState = stateHistory.get(rollbackTick);
  if (!baseState) return;
  currentState = baseState.clone();

  // 2. re-simulate from rollbackTick+1 up to currentTick-1
  for (let t = rollbackTick + 1; t < currentTick; t++) {
    const inputs = gatherInputsForTick(t);
    applyInputs(currentState, inputs, t);
    advancePhysics(currentState, TICK_MS / 1000);
    updateGameLogic(currentState, TICK_MS / 1000, t);
    storeSnapshot(t, currentState);
  }
}
