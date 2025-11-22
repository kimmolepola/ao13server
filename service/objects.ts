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
    if (!globals.sharedGameObjects.some((x) => x.idOverNetwork === i)) {
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
    globals.sharedGameObjects
  );
};

const addObject = async (id: string) => {
  if (id.length !== 32) return idFailure(id);

  const { data } = await api.getGameObject(id);
  if (!data) return dataFailure(id);

  const idOverNetwork = generateIdOverNetwork();
  if (idOverNetwork === -1) return idOverNetworkFailure(id);

  const geometry = new THREE.BoxGeometry(5000, 5000, 1);
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

export const handleNewId = async (newId: string) => {
  if (!globals.sharedGameObjects.some((x) => x.id === newId)) {
    if (globals.sharedGameObjects.length < parameters.maxSharedObjects) {
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
  const indexToRemove = globals.sharedGameObjects.findIndex(
    (x) => x.id === idToRemove
  );
  if (indexToRemove !== -1) {
    savePlayerData();
    globals.sharedGameObjects.splice(indexToRemove, 1);
    handleSendBaseState();
  }
};

export const receiveControlsData = (remoteId: string, data: types.Controls) => {
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
