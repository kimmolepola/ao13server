import * as types from "../types";
import * as api from "../api";
import * as parameters from "../parameters";
import * as THREE from "three";
import * as globals from "../globals";

const addObject = async (id: string) => {
  const { data } = await api.getGameObject(id);
  if (data) {
    const gameObject: types.GameObject = {
      ...data,
      id,
      type: types.GameObjectType.Fighter as types.GameObjectType.Fighter,
      controlsUp: 0,
      controlsDown: 0,
      controlsLeft: 0,
      controlsRight: 0,
      controlsSpace: 0,
      rotationSpeed: 0,
      speed: parameters.speed,
      backendPosition: new THREE.Vector3(),
      backendQuaternion: new THREE.Quaternion(),
      keyDowns: [],
      object3d: undefined,
      dimensions: undefined,
      shotDelay: 0,
      collisions: {},
      health: 100,
    };
    globals.gameObjects.push(gameObject);
  } else {
    console.error("Failed to add new object, no initialGameObject");
  }
};

export const savePlayerData = async () => {
  const data =
    globals.gameObjects.reduce((acc: types.PlayerState[], cur) => {
      if (cur.isPlayer) {
        acc.push({ clientId: cur.id, score: cur.score });
      }
      return acc;
    }, []) || [];
  await api.saveGameState(data);
};

export const handleSendState = (sendOrdered: (data: types.State) => void) => {
  sendOrdered({
    type: types.ServerDataType.State,
    data: globals.gameObjects.reduce(
      (acc: { [id: string]: types.StateObject }, cur) => {
        acc[cur.id] = {
          sId: cur.id,
          sIsPlayer: cur.isPlayer,
          sUsername: cur.username,
          sScore: cur.score,
          sRotationSpeed: cur.rotationSpeed,
          sSpeed: cur.speed,
          sPositionX: cur.object3d?.position.x || 0,
          sPositionY: cur.object3d?.position.y || 0,
          sPositionZ: cur.object3d?.position.z || 0,
          sQuaternionX: cur.object3d?.quaternion.x || 0,
          sQuaternionY: cur.object3d?.quaternion.y || 0,
          sQuaternionZ: cur.object3d?.quaternion.z || 0,
          sQuaternionW: cur.object3d?.quaternion.w || 0,
        };
        return acc;
      },
      {}
    ),
  });
};

const sendOrdered = (data: types.State) => {};

export const handleNewId = async (newId: string) => {
  if (!globals.gameObjects.some((x) => x.id === newId)) {
    await addObject(newId);
    handleSendState(sendOrdered);
  }
};

export const handleRemoveId = (idToRemove: string) => {
  const indexToRemove = globals.gameObjects.findIndex(
    (x) => x.id === idToRemove
  );
  if (indexToRemove !== -1) {
    savePlayerData();
    globals.gameObjects.splice(indexToRemove, 1);
    handleSendState(sendOrdered);
  }
};

export const handleReceiveControlsData = (
  data: types.Controls,
  remoteId: string
) => {
  const o = globals.gameObjects.find((x) => x.id === remoteId);
  if (o) {
    o.controlsUp += data.data.up || 0;
    o.controlsDown += data.data.down || 0;
    o.controlsLeft += data.data.left || 0;
    o.controlsRight += data.data.right || 0;
    o.controlsSpace += data.data.space || 0;
  }
};
