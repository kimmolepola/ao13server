import THREE from "three";
import * as parameters from "./parameters";

export const encodeAxisValue = (axisValue: number) =>
  axisValue * parameters.positionToNetworkFactor +
  parameters.positionToNetworkAddition;

const wrapToPi = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

export const quaternionWithOnlyZRotationToAngle = (
  quaternion: THREE.Quaternion
) => {
  const angle = 2 * Math.atan2(quaternion.z, quaternion.w); // assuming only Z rotation
  return wrapToPi(angle);
};

const min = -Math.PI;
const max = Math.PI;
const rangeMax = parameters.angleMaxValue;
const encodeAngle = (angle: number) => {
  return Math.round(((angle - min) / (max - min)) * rangeMax);
  // decode angle: encoded / rangeMax * (max - min) + min;
};

export const encodeQuaternionWithOnlyZRotation = (
  quaternion: THREE.Quaternion
) => {
  const angle = quaternionWithOnlyZRotationToAngle(quaternion);
  return encodeAngle(angle);
};
