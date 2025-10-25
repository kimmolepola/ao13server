import * as types from "./types";

export const idsVersionMax255 = {
  value: 0,
  increment: () => {
    idsVersionMax255.value++;
    idsVersionMax255.value > 255 && (idsVersionMax255.value = 0);
  },
};
export const recentlySentState: types.RecentlySentState = {};
export const sharedGameObjects: types.SharedGameObject[] = [];
export const localGameObjects: types.LocalGameObject[] = [];
export const clients: types.Clients = {
  map: {},
  array: [],
};
