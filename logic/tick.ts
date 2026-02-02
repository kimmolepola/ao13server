import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  gatherStateData,
  sendState,
  handleNewSequence,
} from "../netcode/state";
import THREE from "three";

let currentTick = 0;
let oldestInputTick = 0;

// outer array index is tickNumber
// inner array index is idOverNetwork
const ticks: types.TickStateObject[][] = [];

// outer array index is tickNumber
// inner array index is idOverNetwork
const receivedInputs: types.Inputs[][] = [];

const fn = () => getSimulationObject();
const simulationObject = fn();

const initializeTicks = () => {
  ticks.length = 0;
  for (let i = 0; i < parameters.stateMaxSequenceNumber + 1; i++) {
    ticks[i] = [];
    for (let ii = 0; i < parameters.maxRemoteObjects; i++) {
      ticks[i][ii] = getInitialTickStateObject(ii);
    }
  }
};

initializeTicks();

const isWithinMaxRollback = (seq: number, x: number) => {
  // Compute distance backwards from seq to x in 8‑bit space
  const diff = (seq - x) & 0xff;
  return diff > 0 && diff <= parameters.maxRollback;
};

const seqLess = (a: number, b: number) => {
  // Returns true if a should come before b
  return ((b - a) & 0xff) <= 127;
};

const prevSeq = (seq: number) => {
  return (seq - 1) & 0xff;
};

export const receiveInputData = (remoteId: string, data: types.InputsData) => {
  const t = data.tickNumber;
  if (!isWithinMaxRollback(currentTick, t)) return;

  const sharedObject = globals.sharedObjectsById[remoteId];
  const d = data.inputs;
  const r = receivedInputs[t][sharedObject.idOverNetwork];
  r.up = d.up;
  r.down = d.down;
  r.left = d.left;
  r.right = d.right;
  r.space = d.space;
  r.keyD = d.keyD;
  r.keyF = d.keyF;
  r.keyE = d.keyE;

  if (seqLess(t, oldestInputTick)) {
    oldestInputTick = t;
  }
};

const handleMovement = (o: types.SharedGameObject) => {
  const p = parameters;

  //
  // 1. INPUT → VELOCITY
  //
  o.speed += o.controlsUp * p.forceUpToSpeedFactor;
  o.speed -= o.controlsDown * p.forceDownToSpeedFactor;

  o.rotationSpeed += o.controlsLeft * p.forceLeftOrRightToRotationFactor;
  o.rotationSpeed -= o.controlsRight * p.forceLeftOrRightToRotationFactor;

  o.verticalSpeed -= o.controlsD * p.forceAscOrDescToVerticalSpeedFactor;
  o.verticalSpeed += o.controlsF * p.forceAscOrDescToVerticalSpeedFactor;

  //
  // 2. CLAMP VELOCITIES
  //
  o.speed = Math.min(Math.max(o.speed, p.minSpeed), p.maxSpeed);
  o.rotationSpeed = Math.min(
    Math.max(o.rotationSpeed, -p.maxRotationSpeedAbsolute),
    p.maxRotationSpeedAbsolute
  );
  o.verticalSpeed = Math.min(
    Math.max(o.verticalSpeed, -p.maxVerticalSpeedAbsolute),
    p.maxVerticalSpeedAbsolute
  );

  //
  // 3. APPLY DAMPING (time‑based exponential)
  //
  if (!o.controlsLeft && !o.controlsRight) {
    const decay = Math.exp(-p.rotationDecay * parameters.tickInterval);
    o.rotationSpeed *= decay;
    if (Math.abs(o.rotationSpeed) < 0.00001) o.rotationSpeed = 0;
  }

  if (!o.controlsD && !o.controlsF) {
    const decay = Math.exp(-p.verticalDecay * parameters.tickInterval);
    o.verticalSpeed *= decay;
    if (Math.abs(o.verticalSpeed) < 0.00001) o.verticalSpeed = 0;
  }

  o.mesh.rotateZ(o.rotationSpeed * p.rotationFactor * parameters.tickInterval);
  o.mesh.translateY(o.speed * p.speedFactor * parameters.tickInterval);
  o.positionZ +=
    o.verticalSpeed * p.verticalSpeedFactor * parameters.tickInterval;
};

const simulate = (tickNumber: number) => {
  const state = ticks[prevSeq(tickNumber)];
};

const performRollback = (tickNumber: number, oldestInputTick: number) => {
  let s = oldestInputTick;
  while (true) {
    simulate(s);
    if (s === tickNumber) break;
    s = (s + 1) & 0xff; // wrap to 0–255
  }
};

export const runTick = (tickNumber: number) => {
  currentTick = tickNumber;
  handleNewSequence(tickNumber);
  if (seqLess(oldestInputTick, tickNumber)) {
  }

  for (let i = globals.sharedObjects.length - 1; i > -1; i--) {
    const o = globals.sharedObjects[i];
    handleMovement(o);
    const oo = ticks[tickNumber][o.idOverNetwork];
    oo.id = o.id;
    oo.idOverNetwork = o.idOverNetwork;
    oo.health = o.health;
    oo.type = o.type;
    oo.x = o.mesh.position.x;
    oo.y = o.mesh.position.y;
    oo.rotationZ = o.mesh.rotation.z;
    oo.score = o.score;
    oo.speed = o.speed;
    oo.controlsUp = o.controlsUp;
    oo.controlsDown = o.controlsDown;
    oo.controlsLeft = o.controlsLeft;
    oo.controlsRight = o.controlsRight;
    oo.controlsSpace = o.controlsSpace;
    oo.controlsF = o.controlsF;
    oo.controlsD = o.controlsD;
    oo.controlsOverChannelsUp = o.controlsOverChannelsUp;
    oo.controlsOverChannelsDown = o.controlsOverChannelsDown;
    oo.controlsOverChannelsLeft = o.controlsOverChannelsLeft;
    oo.controlsOverChannelsRight = o.controlsOverChannelsRight;
    oo.controlsOverChannelsSpace = o.controlsOverChannelsSpace;
    oo.controlsOverChannelsD = o.controlsOverChannelsD;
    oo.controlsOverChannelsF = o.controlsOverChannelsF;
    oo.rotationSpeed = o.rotationSpeed;
    oo.verticalSpeed = o.verticalSpeed;
    oo.shotDelay = o.shotDelay;
    oo.positionZ = o.positionZ;
    oo.fuel = o.fuel;
    oo.bullets = o.bullets;
    gatherStateData(i, oo, tickNumber);
  }
  sendState();
};

const getSimulationObject = () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry);
  mesh.geometry.computeBoundingBox();
  const obj = getInitialTickStateObject(-1);
  return { ...obj, mesh };
};

const getInitialTickStateObject = (id: number) => {
  return {
    exists: false,
    id: "",
    idOverNetwork: id,
    health: 255,
    type: types.GameObjectType.Fighter as const,
    x: 0,
    y: 0,
    rotationZ: 0,
    score: 0,
    speed: 0,
    controlsUp: 0,
    controlsDown: 0,
    controlsLeft: 0,
    controlsRight: 0,
    controlsSpace: 0,
    controlsF: 0,
    controlsD: 0,
    controlsE: 0,
    controlsOverChannelsUp: 0,
    controlsOverChannelsDown: 0,
    controlsOverChannelsLeft: 0,
    controlsOverChannelsRight: 0,
    controlsOverChannelsSpace: 0,
    controlsOverChannelsD: 0,
    controlsOverChannelsF: 0,
    controlsOverChannelsE: 0,
    rotationSpeed: 0,
    verticalSpeed: 0,
    shotDelay: 0,
    positionZ: 0,
    fuel: 0,
    bullets: 0,
  };
};
