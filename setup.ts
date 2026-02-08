import * as THREE from "three";
import * as globals from "./globals";
import * as types from "./types";
import * as utils from "./utils";
import * as parameters from "./parameters";

export const setupStaticObjects = () => {
  globals.staticObjects.length = 0;
  globals.staticObjects.push(...staticObjects);
};

// image2-1px4_5m.jpeg
const xMeters = 46;
const xPixels = 165;
const oneMeterInPixels = xPixels / xMeters;
const yPixels = 6950;
const width = utils.pixelsToDistanceUnits(xPixels, oneMeterInPixels);
const height = utils.pixelsToDistanceUnits(yPixels, oneMeterInPixels);

const obj1RotationZ = 1;
const obj1 = {
  id: "1000",
  type: types.GameObjectType.Runway,
  mesh: new THREE.Mesh(new THREE.PlaneGeometry(width, height)),
  halfWidth: width * 0.5,
  halfHeight: height * 0.5,
  cosA: Math.cos(-obj1RotationZ),
  sinA: Math.sin(-obj1RotationZ),
};
obj1.mesh.rotation.z = obj1RotationZ;

const obj2RotationZ = 2;
const obj2 = {
  id: "1001",
  type: types.GameObjectType.Runway,
  mesh: new THREE.Mesh(new THREE.PlaneGeometry(width, height)),
  halfWidth: width * 0.5,
  halfHeight: height * 0.5,
  cosA: Math.cos(-obj2RotationZ),
  sinA: Math.sin(-obj2RotationZ),
};
obj2.mesh.position.x = 500;
obj2.mesh.position.y = 1000;
obj2.mesh.rotation.z = obj2RotationZ;

const staticObjects: types.StaticGameObject[] = [obj1, obj2];
