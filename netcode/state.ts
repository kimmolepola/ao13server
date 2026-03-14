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

function sameIntegerPart(a: number, b: number) {
  return (a | 0) === (b | 0);
}

export const gatherStateData = (
  index: number,
  tickStateObject: types.TickStateObject,
  objectInputs: types.InputsWithBytes,
  eventsEncoded: number,
  sequenceNumber: number
) => {
  const o = tickStateObject;

  const idOverNetwork = o.idOverNetwork;
  const x = encodeAxisValue(o.x);
  const y = encodeAxisValue(o.y);
  const z = o.z;
  const rotationZ = encodeRotationZ(o.rotationZ);
  const speed = o.speed;
  const rotationSpeed = o.rotationSpeed;
  const verticalSpeed = o.verticalSpeed;

  const inputs1 = objectInputs.byte1;
  const inputs2 = objectInputs.byte2;

  const healthByte = o.health & 0xff;
  const fuelByte = (o.fuel * parameters.fuelToNetworkRatio) & 0xff;
  encodeOrdnance(0, o.bullets, ordnanceChannel1);
  const xBytes = getUint8Bytes(x);
  const yBytes = getUint8Bytes(y);

  let indexHasChanged = true;
  let inputs1HasChanged = true;
  let inputs2HasChanged = true;
  let eventsHasChanged = true;
  let healthHasChanged = true;
  let zHasChanged = true;
  let rotationZHasChanged = true;
  let rotationSpeedHasChanged = true;
  let xDifferenceSignificance = 4;
  let yDifferenceSignificance = 4;
  let ordnanceChannel1HasChanged = true;
  let ordnanceChannel2HasChanged = true;
  let fuelHasChanged = true;
  let speedHasChanged = true;
  let verticalSpeedHasChanged = true;

  const stateToCompareTo = getStateToCompareTo(sequenceNumber);
  const oState = stateToCompareTo.state[idOverNetwork];
  if (oState && stateToCompareTo.acknowledged) {
    // ---values 1---
    // 2
    inputs1 === oState.inputs1 && (inputs1HasChanged = false);
    // 3, 4
    const oXBytes = getUint8Bytes(oState.x);
    xDifferenceSignificance = getDifferenceSignificance(xBytes, oXBytes);
    // 5, 6
    const oYBytes = getUint8Bytes(oState.y);
    yDifferenceSignificance = getDifferenceSignificance(yBytes, oYBytes);
    // 7
    sameIntegerPart(rotationZ, oState.rotationZ) &&
      (rotationZHasChanged = false);
    // 8
    sameIntegerPart(rotationSpeed, oState.rotationSpeed) &&
      (rotationSpeedHasChanged = false);

    // ---values 2---
    // 2
    index === oState.index && (indexHasChanged = false);
    // 3
    sameIntegerPart(speed, o.speed) && (speedHasChanged = false);
    // 4
    eventsEncoded === oState.eventsEncoded && (eventsHasChanged = false);
    // 5
    healthByte === oState.health && (healthHasChanged = false);
    // 6
    fuelByte === oState.fuel && (fuelHasChanged = false);

    // ---values 3---
    // 1
    inputs2 === oState.inputs2 && (inputs2HasChanged = false);
    // 2
    sameIntegerPart(verticalSpeed, o.verticalSpeed) &&
      (verticalSpeedHasChanged = false);
    // 3
    sameIntegerPart(z, o.z) && (zHasChanged = false);
    // 4
    ordnanceChannel1.byte1 === oState.ordnanceChannel1.byte1 &&
      ordnanceChannel1.byte2 === oState.ordnanceChannel1.byte2 &&
      (ordnanceChannel1HasChanged = false);
    // 5
    ordnanceChannel2.byte1 === oState.ordnanceChannel2.byte1 &&
      ordnanceChannel2.byte2 === oState.ordnanceChannel2.byte2 &&
      (ordnanceChannel2HasChanged = false);
  }

  // ---values 3---
  let providedValues17to24 = 0b00000000;
  inputs2HasChanged && (providedValues17to24 |= 0b00000001);
  verticalSpeedHasChanged && (providedValues17to24 |= 0b00000010);
  zHasChanged && (providedValues17to24 |= 0b00000100);
  ordnanceChannel1HasChanged && (providedValues17to24 |= 0b00001000);
  ordnanceChannel2HasChanged && (providedValues17to24 |= 0b00010000);

  // ---values 2---
  let providedValues9to16 = 0b00000000;
  providedValues17to24 && (providedValues9to16 |= 0b00000001);
  indexHasChanged && (providedValues9to16 |= 0b00000010);
  speedHasChanged && (providedValues9to16 |= 0b00000100);
  eventsHasChanged && (providedValues9to16 |= 0b00001000);
  healthHasChanged && (providedValues9to16 |= 0b00010000);
  fuelHasChanged && (providedValues9to16 |= 0b00100000);

  // ---values 1---
  let providedValues1to8 = 0b00000000;
  providedValues9to16 && (providedValues1to8 |= 0b00000001);
  inputs1HasChanged && (providedValues1to8 |= 0b00000010);
  if (xDifferenceSignificance === 4 || xDifferenceSignificance === 3) {
    providedValues1to8 |= 0b00001100;
  } else if (xDifferenceSignificance === 2) {
    providedValues1to8 |= 0b00001000;
  } else if (xDifferenceSignificance === 1) {
    providedValues1to8 |= 0b00000100;
  }
  if (yDifferenceSignificance === 4 || yDifferenceSignificance === 3) {
    providedValues1to8 |= 0b00110000;
  } else if (yDifferenceSignificance === 2) {
    providedValues1to8 |= 0b00100000;
  } else if (yDifferenceSignificance === 1) {
    providedValues1to8 |= 0b00010000;
  }
  rotationZHasChanged && (providedValues1to8 |= 0b01000000);
  rotationSpeedHasChanged && (providedValues1to8 |= 0b10000000);

  // ---values---

  let localOffset = 0;

  const setUint8 = (value: number) => {
    view.setUint8(offset + localOffset, value);
    localOffset++;
  };

  const setUint16 = (value: number) => {
    view.setUint8(offset + localOffset, value);
    localOffset += 2;
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
  providedValues9to16 && setUint8(providedValues9to16);
  providedValues17to24 && setUint8(providedValues17to24);
  indexHasChanged && setUint8(idOverNetwork);

  // ---values 1---
  inputs1HasChanged && setUint8(inputs1 || 0);
  insertChangedBytes(
    xDifferenceSignificance === 3 ? 4 : xDifferenceSignificance,
    xBytes
  );
  insertChangedBytes(
    yDifferenceSignificance === 3 ? 4 : yDifferenceSignificance,
    yBytes
  );
  rotationZHasChanged && setUint16(rotationZ);
  rotationSpeedHasChanged && setUint8(rotationSpeed);

  // ---values 2---
  speedHasChanged && setUint16(speed);
  eventsHasChanged && setUint8(eventsEncoded);
  healthHasChanged && setUint8(healthByte);
  fuelHasChanged && setUint8(fuelByte);

  // ---values 3---
  inputs2HasChanged && setUint8(inputs2 || 0);
  verticalSpeedHasChanged && setUint8(verticalSpeed);
  zHasChanged && setUint16(z);
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
      // ---values 1---
      o.inputs1 = inputs1;
      o.x = x;
      o.y = y;
      o.rotationZ = rotationZ;
      o.rotationSpeed = rotationSpeed;

      // ---values 2---
      o.idOverNetwork = idOverNetwork;
      o.speed = speed;
      o.eventsEncoded = eventsEncoded;
      o.health = healthByte;
      o.fuel = fuelByte;

      // ---values 3---
      o.inputs2 = inputs2;
      o.verticalSpeed = verticalSpeed;
      o.z = z;
      o.ordnanceChannel1.byte1 = ordnanceChannel1.byte1;
      o.ordnanceChannel1.byte2 = ordnanceChannel1.byte2;
      o.ordnanceChannel2.byte1 = ordnanceChannel2.byte1;
      o.ordnanceChannel2.byte2 = ordnanceChannel2.byte2;
    } else {
      recentStates[sequenceNumber].state[idOverNetwork] = {
        index,

        // ---values 1---
        inputs1,
        x,
        y,
        rotationZ,
        rotationSpeed,

        // ---values 2---
        idOverNetwork,
        speed,
        eventsEncoded,
        health: healthByte,
        fuel: fuelByte,

        // ---values 3---
        inputs2: inputs2,
        verticalSpeed,
        z,
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
