import * as types from "../types";
import * as api from "../api";
import * as parameters from "../parameters";
import * as THREE from "three";
import * as globals from "../globals";
import { sendOrdered } from "./channels";

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
      controlsOverChannelsUp: 0,
      controlsOverChannelsDown: 0,
      controlsOverChannelsLeft: 0,
      controlsOverChannelsRight: 0,
      controlsOverChannelsSpace: 0,
      rotationSpeed: 0,
      speed: parameters.speed,
      mesh,
      shotDelay: 0,
      collisions: {},
      health: 100,
    };
    globals.sharedGameObjects.push(gameObject);
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

export const handleSendState = (sendOrdered: (data: types.State) => void) => {
  sendOrdered({
    type: types.ServerDataType.State,
    data: globals.sharedGameObjects.reduce(
      (acc: { [id: string]: types.StateObject }, cur) => {
        acc[cur.id] = {
          sId: cur.id,
          sIsPlayer: cur.isPlayer,
          sUsername: cur.username,
          sScore: cur.score,
          sRotationSpeed: cur.rotationSpeed,
          sSpeed: cur.speed,
          sPositionX: cur.mesh?.position.x || 0,
          sPositionY: cur.mesh?.position.y || 0,
          sPositionZ: cur.mesh?.position.z || 0,
          sQuaternionX: cur.mesh?.quaternion.x || 0,
          sQuaternionY: cur.mesh?.quaternion.y || 0,
          sQuaternionZ: cur.mesh?.quaternion.z || 0,
          sQuaternionW: cur.mesh?.quaternion.w || 0,
        };
        return acc;
      },
      {}
    ),
  });
};

export const handleNewId = async (newId: string) => {
  if (!globals.sharedGameObjects.some((x) => x.id === newId)) {
    await addObject(newId);
    handleSendState(sendOrdered);
  }
};

export const handleRemoveId = (idToRemove: string) => {
  const indexToRemove = globals.sharedGameObjects.findIndex(
    (x) => x.id === idToRemove
  );
  if (indexToRemove !== -1) {
    savePlayerData();
    globals.sharedGameObjects.splice(indexToRemove, 1);
    handleSendState(sendOrdered);
  }
};

export const handleReceiveControlsData = (
  remoteId: string,
  data: types.Controls
) => {
  const o = globals.sharedGameObjects.find((x) => x.id === remoteId);
  if (o) {
    o.controlsUp += data.data.up || 0;
    o.controlsDown += data.data.down || 0;
    o.controlsLeft += data.data.left || 0;
    o.controlsRight += data.data.right || 0;
    o.controlsSpace += data.data.space || 0;
    o.controlsOverChannelsUp += data.data.up || 0;
    o.controlsOverChannelsDown += data.data.down || 0;
    o.controlsOverChannelsLeft += data.data.left || 0;
    o.controlsOverChannelsRight += data.data.right || 0;
    o.controlsOverChannelsSpace += data.data.space || 0;
  }
};
