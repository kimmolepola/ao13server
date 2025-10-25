import * as types from "../types";
import * as api from "../api";
import * as parameters from "../parameters";
import * as THREE from "three";
import * as globals from "../globals";
import { sendReliable, sendReliableBinary } from "./channels";
import {
  quaternionWithOnlyZRotationToAngle,
  encodeQuaternionWithOnlyZRotation,
} from "../utils";

const addObject = async (id: string) => {
  const { data } = await api.getGameObject(id);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry);
  mesh.geometry.computeBoundingBox();
  if (data) {
    const gameObject: types.SharedGameObject = {
      score: data.score || 0,
      isPlayer: data.isPlayer || false,
      username: data.username || "",
      id,
      type: types.GameObjectType.Fighter as types.GameObjectType.Fighter,
      controlsUp: 0,
      controlsDown: 0,
      controlsLeft: 0,
      controlsRight: 0,
      controlsSpace: 0,
      controlsD: 0,
      controlsF: 0,
      controlsOverChannelsUp: 0,
      controlsOverChannelsDown: 0,
      controlsOverChannelsLeft: 0,
      controlsOverChannelsRight: 0,
      controlsOverChannelsSpace: 0,
      controlsOverChannelsD: 0,
      controlsOverChannelsF: 0,
      speed: parameters.initialSpeed,
      rotationSpeed: 0,
      verticalSpeed: 0,
      mesh,
      shotDelay: 0,
      collisions: {},
      health: 100,
      previousSend: {
        quaternionZ: 0,
        quaternionW: 0,
      },
      positionZ: 1000,
    };
    globals.sharedGameObjects.push(gameObject);
    globals.idsVersionMax255.increment();
  } else {
    console.error("Failed to add new object, no initialGameObject");
  }
};

export const savePlayerData = async () => {
  const data =
    globals.sharedGameObjects.reduce((acc: types.PlayerState[], cur) => {
      if (cur.isPlayer) {
        acc.push({ clientId: cur.id, score: cur.score });
      }
      return acc;
    }, []) || [];
  api.saveGameState(data);
};

const handleSendBaseState = () => {
  const data: types.BaseStateObject[] = globals.sharedGameObjects.map((x) => ({
    id: x.id,
    isPlayer: x.isPlayer,
    username: x.username,
  }));
  sendReliable({ type: types.ServerStringDataType.BaseState, data });
};

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
            x: cur.mesh.position.x,
            y: cur.mesh.position.y,
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

export const handleNewId = async (newId: string) => {
  if (!globals.sharedGameObjects.some((x) => x.id === newId)) {
    await addObject(newId);
    handleSendBaseState();
  }
};

export const handleRemoveId = (idToRemove: string) => {
  const indexToRemove = globals.sharedGameObjects.findIndex(
    (x) => x.id === idToRemove
  );
  if (indexToRemove !== -1) {
    savePlayerData();
    globals.sharedGameObjects.splice(indexToRemove, 1);
    globals.idsVersionMax255.increment();
    handleSendBaseState();
  }
};

export const handleReceiveControlsData = (
  remoteId: string,
  data: types.Controls
) => {
  const o = globals.sharedGameObjects.find((x) => x.id === remoteId);
  if (o) {
    o.controlsUp += data.up;
    o.controlsDown += data.down;
    o.controlsLeft += data.left;
    o.controlsRight += data.right;
    o.controlsSpace += data.space;
    o.controlsD += data.d;
    o.controlsF += data.f;
    o.controlsOverChannelsUp += data.up;
    o.controlsOverChannelsDown += data.down;
    o.controlsOverChannelsLeft += data.left;
    o.controlsOverChannelsRight += data.right;
    o.controlsOverChannelsSpace += data.space;
    o.controlsOverChannelsD += data.d;
    o.controlsOverChannelsF += data.f;
  }
};
