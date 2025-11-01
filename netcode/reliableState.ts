import * as types from "../types";
import * as globals from "../globals";
import * as parameters from "../parameters";
import { sendReliableBinary } from "../service/channels";

import {
  quaternionWithOnlyZRotationToAngle,
  encodeQuaternionWithOnlyZRotation,
} from "../utils";

let sequenceNumberMax255 = 0;
const advanceSequenceNumber = () => {
  sequenceNumberMax255++;
  if (sequenceNumberMax255 > 255) {
    sequenceNumberMax255 = 0;
  }
};

export const handleSendReliableState = () => {
  const oBytes = types.reliableStateSingleObjectBytes;
  const totalBytes = 1 + oBytes * globals.sharedGameObjects.length;
  const arrayBuffer = new ArrayBuffer(totalBytes);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, sequenceNumberMax255);
  for (let i = 0; i < globals.sharedGameObjects.length; i++) {
    const o = globals.sharedGameObjects[i];
    const idPart1 = parseInt(o.id.slice(0, 8), 16);
    const idPart2 = parseInt(o.id.slice(8, 16), 16);
    const idPart3 = parseInt(o.id.slice(16, 24), 16);
    const idPart4 = parseInt(o.id.slice(24, 32), 16);
    dataView.setUint32(1 + i * oBytes + 0, idPart1);
    dataView.setUint32(1 + i * oBytes + 4, idPart2);
    dataView.setUint32(1 + i * oBytes + 8, idPart3);
    dataView.setUint32(1 + i * oBytes + 12, idPart4);
    dataView.setUint32(1 + i * oBytes + 16, o.score);
    dataView.setUint8(1 + i * oBytes + 20, o.health);
    const rotationSpeed = Math.round(o.rotationSpeed);
    dataView.setInt8(1 + i * oBytes + 21, rotationSpeed);
    const verticalSpeed = Math.round(o.verticalSpeed);
    dataView.setInt8(1 + i * oBytes + 22, verticalSpeed);
    const speed = Math.round(o.speed * parameters.speedToNetworkFactor);
    dataView.setUint16(1 + i * oBytes + 23, speed);
    dataView.setFloat32(1 + i * oBytes + 25, o.mesh.position.x);
    dataView.setFloat32(1 + i * oBytes + 29, o.mesh.position.y);
    dataView.setFloat32(1 + i * oBytes + 33, o.positionZ);
    dataView.setFloat32(
      1 + i * oBytes + 37,
      quaternionWithOnlyZRotationToAngle(o.mesh.quaternion)
    );
    // dataView.setFloat32(1 + i * oBytes + 36, o.mesh.quaternion.x);
    // dataView.setFloat32(1 + i * oBytes + 40, o.mesh.quaternion.y);
    // dataView.setFloat32(1 + i * oBytes + 44, o.mesh.quaternion.z);
    // dataView.setFloat32(1 + i * oBytes + 48, o.mesh.quaternion.w);
  }
  sendReliableBinary(Buffer.from(arrayBuffer));
  const recentlySentState = {
    idsVersionMax255: globals.idsVersionMax255.value,
    sequenceNumberMax255,
    data: globals.sharedGameObjects.reduce(
      (acc: types.RecentlySentStateObjectData, cur) => {
        acc[cur.id] = {
          ...cur,
          mesh: undefined,
          rotationSpeed: Math.round(cur.rotationSpeed),
          verticalSpeed: Math.round(cur.verticalSpeed),
          // speed: Math.round(cur.speed * parameters.speedToNetworkFactor),
          position: {
            x: Math.round(
              cur.mesh.position.x * parameters.positonToNetworkFactor
            ),
            y: Math.round(
              cur.mesh.position.y * parameters.positonToNetworkFactor
            ),
            z: cur.positionZ,
          },
          // quaternion: {
          //   x: cur.mesh.quaternion.x,
          //   y: cur.mesh.quaternion.y,
          //   z: cur.mesh.quaternion.z,
          //   w: cur.mesh.quaternion.w,
          // },
          angleZ: encodeQuaternionWithOnlyZRotation(cur.mesh.quaternion),
        };
        return acc;
      },
      {}
    ),
  };
  setTimeout(() => {
    globals.recentlySentState.value = recentlySentState;
  }, parameters.maxExpectedReliableTransmissionDelay);
  advanceSequenceNumber();
};
