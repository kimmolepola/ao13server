import * as types from "./types";

export const staticObjects: types.StaticGameObject[] = [];
export const localObjects: types.LocalGameObject[] = [];
export const clients: types.Clients = {
  map: {},
  array: [],
};
export const queue: string[] = []; // ids
export const state: {
  sharedObjectInfo: types.SharedObjectInfo[];
  sharedObjectInfoById: { [id: string]: types.SharedObjectInfo };
} = {
  sharedObjectInfo: [],
  sharedObjectInfoById: {},
};
