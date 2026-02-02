const MAX_ROLLBACK_TICKS = 20; // tune for your game

// circular buffer of snapshots
const stateHistory = new Map(); // tickIndex -> GameState snapshot

// per-player input history
const inputHistory = new Map(); // playerId -> Map(tickIndex -> Input)
