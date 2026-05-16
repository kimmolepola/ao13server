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
  const objectCount = globals.state.sharedObjectInfo.length;
  if (objectCount !== previousObjectCount) {
    previousObjectCount = objectCount;
    const maxBytes =
      sequenceNumberBytes +
      objectCount * types.unreliableStateSingleObjectMaxBytes;
    buffer = new ArrayBuffer(maxBytes);
    view = new DataView(buffer);
    console.log("--SYNC BUFFER SIZE:", maxBytes, objectCount);
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

const ordnanceChannel1 = { id: 0, byte1: 0, byte2: 0 };
const ordnanceChannel2 = { id: 1, byte1: 0, byte2: 0 };
const encodeOrdnance = (
  id: number,
  value: number,
  out: { id: number; byte1: number; byte2: number }
) => {};

function sameIntegerPart(a: number, b: number) {
  return (a | 0) === (b | 0);
}

function encode7bitWithFlag(value7: number, flag: number) {
  // value7: 0–127
  // flag: 0 or 1
  return ((flag & 1) << 7) | (value7 & 0x7f);
}

let debugId = 0;
let prevRotZ = 0;
let prevORotZ = 0;
export const gatherStateData = (
  index: number,
  tickStateObject: types.TickStateObject,
  objectInputs: types.InputsWithBytes,
  sequenceNumber: number,
  pSeq: number,
  ppSeq: number,
  pppSeq: number,
  ppppSeq: number,
  debugPreviousState: types.TickStateObject[],
  ticks: types.TickStateObject[][]
) => {
  // offset !== 1 &&
  //   console.log(
  //     "--offset:",
  //     offset,
  //     globals.state.sharedObjectInfoById,
  //     debugPreviousState.map((x) => x.id)
  //   );

  const pObj = ticks[pSeq][index];
  const ppObj = ticks[ppSeq][index];
  const pppObj = ticks[pppSeq][index];
  const ppppObj = ticks[ppppSeq][index];

  const pOrdnance1Id = pObj.ordnance1Id;
  const ppOrdnance1Id = ppObj.ordnance1Id;
  const pppOrdnance1Id = pppObj.ordnance1Id;
  const ppppOrdnance1Id = ppppObj.ordnance1Id;

  const pOrdnance2Id = pObj.ordnance2Id;
  const ppOrdnance2Id = ppObj.ordnance2Id;
  const pppOrdnance2Id = pppObj.ordnance2Id;
  const ppppOrdnance2Id = ppppObj.ordnance2Id;

  const pOrdnance1Event = pObj.ordnance1Event;
  const ppOrdnance1Event = ppObj.ordnance1Event;
  const pppOrdnance1Event = pppObj.ordnance1Event;
  const ppppOrdnance1Event = ppppObj.ordnance1Event;

  const pOrdnance2Event = pObj.ordnance2Event;
  const ppOrdnance2Event = ppObj.ordnance2Event;
  const pppOrdnance2Event = pppObj.ordnance2Event;
  const ppppOrdnance2Event = ppppObj.ordnance2Event;

  let eventsEncoded = 0b00000000;

  pOrdnance1Event && (eventsEncoded |= 0b00000001);
  ppOrdnance1Event && (eventsEncoded |= 0b00000010);
  pppOrdnance1Event && (eventsEncoded |= 0b00000100);
  ppppOrdnance1Event && (eventsEncoded |= 0b00001000);

  pOrdnance2Event && (eventsEncoded |= 0b00010000);
  ppOrdnance2Event && (eventsEncoded |= 0b00100000);
  pppOrdnance2Event && (eventsEncoded |= 0b01000000);
  ppppOrdnance2Event && (eventsEncoded |= 0b10000000);

  let ordnance1EventId1 = undefined;
  let ordnance1EventId2 = undefined;
  let ordnance1EventId3 = undefined;
  let ordnance1EventId4 = undefined;
  let ordnance2EventId1 = undefined;
  let ordnance2EventId2 = undefined;
  let ordnance2EventId3 = undefined;
  let ordnance2EventId4 = undefined;

  if (pOrdnance1Event) ordnance1EventId1 = pOrdnance1Id;

  if (ppOrdnance1Event) {
    if (ordnance1EventId1 === undefined) ordnance1EventId1 = ppOrdnance1Id;
    else ordnance1EventId2 = ppOrdnance1Id;
  }

  if (pppOrdnance1Event) {
    if (ordnance1EventId1 === undefined) ordnance1EventId1 = pppOrdnance1Id;
    else if (ordnance1EventId2 === undefined)
      ordnance1EventId2 = pppOrdnance1Id;
    else ordnance1EventId3 = pppOrdnance1Id;
  }

  if (ppppOrdnance1Event) {
    if (ordnance1EventId1 === undefined) ordnance1EventId1 = ppppOrdnance1Id;
    else if (ordnance1EventId2 === undefined)
      ordnance1EventId2 = ppppOrdnance1Id;
    else if (ordnance1EventId3 === undefined)
      ordnance1EventId3 = ppppOrdnance1Id;
    else ordnance1EventId4 = ppppOrdnance1Id;
  }

  if (pOrdnance2Event) ordnance2EventId1 = pOrdnance2Id;

  if (ppOrdnance2Event) {
    if (ordnance2EventId1 === undefined) ordnance2EventId1 = ppOrdnance2Id;
    else ordnance2EventId2 = ppOrdnance2Id;
  }

  if (pppOrdnance2Event) {
    if (ordnance2EventId1 === undefined) ordnance2EventId1 = pppOrdnance2Id;
    else if (ordnance2EventId2 === undefined)
      ordnance2EventId2 = pppOrdnance2Id;
    else ordnance2EventId3 = pppOrdnance2Id;
  }

  if (ppppOrdnance2Event) {
    if (ordnance2EventId1 === undefined) ordnance2EventId1 = ppppOrdnance2Id;
    else if (ordnance2EventId2 === undefined)
      ordnance2EventId2 = ppppOrdnance2Id;
    else if (ordnance2EventId3 === undefined)
      ordnance2EventId3 = ppppOrdnance2Id;
    else ordnance2EventId4 = ppppOrdnance2Id;
  }

  const ordnance1FirstDefinedId =
    ordnance1EventId1 ??
    ordnance1EventId2 ??
    ordnance1EventId3 ??
    ordnance1EventId4;

  const ordnance2FirstDefinedId =
    ordnance2EventId1 ??
    ordnance2EventId2 ??
    ordnance2EventId3 ??
    ordnance2EventId4;

  const ordnance1AllDefinedIdsSame =
    (ordnance1EventId2 === undefined ||
      ordnance1EventId2 === ordnance1FirstDefinedId) &&
    (ordnance1EventId3 === undefined ||
      ordnance1EventId3 === ordnance1FirstDefinedId) &&
    (ordnance1EventId4 === undefined ||
      ordnance1EventId4 === ordnance1FirstDefinedId);

  const ordnance2AllDefinedIdsSame =
    (ordnance2EventId2 === undefined ||
      ordnance2EventId2 === ordnance2FirstDefinedId) &&
    (ordnance2EventId3 === undefined ||
      ordnance2EventId3 === ordnance2FirstDefinedId) &&
    (ordnance2EventId4 === undefined ||
      ordnance2EventId4 === ordnance2FirstDefinedId);

  const ordnance1FirstDefinedIdWithFlag = ordnance1FirstDefinedId !== undefined
    ? encode7bitWithFlag(
        ordnance1FirstDefinedId,
        ordnance1AllDefinedIdsSame ? 1 : 0
      )
    : undefined;

  const ordnance2FirstDefinedIdWithFlag = ordnance2FirstDefinedId !== undefined
    ? encode7bitWithFlag(
        ordnance2FirstDefinedId,
        ordnance2AllDefinedIdsSame ? 1 : 0
      )
    : undefined;

  const o = tickStateObject;

  const idOverNetwork = o.idOverNetwork;
  const x = encodeAxisValue(o.x);
  const y = encodeAxisValue(o.y);
  const z = o.z;

  const rotationZ = encodeRotationZ(o.rotationZ);
  // if (
  //   o.idOverNetwork === debugId &&
  //   (o.rotationZ !== prevORotZ || rotationZ !== prevRotZ)
  // ) {
  //   prevORotZ = o.rotationZ;
  //   prevRotZ = rotationZ;
  //   console.log("--o:", o.idOverNetwork, o.rotationZ);
  // }
  const speed = o.speed;
  // if (prevSpeed.toFixed(2) !== speed.toFixed(2)) {
  //   console.log(
  //     "--speed:",
  //     prevSpeed.toFixed(2),
  //     speed.toFixed(2),
  //   );
  //   prevSpeed = speed;
  // }
  const rotationSpeed = o.rotationSpeed;
  const verticalSpeed = o.verticalSpeed;

  const inputs1 = objectInputs.byte1;
  const inputs2 = objectInputs.byte2;

  const healthByte = o.health & 0xff;
  // console.log("--health:", o.health, healthByte);
  const fuelByte = (o.fuel * parameters.fuelToNetworkRatio) & 0xff;
  // console.log("--o:", o);
  encodeOrdnance(0, o.bullets, ordnanceChannel1);
  encodeOrdnance(1, 0, ordnanceChannel2); // TODO: content
  // console.log("--ord:", o.bullets, ordnanceChannel1.byte1);
  const xBytes = getUint8Bytes(x);
  const yBytes = getUint8Bytes(y);

  let indexHasChanged = true;
  let inputs1HasChanged = true;
  let inputs2HasChanged = true;
  let eventsHasChanged = true;
  let eventsIdsHasChanged = true;
  let healthHasChanged = true;
  let zHasChanged = true;
  let rotationZHasChanged = true;
  let rotationSpeedHasChanged = true;
  let xDifferenceSignificance = 4;
  let yDifferenceSignificance = 4;
  let ordnanceChannel1HasChanged = true;
  let ordnanceChannel1Byte2HasChanged = true;
  let ordnanceChannel2HasChanged = true;
  let ordnanceChannel2Byte2HasChanged = true;
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
    sameIntegerPart(speed, oState.speed) && (speedHasChanged = false);
    // 4
    ordnance1EventId1 === oState.ordnance1EventId1 &&
      ordnance1EventId2 === oState.ordnance1EventId2 &&
      ordnance1EventId3 === oState.ordnance1EventId3 &&
      ordnance1EventId4 === oState.ordnance1EventId4 &&
      ordnance2EventId1 === oState.ordnance2EventId1 &&
      ordnance2EventId2 === oState.ordnance2EventId2 &&
      ordnance2EventId3 === oState.ordnance2EventId3 &&
      ordnance2EventId4 === oState.ordnance2EventId4 &&
      (eventsIdsHasChanged = false);
    // 5
    eventsEncoded === oState.eventsEncoded && (eventsHasChanged = false);
    // 6
    healthByte === oState.health && (healthHasChanged = false);
    // 7
    fuelByte === oState.fuel && (fuelHasChanged = false);

    // ---values 3---
    // 1
    inputs2 === oState.inputs2 && (inputs2HasChanged = false);
    // 2
    sameIntegerPart(verticalSpeed, oState.verticalSpeed) &&
      (verticalSpeedHasChanged = false);
    // 3
    sameIntegerPart(z, oState.z) && (zHasChanged = false);
    // 4
    ordnanceChannel1.byte2 === oState.ordnanceChannel1.byte2 &&
      (ordnanceChannel1Byte2HasChanged = false);
    const ordnanceChannel1IdWithFlag = encode7bitWithFlag(
      ordnanceChannel1.id,
      ordnanceChannel1Byte2HasChanged ? 1 : 0
    );
    ordnanceChannel1IdWithFlag === oState.ordnanceChannel1.idWithFlag &&
      ordnanceChannel1.byte1 === oState.ordnanceChannel1.byte1 &&
      ordnanceChannel1.byte2 === oState.ordnanceChannel1.byte2 &&
      (ordnanceChannel1HasChanged = false);
    // 5
    ordnanceChannel2.byte2 === oState.ordnanceChannel2.byte2 &&
      (ordnanceChannel2Byte2HasChanged = false);
    const ordnanceChannel2IdWithFlag = encode7bitWithFlag(
      ordnanceChannel2.id,
      ordnanceChannel2Byte2HasChanged ? 1 : 0
    );
    ordnanceChannel2IdWithFlag === oState.ordnanceChannel2.idWithFlag &&
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
  eventsIdsHasChanged && (providedValues9to16 |= 0b00010000);
  healthHasChanged && (providedValues9to16 |= 0b00100000);
  fuelHasChanged && (providedValues9to16 |= 0b01000000);

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
    try {
      view.setUint8(offset + localOffset, value);
    } catch (e: any) {
      console.error(
        "--setUint8 error:",
        offset,
        localOffset,
        offset + localOffset,
        value,
        view.byteLength
      );
    }
    localOffset++;
  };

  const setInt8 = (value: number) => {
    view.setInt8(offset + localOffset, value);
    localOffset++;
  };

  const setUint16 = (value: number) => {
    view.setUint16(offset + localOffset, value);
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
  rotationSpeedHasChanged && setInt8(rotationSpeed);

  // ---values 2---
  speedHasChanged && setUint16(speed);
  eventsHasChanged && setUint8(eventsEncoded);
  if (eventsIdsHasChanged) {
    if (ordnance1AllDefinedIdsSame) {
      ordnance1FirstDefinedIdWithFlag !== undefined &&
        setUint8(ordnance1FirstDefinedIdWithFlag); // flag = 1
    } else {
      ordnance1EventId1 !== undefined && setUint8(ordnance1EventId1); // flag = 0
      ordnance1EventId2 !== undefined && setUint8(ordnance1EventId2); // flag = 0
      ordnance1EventId3 !== undefined && setUint8(ordnance1EventId3); // flag = 0
      ordnance1EventId4 !== undefined && setUint8(ordnance1EventId4); // flag = 0
    }
    if (ordnance2AllDefinedIdsSame) {
      ordnance2FirstDefinedIdWithFlag !== undefined &&
        setUint8(ordnance2FirstDefinedIdWithFlag); // flag = 1
    } else {
      ordnance2EventId1 !== undefined && setUint8(ordnance2EventId1); // flag = 0
      ordnance2EventId2 !== undefined && setUint8(ordnance2EventId2); // flag = 0
      ordnance2EventId3 !== undefined && setUint8(ordnance2EventId3); // flag = 0
      ordnance2EventId4 !== undefined && setUint8(ordnance2EventId4); // flag = 0
    }
  }
  healthHasChanged && setUint8(healthByte);
  fuelHasChanged && setUint8(fuelByte);

  // ---values 3---
  inputs2HasChanged && setUint8(inputs2 || 0);
  verticalSpeedHasChanged && setInt8(verticalSpeed);
  zHasChanged && setUint16(z);

  const ordnanceChannel1IdWithFlag = encode7bitWithFlag(
    ordnanceChannel1.id,
    ordnanceChannel1Byte2HasChanged ? 1 : 0
  );
  ordnanceChannel1HasChanged && setUint8(ordnanceChannel1IdWithFlag);
  ordnanceChannel1HasChanged && setUint8(ordnanceChannel1.byte1);
  ordnanceChannel1Byte2HasChanged && setUint8(ordnanceChannel1.byte2);

  const ordnanceChannel2IdWithFlag = encode7bitWithFlag(
    ordnanceChannel2.id,
    ordnanceChannel2Byte2HasChanged ? 1 : 0
  );
  ordnanceChannel2HasChanged && setUint8(ordnanceChannel2IdWithFlag);
  ordnanceChannel2HasChanged && setUint8(ordnanceChannel2.byte1);
  ordnanceChannel2Byte2HasChanged && setUint8(ordnanceChannel2.byte2);

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
      o.ordnance1EventId1 = ordnance1EventId1;
      o.ordnance1EventId2 = ordnance1EventId2;
      o.ordnance1EventId3 = ordnance1EventId3;
      o.ordnance1EventId4 = ordnance1EventId4;
      o.ordnance2EventId1 = ordnance2EventId1;
      o.ordnance2EventId2 = ordnance2EventId2;
      o.ordnance2EventId3 = ordnance2EventId3;
      o.ordnance2EventId4 = ordnance2EventId4;
      o.eventsEncoded = eventsEncoded;
      o.health = healthByte;
      o.fuel = fuelByte;

      // ---values 3---
      o.inputs2 = inputs2;
      o.verticalSpeed = verticalSpeed;
      o.z = z;
      o.ordnanceChannel1.idWithFlag = ordnanceChannel1IdWithFlag;
      o.ordnanceChannel1.byte1 = ordnanceChannel1.byte1;
      o.ordnanceChannel1.byte2 = ordnanceChannel1.byte2;
      o.ordnanceChannel2.idWithFlag = ordnanceChannel2IdWithFlag;
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
        ordnance1EventId1,
        ordnance1EventId2,
        ordnance1EventId3,
        ordnance1EventId4,
        ordnance2EventId1,
        ordnance2EventId2,
        ordnance2EventId3,
        ordnance2EventId4,
        eventsEncoded,
        health: healthByte,
        fuel: fuelByte,

        // ---values 3---
        inputs2: inputs2,
        verticalSpeed,
        z,
        ordnanceChannel1: {
          idWithFlag: ordnanceChannel1IdWithFlag,
          byte1: ordnanceChannel1.byte1,
          byte2: ordnanceChannel1.byte2,
        },
        ordnanceChannel2: {
          idWithFlag: ordnanceChannel2IdWithFlag,
          byte1: ordnanceChannel2.byte1,
          byte2: ordnanceChannel2.byte2,
        },
      };
    }
  }
};
