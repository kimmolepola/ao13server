import * as types from "../types";
import * as api from "../api";
import * as parameters from "../parameters";
import * as THREE from "three";
import * as globals from "../globals";
import { handleSendReliableState } from "../netcode/reliableState";
import { handleSendBaseState } from "../netcode/baseState";

const addObject = async (id: string) => {
  const { data } = await api.getGameObject(id);
  if (id.length !== 32) {
    console.error("Id length not 32:", id, "user:", data.username);
  }
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

export const handleNewId = async (newId: string) => {
  if (!globals.sharedGameObjects.some((x) => x.id === newId)) {
    await addObject(newId);
    handleSendBaseState();
    handleSendReliableState();
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
    handleSendReliableState();
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
