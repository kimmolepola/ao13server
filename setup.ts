import * as THREE from "three";
import * as globals from "./globals";
import * as types from "./types";
import * as utils from "./utils";

export const setupStaticObjects = () => {
  globals.staticGameObjects.length = 0;
  globals.staticGameObjects.push(...staticObjects);
};

// image2-1px4_5m.jpeg
const xMeters = 45;
const xPixels = 10;
const oneMeterInPixels = xPixels / xMeters;
const yPixels = 156;
const width = utils.pixelsToDistanceUnits(xPixels, oneMeterInPixels);
const height = utils.pixelsToDistanceUnits(yPixels, oneMeterInPixels);
const rotationZ = 1;

const obj1 = {
  id: "1000",
  type: types.GameObjectType.Runway,
  mesh: new THREE.Mesh(new THREE.PlaneGeometry(width, height)),
  halfWidth: width * 0.5,
  halfHeight: height * 0.5,
  cosA: Math.cos(-rotationZ),
  sinA: Math.sin(-rotationZ),
};
obj1.mesh.rotation.z = rotationZ;

const staticObjects: types.StaticGameObject[] = [obj1];
