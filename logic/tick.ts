import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  gatherStateData,
  sendState,
  handleNewSequence,
} from "../netcode/state";
import { gameEventHandler } from "../service/events";
import { checkCollisions } from "./collision";
import * as utils from "../utils";

const object3d = utils.object3d;
const axis = utils.AXIS_Z;
let currentTick = 0;
let oldestInputTick: number | null = null;

// outer array index is tickNumber
// inner array index is idOverNetwork
const ticks: types.TickStateObject[][] = [];

// outer array index is tickNumber
// inner array index is idOverNetwork
const receivedInputs: types.InputsWithBytes[][] = [];

// outer array index is idOverNetwork
// inner array is tickNumbers of received input
// const receivedInputTicknumbers: number[][] = [];

// outer array index is tickNumber
// inner array order is arbitrary
const localObjects: types.TickLocalObject[][] = [];

const receivedEvents: types.ReceivedEvent[] = [];

const getInitialTickStateObject = (id: number) => {
  const obj: types.TickStateObject = {
    exists: false,
    id: "",
    idOverNetwork: id,
    isPlayer: false,
    username: "",
    health: 255,
    type: types.GameObjectType.Fighter as const,
    x: 0,
    y: 0,
    z: 0,
    rotationZ: 0,
    score: 0,
    speed: 0,
    rotationSpeed: 0,
    verticalSpeed: 0,
    shotDelay: 0,
    fuel: 0,
    bullets: 0,
    gameEventIds: [],
  };
  return obj;
};

const initializeTicks = () => {
  ticks.length = 0;
  for (let i = 0; i < parameters.stateMaxSequenceNumber + 1; i++) {
    ticks[i] = [];
    for (let ii = 0; ii < parameters.maxRemoteObjects; ii++) {
      ticks[i][ii] = getInitialTickStateObject(ii);
    }
  }
};

const initializeLocalObjects = () => {
  localObjects.length = 0;
  for (let i = 0; i < parameters.stateMaxSequenceNumber + 1; i++) {
    localObjects[i] = [];
  }
};

const initializeReceivedInputs = () => {
  receivedInputs.length = 0;
  for (let i = 0; i < parameters.stateMaxSequenceNumber + 1; i++) {
    receivedInputs[i] = [];
    for (let ii = 0; ii < parameters.maxRemoteObjects; ii++) {
      receivedInputs[i][ii] = {
        inputs: {
          up: undefined,
          down: undefined,
          left: undefined,
          right: undefined,
          space: undefined,
          keyD: undefined,
          keyF: undefined,
          keyE: undefined,
        },
        byte1: undefined,
        byte2: undefined,
      };
    }
  }
};

// const initializeReceivedInputTicknumbers = () => {
//   receivedInputTicknumbers.length = 0;
//   for (let i = 0; i < parameters.maxRemoteObjects; i++) {
//     receivedInputTicknumbers[i] = [];
//   }
// };

// const resetReceivedInputTicknumbers = () => {
//   receivedInputTicknumbers.length = 0;
//   for (let i = 0; i < parameters.maxRemoteObjects; i++) {
//     receivedInputTicknumbers[i].length = 0;
//   }
// };

initializeTicks();
initializeReceivedInputs();
initializeLocalObjects();
// initializeReceivedInputTicknumbers();

const isWithinMaxRollback = (seq: number, x: number) => {
  // Compute distance backwards from seq to x in 8‑bit space
  const diff = (seq - x) & 0xff;
  return diff > 0 && diff <= parameters.maxRollback;
};

const seqLess = (a: number, b: number) => {
  // Returns true if a should come before b
  return ((b - a) & 0xff) <= 127;
};

const getPrevSeq = (seq: number) => {
  return (seq - 1) & 0xff;
};

export const receiveEvent = (event: types.ReceivedEvent) => {
  receivedEvents.push(event);
};

export const receiveInputData = (remoteId: string, data: types.InputsData) => {
  const t = data.tickNumber;
  if (!isWithinMaxRollback(t, currentTick)) return;

  const sharedObject = globals.state.sharedObjectInfoById[remoteId];
  if (sharedObject) {
    const d = data.inputs;
    const r = receivedInputs[t][sharedObject.idOverNetwork];
    r.inputs.up = d.up;
    r.inputs.down = d.down;
    r.inputs.left = d.left;
    r.inputs.right = d.right;
    r.inputs.space = d.space;
    r.inputs.keyD = d.keyD;
    r.inputs.keyF = d.keyF;
    r.inputs.keyE = d.keyE;
    r.byte1 = data.byte1;
    r.byte2 = data.byte2;

    if (oldestInputTick === null || seqLess(t, oldestInputTick)) {
      oldestInputTick = t;
    }
    // receivedInputTicknumbers[sharedObject.idOverNetwork]?.push(t);
  }
};

const handleMovement = (
  currentTickObject: types.TickStateObject,
  previousTickObject: types.TickStateObject,
  inputs: types.InputsWithBytes,
  prevInputs: types.InputsWithBytes,
  prevPrevInputs: types.InputsWithBytes
) => {
  const p = parameters;
  const prev = previousTickObject;
  const o = currentTickObject;

  //
  // 1. INPUT → VELOCITY
  //
  const cInputs = inputs.inputs;
  const pInputs = prevInputs.inputs;
  const ppInputs = prevPrevInputs.inputs;
  const up = cInputs.up ?? pInputs.up ?? ppInputs.up ?? 0;
  const down = cInputs.down ?? pInputs.down ?? ppInputs.down ?? 0;
  const left = cInputs.left ?? pInputs.left ?? ppInputs.left ?? 0;
  const right = cInputs.right ?? pInputs.right ?? ppInputs.right ?? 0;
  const keyF = cInputs.keyF ?? pInputs.keyF ?? ppInputs.keyF ?? 0;
  const keyD = cInputs.keyD ?? pInputs.keyD ?? ppInputs.keyD ?? 0;

  o.speed = prev.speed;
  const dt = p.tickInterval / 1000;
  const thrustFactor =
    p.thrustMinFactor +
    (1 - p.thrustMinFactor) * Math.min(prev.speed / p.thrustRampSpeed, 1);
  o.speed +=
    (up * p.thrustForce * thrustFactor -
      p.dragCoefficient * prev.speed * prev.speed -
      down * p.brakeForce) *
    dt;

  o.rotationSpeed = prev.rotationSpeed;
  const leftBrake = left > 0 && prev.rotationSpeed < 0 ? 4 : 1;
  const rightBrake = right > 0 && prev.rotationSpeed > 0 ? 4 : 1;
  o.rotationSpeed += left * p.forceLeftOrRightToRotationFactor * leftBrake;
  o.rotationSpeed -= right * p.forceLeftOrRightToRotationFactor * rightBrake;

  o.verticalSpeed = prev.verticalSpeed;
  o.verticalSpeed += keyF * p.forceAscOrDescToVerticalSpeedFactor;
  o.verticalSpeed -= keyD * p.forceAscOrDescToVerticalSpeedFactor;

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
  if (!left && !right) {
    const decay = p.rotationDecay ** (p.tickInterval / (1000 / 60));
    o.rotationSpeed *= decay;
    if (Math.abs(o.rotationSpeed) < 0.00001) o.rotationSpeed = 0;
  }

  if (!keyD && !keyF) {
    const decay = p.verticalDecay ** (p.tickInterval / (1000 / 60));
    o.verticalSpeed *= decay;
    if (Math.abs(o.verticalSpeed) < 0.00001) o.verticalSpeed = 0;
  }

  object3d.position.set(prev.x, prev.y, 0);
  object3d.setRotationFromAxisAngle(axis, prev.rotationZ);
  object3d.rotateZ(o.rotationSpeed * p.rotationFactor * p.tickInterval);
  object3d.translateY(o.speed * p.speedFactor * p.tickInterval);
  o.x = object3d.position.x;
  o.y = object3d.position.y;
  o.rotationZ = object3d.rotation.z;

  o.z = prev.z;
  o.z += o.verticalSpeed * p.verticalSpeedFactor * p.tickInterval;
};

const handleShot = (
  currentTickNumber: number,
  currentTickObject: types.TickStateObject,
  previousTickObject: types.TickStateObject,
  inputs: types.InputsWithBytes,
  gameEventHandler: types.GameEventHandler
) => {
  const c = currentTickObject;
  c.shotDelay = previousTickObject.shotDelay;

  c.gameEventIds = [];
  if (c.shotDelay > 0) {
    c.shotDelay -= parameters.tickInterval;
  }
  if (c.shotDelay <= 0) {
    if (inputs.inputs.space) {
      // shoot
      c.shotDelay += parameters.shotDelay;
      c.gameEventIds.push(0);
      gameEventHandler({
        type: types.EventType.Shot,
        data: {
          gameObject: c,
          tickLocalObjects: localObjects[currentTickNumber],
          currentTickNumber,
        },
      });
    }
  }
};

const resetInputs = (tickNum: number, idOverNetwork: number) => {
  const r = receivedInputs[tickNum][idOverNetwork];
  r.inputs.up = undefined;
  r.inputs.down = undefined;
  r.inputs.left = undefined;
  r.inputs.right = undefined;
  r.inputs.space = undefined;
  r.inputs.keyD = undefined;
  r.inputs.keyF = undefined;
  r.inputs.keyE = undefined;
  r.byte1 = undefined;
  r.byte2 = undefined;
};

/**
 * Subtracts a value from an 8‑bit sequence number (0–255),
 * wrapping around on underflow.
 */
export function seq8Sub(seq: number, value: number): number {
  return (seq - value) & 0xff;
}

const handleSharedObjects = (tickNumber: number, isRollback: boolean) => {
  const pSeq = getPrevSeq(tickNumber);
  const ppSeq = getPrevSeq(pSeq);
  const pppSeq = getPrevSeq(ppSeq);

  const currentState = ticks[tickNumber];
  const previousState = ticks[pSeq];
  const currentInputs = receivedInputs[tickNumber];
  const prevInputs = receivedInputs[pSeq];
  const prevPrevInputs = receivedInputs[ppSeq];

  for (let i = 0; i < parameters.maxSharedObjects; i++) {
    const c = currentState[i];
    const p = previousState[i];
    const playerCurInputs = currentInputs[i];
    if (!p.exists) {
      c.exists = false;
    } else {
      c.exists = true;
      c.id = p.id;
      c.isPlayer = p.isPlayer;
      c.username = p.username;
      c.health = p.health;
      c.type = p.type;
      c.score = p.score;
      c.bullets = p.bullets;
      handleMovement(c, p, playerCurInputs, prevInputs[i], prevPrevInputs[i]);
      handleShot(tickNumber, c, p, playerCurInputs, gameEventHandler);
      checkCollisions(
        i,
        c,
        currentState,
        localObjects[tickNumber],
        gameEventHandler
      );
      c.fuel = p.fuel - c.speed * 0.0001;
      if (!isRollback) {
        const idN = c.idOverNetwork;
        const input = receivedInputs[tickNumber][idN];

        gatherStateData(i, c, input, tickNumber, pSeq, ppSeq, pppSeq, ticks);
        const tickNumPastRollback = seq8Sub(
          tickNumber,
          parameters.maxRollback + 1
        );
        resetInputs(tickNumPastRollback, i);
      }
      if (c.health <= 0) {
        gameEventHandler({
          type: types.EventType.HealthZero,
          data: {
            id: c.id,
            currentState,
          },
        });
      }
    }
  }
};

const handleLocalObjects = (tickNumber: number) => {
  const currentLocalObjects = localObjects[tickNumber];
  currentLocalObjects.length = 0;
  const previousLocalObjects = localObjects[getPrevSeq(tickNumber)];
  const indexesToRemove = [];
  for (let i = 0; i < previousLocalObjects.length; i++) {
    const previousObject = previousLocalObjects[i];
    if (previousObject.timeToLive <= 0) {
      indexesToRemove.push(i);
    } else {
      const o = { ...previousObject };
      o.prevX = previousObject.x;
      o.prevY = previousObject.y;
      object3d.position.set(o.x, o.y, 0);
      object3d.setRotationFromAxisAngle(axis, o.rotationZ);
      object3d.translateY(
        o.speed * parameters.speedFactor * parameters.tickInterval
      );
      o.x = object3d.position.x;
      o.y = object3d.position.y;
      o.segDx = o.x - o.prevX;
      o.segDy = o.y - o.prevY;
      o.segLenSq = o.segDx * o.segDx + o.segDy * o.segDy;
      o.speed *= parameters.bulletSpeedReductionFactor;
      o.timeToLive -= parameters.tickInterval;
      currentLocalObjects.push(o);
    }
  }
};

const simulate = (tickNumber: number, isRollback: boolean) => {
  handleLocalObjects(tickNumber);
  handleSharedObjects(tickNumber, isRollback);
};

const performRollback = (tickNumber: number, oldestInputTick: number) => {
  let s = oldestInputTick;
  while (true) {
    if (s === tickNumber) break;
    simulate(s, true);
    s = (s + 1) & 0xff; // wrap to 0–255
  }
};

const handleNewId = (id: string) => {
  const currentState = ticks[currentTick];
  const data = { id, currentState };
  gameEventHandler({ type: types.EventType.NewId, data });
};

const handleRemoveId = (id: string) => {
  const currentState = ticks[currentTick];
  const data = { id, currentState };
  gameEventHandler({ type: types.EventType.RemoveId, data });
};

const handleReceivedEvents = () => {
  for (let i = 0; i < receivedEvents.length; i++) {
    const e = receivedEvents[i];
    switch (e.type) {
      case types.ReceivedEventType.NewId:
        handleNewId(e.data);
        break;
      case types.ReceivedEventType.RemoveId:
        handleRemoveId(e.data);
        break;
      default:
        break;
    }
  }
  receivedEvents.length = 0;
};

const checkInputTimeouts = () => {
  const now = Date.now();
  for (let i = 0; i < globals.clients.array.length; i++) {
    const client = globals.clients.array[i];
    if (
      globals.state.sharedObjectInfoById[client.id] &&
      now - client.lastInputTime > parameters.inputTimeoutMs
    ) {
      console.warn(`Client ${client.id} input timeout, disconnecting`);
      client.peerConnection.close();
    }
  }
};

export const runTick = (tickNumber: number) => {
  currentTick = tickNumber;
  globals.tickRef.currentState = ticks[tickNumber];
  handleNewSequence(tickNumber);
  checkInputTimeouts();
  if (oldestInputTick !== null && seqLess(oldestInputTick, tickNumber)) {
    performRollback(tickNumber, oldestInputTick);
  }
  simulate(tickNumber, false);
  oldestInputTick = null;
  handleReceivedEvents();
  sendState();
  // resetReceivedInputTicknumbers();
};
