import * as parameters from "./parameters";

export const encodeAxisValue = (axisValue: number) =>
  (axisValue + parameters.positionToNetworkAddition) *
  parameters.positionToNetworkFactor;

const wrapToPi = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

// const quaternionWithOnlyZRotationToAngle = (quaternion: THREE.Quaternion) => {
//   const angle = 2 * Math.atan2(quaternion.z, quaternion.w); // assuming only Z rotation
//   return wrapToPi(angle);
// };

const min = -Math.PI;
const max = Math.PI;
const rangeMax = parameters.angleMaxValue;
const encodeAngle = (angle: number) => {
  return Math.round(((angle - min) / (max - min)) * rangeMax);
  // decode angle: encoded / rangeMax * (max - min) + min;
};

// export const encodeQuaternionWithOnlyZRotation = (
//   quaternion: THREE.Quaternion
// ) => {
//   const angle = quaternionWithOnlyZRotationToAngle(quaternion);
//   return encodeAngle(angle);
// };

export const encodeRotationZ = (angle: number) => {
  const wrapped = wrapToPi(angle);
  return encodeAngle(wrapped);
};

export function decodeJWT(token: string) {
  // Split the token into parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT");
  }

  // Base64URL decode helper
  function base64UrlDecode(str: string) {
    // Replace URL-safe chars
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    // Pad with '=' if needed
    while (str.length % 4) {
      str += "=";
    }
    return atob(str);
  }

  // Decode header and payload
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const parsedPayload = JSON.parse(base64UrlDecode(parts[1]));
  if (
    !parsedPayload ||
    typeof parsedPayload !== "object" ||
    typeof parsedPayload?.exp !== "number"
  ) {
    return undefined;
  }
  const roleKey = Object.keys(parsedPayload).find((x) => x.includes("role"));
  const idKey = Object.keys(parsedPayload).find((x) =>
    x.includes("nameidentifier")
  );
  const payload = {
    aud: parsedPayload.aud,
    exp: parsedPayload.exp * 1000,
    role: roleKey ? parsedPayload[roleKey] : undefined,
    id: idKey ? parsedPayload[idKey] : undefined,
    iss: parsedPayload.iss,
  };
  const signature = parts[2]; // raw signature string

  return { header, payload, signature };
}
