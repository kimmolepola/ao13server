import * as types from "./types";

export const staticGameObjects: types.StaticGameObject[] = [];
export const sharedGameObjects: types.SharedGameObject[] = [];
export const localGameObjects: types.LocalGameObject[] = [];
export const clients: types.Clients = {
  map: {},
  array: [],
};
export const queue: string[] = []; // ids
