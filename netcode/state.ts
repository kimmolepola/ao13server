import * as globals from "../globals";
import * as types from "../types";
import * as parameters from "../parameters";
import { encodeAxisValue, encodeRotationZ } from "../utils";
import {
  sendUnreliableBinary,
  sendReliableStringSingleClient,
} from "../service/channels";

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
    recentStates[sequenceNumber].acknowledged = false;
    recentStates[sequenceNumber].state = {};
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
  }
};

const uint32ToBytesBE = (num: number) => {
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
  missedWindows: { [clientId: string]: number };
  required: Set<string>;
} = {
  expectedSequenceNumber: 0,
  acknowledged: {},
  missedWindows: {},
  required: new Set(),
};

const resetExpectedAcks = (sequenceNumber: number) => {
  acknowledgements.expectedSequenceNumber = sequenceNumber;
  acknowledgements.acknowledged = {};
  acknowledgements.required = new Set(globals.clients.array.map((c) => c.id));
};

const checkAcks = () => {
  const seq = acknowledgements.expectedSequenceNumber;
  const recentState = recentStates[seq];
  if (!recentState.acknowledged) {
    let allAcked = true;
    for (const clientId of acknowledgements.required) {
      if (!globals.clients.map[clientId]) {
        acknowledgements.required.delete(clientId);
        delete acknowledgements.missedWindows[clientId];
        continue;
      }
      if (!acknowledgements.acknowledged[clientId]) {
        allAcked = false;
      }
    }
    if (allAcked) {
      recentState.acknowledged = true;
    }
  }
};

const evaluateMissedWindows = () => {
  for (const clientId of acknowledgements.required) {
    if (!globals.clients.map[clientId]) {
      acknowledgements.required.delete(clientId);
      delete acknowledgements.missedWindows[clientId];
      continue;
    }
    if (acknowledgements.acknowledged[clientId]) {
      acknowledgements.missedWindows[clientId] = 0;
    } else {
      const missed = (acknowledgements.missedWindows[clientId] ?? 0) + 1;
      acknowledgements.missedWindows[clientId] = missed;
      if (missed >= parameters.ackMaxMissedWindows) {
        console.warn(
          `Client ${clientId} missed ${missed} consecutive ACK windows, disconnecting`
        );
        sendReliableStringSingleClient(clientId, {
          type: types.ServerStringDataType.ConnectionQualityKick,
        });
        globals.clients.map[clientId].peerConnection.close();
      }
    }
  }
};

export const resetRecentStates = () => {
  for (const key of Object.keys(recentStates)) {
    const num = Number.parseInt(key);
    recentStates[num] = { acknowledged: false, state: {} };
  }
};

let pendingRecentStatesReset = false;
export const scheduleRecentStatesReset = () => { pendingRecentStatesReset = true; };
export const applyScheduledRecentStatesReset = () => {
  if (pendingRecentStatesReset) {
    pendingRecentStatesReset = false;
    resetRecentStates();
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
    evaluateMissedWindows();
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
) => {
  out.id = id;
  out.byte1 = (value >> 8) & 0xff;
  out.byte2 = value & 0xff;
};

function sameIntegerPart(a: number, b: number) {
  return (a | 0) === (b | 0);
}

function encode7bitWithFlag(value7: number, flag: number) {
  // value7: 0–127
  // flag: 0 or 1
  return ((flag & 1) << 7) | (value7 & 0x7f);
}

const buildGameEventIdBytes = (
  p: number[],
  pp: number[],
  ppp: number[],
  pppp: number[]
): number[] => {
  const bytes: number[] = [];
  for (const ids of [p, pp, ppp, pppp]) {
    for (let i = 0; i < ids.length; i++) {
      bytes.push(encode7bitWithFlag(ids[i], i < ids.length - 1 ? 1 : 0));
    }
  }
  return bytes;
};

export const gatherStateData = (
  ordinalPosition: number,
  tickStateObject: types.TickStateObject,
  objectInputs: types.InputsWithBytes,
  sequenceNumber: number,
  pSeq: number,
  ppSeq: number,
  pppSeq: number,
  ticks: types.TickStateObject[][]
) => {
  const slotIndex = tickStateObject.idOverNetwork;
  const curObj = ticks[sequenceNumber][slotIndex];
  const pObj = ticks[pSeq][slotIndex];
  const ppObj = ticks[ppSeq][slotIndex];
  const pppObj = ticks[pppSeq][slotIndex];

  const curGameEventIds = curObj.gameEventIds;
  const pGameEventIds = pObj.gameEventIds;
  const ppGameEventIds = ppObj.gameEventIds;
  const pppGameEventIds = pppObj.gameEventIds;

  let eventsEncoded = 0;
  curGameEventIds.length > 0 && (eventsEncoded |= 0b00000001);
  pGameEventIds.length > 0 && (eventsEncoded |= 0b00000010);
  ppGameEventIds.length > 0 && (eventsEncoded |= 0b00000100);
  pppGameEventIds.length > 0 && (eventsEncoded |= 0b00001000);

  const gameEventIdBytes = buildGameEventIdBytes(
    curGameEventIds,
    pGameEventIds,
    ppGameEventIds,
    pppGameEventIds
  );

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
  encodeOrdnance(1, 0, ordnanceChannel2); // TODO: content
  const xBytes = uint32ToBytesBE(x);
  const yBytes = uint32ToBytesBE(y);

  let idOverNetworkHasChanged = true;
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
  const oState = stateToCompareTo.state[ordinalPosition];
  if (oState && stateToCompareTo.acknowledged) {
    // ---values 1---
    // 2
    inputs1 === oState.inputs1 && (inputs1HasChanged = false);
    // 3, 4
    const oXBytes = uint32ToBytesBE(oState.x);
    xDifferenceSignificance = getDifferenceSignificance(xBytes, oXBytes);
    // 5, 6
    const oYBytes = uint32ToBytesBE(oState.y);
    yDifferenceSignificance = getDifferenceSignificance(yBytes, oYBytes);

    // 7
    sameIntegerPart(rotationZ, oState.rotationZ) &&
      (rotationZHasChanged = false);
    // 8
    sameIntegerPart(rotationSpeed, oState.rotationSpeed) &&
      (rotationSpeedHasChanged = false);

    // ---values 2---
    // 2
    idOverNetwork === oState.idOverNetwork && (idOverNetworkHasChanged = false);
    // 3
    sameIntegerPart(speed, oState.speed) && (speedHasChanged = false);
    // 4
    gameEventIdBytes.length === oState.gameEventIdBytes.length &&
      gameEventIdBytes.every((b, i) => b === oState.gameEventIdBytes[i]) &&
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
  idOverNetworkHasChanged && (providedValues9to16 |= 0b00000010);
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
      console.error("setUint8 error");
    }
    localOffset++;
  };

  const setInt8 = (value: number) => {
    try {
      view.setInt8(offset + localOffset, value);
    } catch (e: any) {
      console.error("setInt8 error");
    }
    localOffset++;
  };

  const setUint16 = (value: number) => {
    try {
      view.setUint16(offset + localOffset, value);
    } catch (e: any) {
      console.error("setUint16 error");
    }
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
  idOverNetworkHasChanged && setUint8(idOverNetwork);

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
    for (const b of gameEventIdBytes) {
      setUint8(b);
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
    const o = recentStates[sequenceNumber].state[ordinalPosition];
    if (o) {
      // ---values 1---
      o.inputs1 = inputs1;
      o.x = x;
      o.y = y;
      o.rotationZ = rotationZ;
      o.rotationSpeed = rotationSpeed;

      // ---values 2---
      o.idOverNetwork = idOverNetwork;
      o.speed = speed;
      o.gameEventIdBytes = gameEventIdBytes;
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
      recentStates[sequenceNumber].state[ordinalPosition] = {
        // ---values 1---
        inputs1,
        x,
        y,
        rotationZ,
        rotationSpeed,

        // ---values 2---
        idOverNetwork,
        speed,
        gameEventIdBytes,
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
