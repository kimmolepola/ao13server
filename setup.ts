import * as globals from "./globals";
import * as types from "./types";

export const setupStaticObjects = () => {
  globals.staticGameObjects.length = 0;
  globals.staticGameObjects.push(...staticObjects);
};

const staticObjects: types.StaticGameObject[] = [
  {
    id: "1000",
    type: types.GameObjectType.Runway,
    x: 0,
    y: 0,
    rotation: 1,
  },
];
