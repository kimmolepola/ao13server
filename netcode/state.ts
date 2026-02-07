import * as globals from "../globals";
import * as types from "../types";
import * as parameters from "../parameters";
import { encodeAxisValue, encodeRotationZ } from "../utils";
import { sendUnreliableBinary } from "../service/channels";

const sequenceNumberBytes = 1;
let buffer = new ArrayBuffer(sequenceNumberBytes);
let view = new DataView(buffer);
let previousObjectCount = 0;
let offset = 0;
// let sequenceNumber = 0;

const recentStates: types.RecentStates = {
  0: { acknowledged: false, state: {} },
  32: { acknowledged: false, state: {} },
  64: { acknowledged: false, state: {} },
  96: { acknowledged: false, state: {} },
  128: { acknowledged: false, state: {} },
  160: { acknowledged: false, state: {} },
  192: { acknowledged: false, state: {} },
  224: { acknowledged: false, state: {} },
};

const shouldAddToRecentStates = (sequenceNumber: number) =>
  sequenceNumber % 32 === 0;

const resetRecentStatesCurrentSequence = (sequenceNumber: number) => {
  if (shouldAddToRecentStates(sequenceNumber)) {
    delete recentStates[sequenceNumber];
    recentStates[sequenceNumber] = { acknowledged: false, state: {} };
  }
};

const getStateToCompareTo = (sequenceNumber: number) => {
  const maxSequenceNumber = parameters.stateMaxSequenceNumber;
  const sequenceNumbers = maxSequenceNumber + 1;
  const slotLength = parameters.recentStateSlotLength;
  const remainder = sequenceNumber % slotLength;
  const slotStart = sequenceNumber - remainder;
  const difference = slotStart - slotLength;
  const previousSlotStart = (difference + sequenceNumbers) & maxSequenceNumber;
  const recentState = recentStates[previousSlotStart];
  return recentState;
};

const resetStateOffset = () => {
  offset = sequenceNumberBytes;
};

const syncBufferSize = () => {
  const objectCount = globals.sharedObjects.length;
  if (objectCount !== previousObjectCount) {
    previousObjectCount = objectCount;
    const maxBytes =
      sequenceNumberBytes +
      objectCount * types.unreliableStateSingleObjectMaxBytes;
    buffer = new ArrayBuffer(maxBytes);
    view = new DataView(buffer);
  }
};

const getUint8Bytes = (num: number) => {
  const uint32 = num >>> 0; // Coerce to unsigned 32-bit

  return [
    (uint32 >>> 24) & 0xff,
    (uint32 >>> 16) & 0xff,
    (uint32 >>> 8) & 0xff,
    uint32 & 0xff,
  ];
};

const getDifferenceSignificance = (
  arrayOf4bytesBigEndianA: number[], // array of 4 bytes
  arrayOf4BytesBigEndianB: number[] // array of 4 bytes
) => {
  for (let i = 0; i < arrayOf4bytesBigEndianA.length; i++) {
    if (arrayOf4bytesBigEndianA[i] !== arrayOf4BytesBigEndianB[i]) {
      return Math.abs(i - 4);
    }
  }
  return 0;
};

const acknowledgements: {
  expectedSequenceNumber: number;
  acknowledged: { [clientId: string]: boolean };
} = {
  expectedSequenceNumber: 0,
  acknowledged: {},
};

const resetExpectedAcks = (sequenceNumber: number) => {
  acknowledgements.expectedSequenceNumber = sequenceNumber;
  acknowledgements.acknowledged = {};
};

const checkAcks = () => {
  const seq = acknowledgements.expectedSequenceNumber;
  const recentState = recentStates[seq];
  if (!recentState.acknowledged) {
    for (let i = 0; i < globals.clients.array.length; i++) {
      const clientId = globals.clients.array[i].id;
      if (!acknowledgements.acknowledged[clientId]) {
        return;
      }
    }
    recentState.acknowledged = true;
  }
};

export const resetRecentStates = () => {
  for (const key of Object.keys(recentStates)) {
    const num = Number.parseInt(key);
    recentStates[num] = { acknowledged: false, state: {} };
  }
};

export const receiveAck = (seqNum: number, clientId: string) => {
  if (acknowledgements.expectedSequenceNumber === seqNum) {
    acknowledgements.acknowledged[clientId] = true;
  }
};

export const sendState = () => {
  sendUnreliableBinary(Buffer.from(buffer, 0, offset));
};

export const handleNewSequence = (sequenceNumber: number) => {
  syncBufferSize();
  resetStateOffset();
  checkAcks();
  if (shouldAddToRecentStates(sequenceNumber)) {
    resetRecentStatesCurrentSequence(sequenceNumber);
    resetExpectedAcks(sequenceNumber);
  }
  view.setUint8(0, sequenceNumber);
};

const ordnanceChannel1 = { byte1: 0, byte2: 0, fitsInOneByte: false };
const ordnanceChannel2 = { byte1: 0, byte2: 0, fitsInOneByte: false };
const encodeOrdnance = (
  objectId: number,
  objectValue: number,
  out: { byte1: number; byte2: number; fitsInOneByte: boolean }
) => {
  // --- validation (optional but safe) ---
  if (objectId < 0 || objectId > 7) throw new Error("objectId must be 0-7");
  if (objectValue < 0 || objectValue > 4095)
    throw new Error("objectValue must be 0-4095, objectValue: " + objectValue);

  // Check if value fits in 4 bits → 1 byte
  const fitsInOneByte = objectValue <= 0x0f;

  if (fitsInOneByte) {
    // id in bits 7–5, flag=0 in bit 4, value in bits 3–0
    const byte = (objectId << 5) | (0 << 4) | (objectValue & 0x0f);
    out.byte1 = byte;
    out.byte2 = 0;
    out.fitsInOneByte = true;
  }

  // Otherwise: 2‑byte encoding
  // byte1: id(3 bits), flag=1, high 4 bits of value
  const byte1 = (objectId << 5) | (1 << 4) | ((objectValue >> 8) & 0x0f);

  // byte2: low 8 bits of value
  const byte2 = objectValue & 0xff;

  out.byte1 = byte1;
  out.byte2 = byte2;
  out.fitsInOneByte = false;
};

export const gatherStateData = (
  index: number,
  tickStateObject: types.TickStateObject,
  sequenceNumber: number
) => {
  const o = tickStateObject;

  const idOverNetwork = o.idOverNetwork;
  const x = encodeAxisValue(o.x);
  const y = encodeAxisValue(o.y);
  const z = o.positionZ;
  const rotationZ = encodeRotationZ(o.rotationZ);
  const ____ctrlsUp = 0; // o.controlsOverChannelsUp;
  const __ctrlsDown = 0; // o.controlsOverChannelsDown;
  const __ctrlsLeft = 0; // o.controlsOverChannelsLeft;
  const _ctrlsRight = 0; // o.controlsOverChannelsRight;
  const _ctrlsSpace = 0; // o.controlsOverChannelsSpace;
  const _____ctrlsD = 0; // o.controlsOverChannelsD;
  const _____ctrlsF = 0; // o.controlsOverChannelsF;
  const _____ctrlsE = 0; // o.controlsOverChannelsE;

  let controls = 0b00000000;
  ____ctrlsUp && (controls |= 0b00000001);
  __ctrlsDown && (controls |= 0b00000010);
  __ctrlsLeft && (controls |= 0b00000100);
  _ctrlsRight && (controls |= 0b00001000);
  _ctrlsSpace && (controls |= 0b00010000);
  _____ctrlsD && (controls |= 0b00100000);
  _____ctrlsF && (controls |= 0b01000000);

  const healthByte = o.health & 0xff;
  const fuelByte = (o.fuel * parameters.fuelToNetworkRatio) & 0xff;
  encodeOrdnance(0, o.bullets, ordnanceChannel1);
  const xBytes = getUint8Bytes(x);
  const yBytes = getUint8Bytes(y);
  const zBytes = getUint8Bytes(z);
  const rotationZBytes = getUint8Bytes(rotationZ);

  let indexHasChanged = true;
  let controlsHasChanged = true;
  let healthHasChanged = true;
  let xHasChanged = true;
  let yHasChanged = true;
  let zHasChanged = true;
  let rotationZHasChanged = true;
  let xDifferenceSignificance = 4;
  let yDifferenceSignificance = 4;
  let zDifferenceSignificance = 2;
  let rotationZDifferenceSignificance = 2;
  let providedBytesForPositionAndRotationHasChanged = true;
  let ordnanceChannel1HasChanged = true;
  let ordnanceChannel2HasChanged = true;
  let providedValues9to16HasChanged = true;
  let fuelHasChanged = true;

  const stateToCompareTo = getStateToCompareTo(sequenceNumber);
  const oState = stateToCompareTo.state[idOverNetwork];
  if (oState && stateToCompareTo.acknowledged) {
    index === oState.index && (indexHasChanged = false);
    controls === oState.controls && (controlsHasChanged = false);
    healthByte === oState.health && (healthHasChanged = false);
    const oXBytes = getUint8Bytes(oState.x);
    xDifferenceSignificance = getDifferenceSignificance(xBytes, oXBytes);
    const oYBytes = getUint8Bytes(oState.y);
    yDifferenceSignificance = getDifferenceSignificance(yBytes, oYBytes);
    const oZBytes = getUint8Bytes(oState.z);
    zDifferenceSignificance = getDifferenceSignificance(zBytes, oZBytes);
    const oRotationZBytes = getUint8Bytes(oState.rotationZ);
    rotationZDifferenceSignificance = getDifferenceSignificance(
      rotationZBytes,
      oRotationZBytes
    );
    ordnanceChannel1.byte1 === oState.ordnanceChannel1.byte1 &&
      ordnanceChannel1.byte2 === oState.ordnanceChannel1.byte2 &&
      (ordnanceChannel1HasChanged = false);
    ordnanceChannel2.byte1 === oState.ordnanceChannel2.byte1 &&
      ordnanceChannel2.byte2 === oState.ordnanceChannel2.byte2 &&
      (ordnanceChannel2HasChanged = false);
    fuelByte === oState.fuel && (fuelHasChanged = false);
  }
  xDifferenceSignificance === 0 && (xHasChanged = false);
  yDifferenceSignificance === 0 && (yHasChanged = false);
  zDifferenceSignificance === 0 && (zHasChanged = false);
  rotationZDifferenceSignificance === 0 && (rotationZHasChanged = false);
  !indexHasChanged &&
    !healthHasChanged &&
    !ordnanceChannel1HasChanged &&
    !ordnanceChannel2HasChanged &&
    (providedValues9to16HasChanged = false);

  let providedBytesForPositionAndRotation = 0b00000000;

  if (xDifferenceSignificance === 4) {
    providedBytesForPositionAndRotation |= 0b00000011; // bit 1&2
  } else if (xDifferenceSignificance === 3) {
    providedBytesForPositionAndRotation |= 0b00000010; // bit 2
  } else if (xDifferenceSignificance === 2) {
    providedBytesForPositionAndRotation |= 0b00000001; // bit 1
  }

  if (yDifferenceSignificance === 4)
    providedBytesForPositionAndRotation |= 0b00001100; // bit 3&4
  if (yDifferenceSignificance === 3)
    providedBytesForPositionAndRotation |= 0b00001000; // bit 4
  if (yDifferenceSignificance === 2)
    providedBytesForPositionAndRotation |= 0b00000100; // bit 3
  if (zDifferenceSignificance === 2)
    providedBytesForPositionAndRotation |= 0b00010000; // bit 5
  if (rotationZDifferenceSignificance === 2)
    providedBytesForPositionAndRotation |= 0b00100000; // bit 6

  const a = providedBytesForPositionAndRotation;
  const b = oState?.providedBytesForPositionAndRotation;
  a === b && (providedBytesForPositionAndRotationHasChanged = false);

  let providedValues1to8 = 0b00000000;
  providedValues9to16HasChanged && (providedValues1to8 |= 0b00000001);
  controlsHasChanged && (providedValues1to8 |= 0b00000010);
  fuelHasChanged && (providedValues1to8 |= 0b00000100);
  providedBytesForPositionAndRotationHasChanged &&
    (providedValues1to8 |= 0b00001000);
  xHasChanged && (providedValues1to8 |= 0b00010000);
  yHasChanged && (providedValues1to8 |= 0b00100000);
  rotationZHasChanged && (providedValues1to8 |= 0b10000000);

  let providedValues9to16 = 0b00000000;
  indexHasChanged && (providedValues9to16 |= 0b00000001);
  zHasChanged && (providedValues1to8 |= 0b00000010);
  healthHasChanged && (providedValues9to16 |= 0b00000100);
  ordnanceChannel1HasChanged && (providedValues9to16 |= 0b00001000);
  ordnanceChannel2HasChanged && (providedValues9to16 |= 0b00010000);

  let localOffset = 0;

  const setUint8 = (value: number) => {
    view.setUint8(offset + localOffset, value);
    localOffset++;
  };

  const insertChangedBytes = (
    differenceSignificance: number,
    arrayOf4BytesBigEndian: number[]
  ) => {
    for (let i = 4 - differenceSignificance; i < 4; i++) {
      setUint8(arrayOf4BytesBigEndian[i]);
    }
  };

  setUint8(providedValues1to8);
  providedValues9to16HasChanged && setUint8(providedValues9to16);
  indexHasChanged && setUint8(idOverNetwork);
  controlsHasChanged && setUint8(controls);
  healthHasChanged && setUint8(healthByte);
  fuelHasChanged && setUint8(fuelByte);
  providedBytesForPositionAndRotationHasChanged &&
    setUint8(providedBytesForPositionAndRotation);
  insertChangedBytes(xDifferenceSignificance, xBytes);
  insertChangedBytes(yDifferenceSignificance, yBytes);
  insertChangedBytes(zDifferenceSignificance, zBytes);
  insertChangedBytes(rotationZDifferenceSignificance, rotationZBytes);
  ordnanceChannel1HasChanged && setUint8(ordnanceChannel1.byte1);
  ordnanceChannel1HasChanged &&
    !ordnanceChannel1.fitsInOneByte &&
    setUint8(ordnanceChannel1.byte2);
  ordnanceChannel2HasChanged && setUint8(ordnanceChannel2.byte1);
  ordnanceChannel2HasChanged &&
    !ordnanceChannel2.fitsInOneByte &&
    setUint8(ordnanceChannel2.byte2);
  offset += localOffset;

  if (shouldAddToRecentStates(sequenceNumber)) {
    const o = recentStates[sequenceNumber].state[idOverNetwork];
    if (o) {
      o.index = index;
      o.idOverNetwork = idOverNetwork;
      o.controls = controls;
      o.health = healthByte;
      o.x = x;
      o.y = y;
      o.z = z;
      o.rotationZ = rotationZ;
      o.providedBytesForPositionAndRotation =
        providedBytesForPositionAndRotation;
      o.fuel = fuelByte;
      o.ordnanceChannel1.byte1 = ordnanceChannel1.byte1;
      o.ordnanceChannel1.byte2 = ordnanceChannel1.byte2;
      o.ordnanceChannel2.byte1 = ordnanceChannel2.byte1;
      o.ordnanceChannel2.byte2 = ordnanceChannel2.byte2;
    } else {
      recentStates[sequenceNumber].state[idOverNetwork] = {
        index,
        idOverNetwork,
        controls,
        health: healthByte,
        x,
        y,
        z,
        rotationZ,
        providedBytesForPositionAndRotation,
        fuel: fuelByte,
        ordnanceChannel1: {
          byte1: ordnanceChannel1.byte1,
          byte2: ordnanceChannel1.byte2,
        },
        ordnanceChannel2: {
          byte1: ordnanceChannel2.byte1,
          byte2: ordnanceChannel2.byte2,
        },
      };
    }
  }
};
