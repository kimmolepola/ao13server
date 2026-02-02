function applyInputs(state, inputs, tick: number) {
  for (const [playerId, input] of inputs) {
    const player = state.players.get(playerId);
    if (!player) continue;

    // example: simple horizontal movement
    const speed = 200; // units per second
    if (input.left) player.vx = -speed;
    else if (input.right) player.vx = speed;
    else player.vx = 0;

    // jump, fire, etc.
  }
}
