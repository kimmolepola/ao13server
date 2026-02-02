function storeSnapshot(tick: number, state) {
  stateHistory.set(tick, state.clone());

  // trim old snapshots
  const minTick = tick - MAX_ROLLBACK_TICKS;
  for (const key of stateHistory.keys()) {
    if (key < minTick) stateHistory.delete(key);
  }
}
