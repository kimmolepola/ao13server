import * as globals from "../globals";
import * as parameters from "../parameters";
import * as types from "../types";
import { encodeQuaternionWithOnlyZRotation } from "../utils";
import { sendUnreliableBinary } from "../service/channels";

let buffer = new ArrayBuffer(types.unreliableStateInfoBytes);
let view = new DataView(buffer);
let previousObjectCount = 0;
let offset = 0;
let seq = 0;

const incrementAndLoop16BitSequence = () => {
  seq = (seq + 1) % 65536;
  view.setUint16(0, seq);
};

const insertStateSequenceNumber = () => {
  const sequenceNumber = globals.recentlySentState.value?.sequenceNumberMax255;
  sequenceNumber !== undefined && view.setUint8(2, sequenceNumber);
};

export const resetUnreliableStateOffset = () => {
  offset = types.unreliableStateInfoBytes;
};

export const sendUnreliableState = () => {
  insertStateSequenceNumber();
  sendUnreliableBinary(Buffer.from(buffer, 0, offset));
  incrementAndLoop16BitSequence();
};

export const syncBufferSize = () => {
  const objectCount = globals.sharedGameObjects.length;
  if (objectCount !== previousObjectCount) {
    previousObjectCount = objectCount;
    buffer = new ArrayBuffer(
      types.unreliableStateInfoBytes +
        objectCount * types.unreliableStateSingleObjectMaxBytes
    );
    view = new DataView(buffer);
    view.setUint16(0, seq);
  }
};

export const gatherUnreliableStateDataBinary = (
  gameObject: types.SharedGameObject
) => {
  const o = gameObject;
  const recentObjectState = globals.recentlySentState.value?.data[o.id];
  let providedValues1to8 = 0b00000000;
  let providedValues9to16 = 0b00000000;
  // 2 bytes for provided values info
  let localOffset = 2;

  if (o.score !== recentObjectState?.score) {
    providedValues1to8 |= 0b00000001; // 1st bit
    view.setUint32(offset + localOffset, o.score);
    localOffset += 4; // 6 bytes #1
  }

  if (o.health !== recentObjectState?.health) {
    providedValues1to8 |= 0b00000010; // 2nd bit
    view.setUint8(offset + localOffset, o.health);
    localOffset += 1; // 7 bytes #2
  }

  const up = Math.round(o.controlsOverChannelsUp);
  if (up) {
    providedValues1to8 |= 0b00000100; // 3rd bit
    view.setUint8(offset + localOffset, up);
    localOffset += 1; // 8 bytes #3
  }

  const down = Math.round(o.controlsOverChannelsDown);
  if (down) {
    providedValues1to8 |= 0b00001000; // 4th bit
    view.setUint8(offset + localOffset, down);
    localOffset += 1; // 9 bytes #4
  }

  const left = Math.round(o.controlsOverChannelsLeft);
  if (left) {
    providedValues1to8 |= 0b00010000; // 5th bit
    view.setUint8(offset + localOffset, left);
    localOffset += 1; // 10 bytes #5
  }

  const right = Math.round(o.controlsOverChannelsRight);
  if (right) {
    providedValues1to8 |= 0b00100000; // 6th bit
    view.setUint8(offset + localOffset, right);
    localOffset += 1; // 11 bytes #6
  }

  const space = Math.round(o.controlsOverChannelsSpace);
  if (space) {
    providedValues1to8 |= 0b01000000; // 7th bit
    view.setUint8(offset + localOffset, space);
    localOffset += 1; // 12 bytes #7
  }

  const d = Math.round(o.controlsOverChannelsD);
  if (d) {
    providedValues1to8 |= 0b10000000; // 8th bit
    view.setUint8(offset + localOffset, d);
    localOffset += 1; // 13 bytes #8
  }

  const f = Math.round(o.controlsOverChannelsF);
  if (f) {
    providedValues9to16 |= 0b00000001; // 1st bit of 2nd byte
    view.setUint8(offset + localOffset, f);
    localOffset += 1; // 14 bytes #9
  }

  const rotationSpeed = Math.round(o.rotationSpeed);
  if (rotationSpeed !== recentObjectState?.rotationSpeed) {
    providedValues9to16 |= 0b00000010; // 2nd bit of 2nd byte
    view.setInt8(offset + localOffset, rotationSpeed);
    localOffset += 1; // 15 bytes #10
  }

  const verticalSpeed = Math.round(o.verticalSpeed);
  if (verticalSpeed !== recentObjectState?.verticalSpeed) {
    providedValues9to16 |= 0b00000100; // 3nd bit of 2nd byte
    view.setInt8(offset + localOffset, verticalSpeed);
    localOffset += 1; // 16 bytes #11
  }

  if (o.speed !== recentObjectState?.speed) {
    providedValues9to16 |= 0b00001000; // 4th bit of 2nd byte
    view.setUint16(
      offset + localOffset,
      Math.round(o.speed * parameters.speedToNetworkFactor)
    );
    localOffset += 2; // 18 bytes #12
  }

  if (o.mesh.position.x !== recentObjectState?.position.x) {
    providedValues9to16 |= 0b00010000; // 5th bit of 2nd byte
    view.setFloat32(offset + localOffset, o.mesh?.position.x || 0);
    localOffset += 4; // 22 bytes #13
  }

  if (o.mesh.position.y !== recentObjectState?.position.y) {
    providedValues9to16 |= 0b00100000; // 6th bit of 2nd byte
    view.setFloat32(offset + localOffset, o.mesh?.position.y || 0);
    localOffset += 4; // 26 bytes #14
  }

  if (o.positionZ !== recentObjectState?.position.z) {
    providedValues9to16 |= 0b01000000; // 7th bit of 2nd byte
    view.setFloat32(offset + localOffset, o.positionZ || 0);
    localOffset += 4; // 30 bytes #15
  }

  if (
    o.mesh.quaternion.z !== o.previousSend.quaternionZ ||
    o.mesh.quaternion.w !== o.previousSend.quaternionW
  ) {
    const angleZ = encodeQuaternionWithOnlyZRotation(o.mesh.quaternion);
    if (angleZ !== recentObjectState?.angleZ) {
      providedValues9to16 |= 0b10000000; // 8th bit of 2nd byte
      view.setUint16(offset + localOffset, angleZ);
      localOffset += 2; // 32 bytes #16
    }
  }

  // if (o.mesh?.quaternion.x !== recentObjectState?.quaternion.x) {
  //   providedValues9to16 |= 0b00010000; // 5th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.x || 0);
  //   localOffset += 4; // 31 bytes #13
  // }

  // if (o.mesh?.quaternion.y !== recentObjectState?.quaternion.y) {
  //   providedValues9to16 |= 0b00100000; // 6th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.y || 0);
  //   localOffset += 4; // 35 bytes #14
  // }

  // if (o.mesh?.quaternion.z !== recentObjectState?.quaternion.z) {
  //   providedValues9to16 |= 0b01000000; // 7th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.z || 0);
  //   localOffset += 4; // 39 bytes #15
  // }

  // if (o.mesh?.quaternion.w !== recentObjectState?.quaternion.w) {
  //   providedValues9to16 |= 0b10000000; // 8th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.w || 0);
  //   localOffset += 4; // 43 bytes #16
  // }

  view.setUint8(offset, providedValues1to8);
  view.setUint8(offset + 1, providedValues9to16);

  // offset max total = 32 bytes
  if (localOffset > types.unreliableStateSingleObjectMaxBytes) {
    console.warn(
      `Warning: Game object data exceeded the maximum size of ${types.unreliableStateSingleObjectMaxBytes} bytes. Actual size: ${localOffset} bytes.`
    );
  }
  offset += localOffset;
};
