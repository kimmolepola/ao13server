const PHYSICS_HZ = 120; // physics steps per second
const PHYSICS_DT = 1 / PHYSICS_HZ; // seconds
let physicsAccum = 0; // seconds
let lastPhysicsNow = performance.now();

function physicsStep(state: { players: any }, dt: number) {
  for (const player of state.players.values()) {
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    // collisions, forces, etc.
  }
}

function advancePhysics(state: { players: any }, tickDtSec: number) {
  //   const now = performance.now();
  //   const frameDtSec = (now - lastPhysicsNow) / 1000;
  //   lastPhysicsNow = now;

  //   physicsAccum += frameDtSec;

  // If you want physics to be strictly tied to tick time instead, you can skip performance.now() here and just do:
  physicsAccum += tickDtSec;
  while (physicsAccum >= PHYSICS_DT) {
    physicsStep(state, PHYSICS_DT);
    physicsAccum -= PHYSICS_DT;
  }

  // fixed‑timestep physics
  while (physicsAccum >= PHYSICS_DT) {
    physicsStep(state, PHYSICS_DT);
    physicsAccum -= PHYSICS_DT;
  }

  // optional: clamp to avoid spiral of death
  if (physicsAccum > PHYSICS_DT * 4) {
    physicsAccum = PHYSICS_DT * 4;
  }
}
