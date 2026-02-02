function runGameTick(dtMs: number, tick: number) {
  const dtSec = dtMs / 1000;

  // 1. collect inputs for this tick (from network)
  const inputsForTick = gatherInputsForTick(tick);

  // 2. maybe rollback if late inputs arrived
  const rollbackTo = findRollbackTickIfNeeded(tick, inputsForTick);
  if (rollbackTo !== null) {
    performRollback(rollbackTo, tick);
  }

  // 3. apply inputs for this tick
  applyInputs(currentState, inputsForTick, tick);

  // 4. advance physics using accumulator
  advancePhysics(currentState, dtSec);

  // 5. other game logic (AI, timers, etc.)
  updateGameLogic(currentState, dtSec, tick);

  // 6. store snapshot for future rollback
  storeSnapshot(tick, currentState);

  // 7. send state / deltas to clients
  broadcastState(tick, currentState);
}
