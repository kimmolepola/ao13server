import * as types from "./types";

export const staticObjects: types.StaticGameObject[] = [];
export const sharedObjects: types.SharedGameObject[] = [];
export const localObjects: types.LocalGameObject[] = [];
export const clients: types.Clients = {
  map: {},
  array: [],
};
export const queue: string[] = []; // ids
export const sharedObjectsById: { [id: string]: types.SharedGameObject } = {};
