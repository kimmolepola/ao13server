class GameState {
  players;
  time;

  constructor() {
    this.players = new Map(); // id -> { x, y, vx, vy, ... }
    this.time = 0; // optional, for debugging
  }

  clone() {
    const s = new GameState();
    s.time = this.time;
    for (const [id, p] of this.players) {
      s.players.set(id, { ...p });
    }
    return s;
  }
}

let currentState = new GameState();
