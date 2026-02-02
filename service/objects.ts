import * as types from "../types";
import * as api from "../api";
import * as parameters from "../parameters";
import * as THREE from "three";
import * as globals from "../globals";
import { handleSendBaseState } from "../netcode/baseState";
import { handleSendQueue } from "../netcode/queue";
import { resetRecentStates } from "../netcode/state";

const generateIdOverNetwork = () => {
  for (let i = 0; i < parameters.maxSharedObjects; i++) {
    if (!globals.sharedObjects.some((x) => x.idOverNetwork === i)) {
      return i;
    }
  }
  console.error("generateIdOverNetwork failure");
  return -1;
};

const idFailure = (id: string) => {
  console.error("Failed to add new object, id length not 32:", id);
};

const dataFailure = (id: string) => {
  console.error("Failed to add new object, no initialGameObject. Id: ", id);
};

const idOverNetworkFailure = (id: string) => {
  console.error(
    "Failed to add new object, generateIdOverNetwork failure. Id: ",
    id,
    ". SharedGameObjects:",
    globals.sharedObjects
  );
};

const addObject = async (id: string) => {
  if (id.length !== 32) return idFailure(id);

  const { data } = await api.getGameObject(id);
  if (!data) return dataFailure(id);

  const idOverNetwork = generateIdOverNetwork();
  if (idOverNetwork === -1) return idOverNetworkFailure(id);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry);
  mesh.geometry.computeBoundingBox();
  const gameObject: types.SharedGameObject = {
    idOverNetwork,
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
    controlsE: 0,
    controlsOverChannelsUp: 0,
    controlsOverChannelsDown: 0,
    controlsOverChannelsLeft: 0,
    controlsOverChannelsRight: 0,
    controlsOverChannelsSpace: 0,
    controlsOverChannelsD: 0,
    controlsOverChannelsF: 0,
    controlsOverChannelsE: 0,
    speed: parameters.initialSpeed,
    fuel: parameters.maxFuelKg,
    bullets: 480,
    rotationSpeed: 0,
    verticalSpeed: 0,
    mesh,
    shotDelay: 0,
    health: 100,
    positionZ: 1000,
  };
  globals.sharedObjects.push(gameObject);
  globals.sharedObjectsById[id] = gameObject;
};

export const savePlayerData = async () => {
  const data =
    globals.sharedObjects.reduce((acc: types.PlayerState[], cur) => {
      if (cur.isPlayer) {
        acc.push({ clientId: cur.id, score: cur.score });
      }
      return acc;
    }, []) || [];
  api.postSaveGameState(data);
};

export const handleNewId = async (newId: string) => {
  if (!globals.sharedObjects.some((x) => x.id === newId)) {
    if (globals.sharedObjects.length < parameters.maxSharedObjects) {
      resetRecentStates();
      await addObject(newId);
      handleSendBaseState();
    } else {
      globals.queue.push(newId);
      handleSendQueue(newId);
    }
  }
};

export const handleRemoveId = (idToRemove: string) => {
  const indexToRemove = globals.sharedObjects.findIndex(
    (x) => x.id === idToRemove
  );
  if (indexToRemove !== -1) {
    savePlayerData();
    globals.sharedObjects.splice(indexToRemove, 1);
    delete globals.sharedObjectsById[idToRemove];
    handleSendBaseState();
  }
};

const oneFrame60FPS = 1000 / 60;
export const receiveControlsData = (
  remoteId: string,
  data: types.InputsData
) => {
  // const o = globals.sharedGameObjects.find((x) => x.id === remoteId);
  // if (o) {
  //   o.controlsUp += data.controls.up * oneFrame60FPS;
  //   o.controlsDown += data.down * oneFrame60FPS;
  //   o.controlsLeft += data.left * oneFrame60FPS;
  //   o.controlsRight += data.right * oneFrame60FPS;
  //   o.controlsSpace += data.space * oneFrame60FPS;
  //   o.controlsD += data.d * oneFrame60FPS;
  //   o.controlsF += data.f * oneFrame60FPS;
  //   o.controlsE += data.e * oneFrame60FPS;
  //   o.controlsOverChannelsUp += data.up * oneFrame60FPS;
  //   o.controlsOverChannelsDown += data.down * oneFrame60FPS;
  //   o.controlsOverChannelsLeft += data.left * oneFrame60FPS;
  //   o.controlsOverChannelsRight += data.right * oneFrame60FPS;
  //   o.controlsOverChannelsSpace += data.space * oneFrame60FPS;
  //   o.controlsOverChannelsD += data.d * oneFrame60FPS;
  //   o.controlsOverChannelsF += data.f * oneFrame60FPS;
  //   o.controlsOverChannelsE += data.e * oneFrame60FPS;
  // }
};
