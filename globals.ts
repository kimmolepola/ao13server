import * as types from "./types";

export const staticObjects: types.StaticGameObject[] = [];
export const clients: types.Clients = {
  map: {},
  array: [],
};
export const queue: string[] = []; // ids
export const tickRef: { currentState: types.TickStateObject[] } = { currentState: [] };
export const state: {
  sharedObjectInfo: types.SharedObjectInfo[];
  sharedObjectInfoById: { [id: string]: types.SharedObjectInfo };
} = {
  sharedObjectInfo: [],
  sharedObjectInfoById: {},
};
