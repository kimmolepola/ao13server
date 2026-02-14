import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";

const isColliding = (
  x: number,
  y: number,
  z: number,
  otherObject: types.TickLocalObject | types.TickStateObject,
  maxDistance: number
) => {
  const dx = x - otherObject.x;
  const dy = y - otherObject.y;
  const dz = z - otherObject.z;

  const distSq = dx * dx + dy * dy + dz * dz;
  const maxDistSq = maxDistance * maxDistance;

  return distSq < maxDistSq;
};

const isCollidingPlane = (
  x: number,
  y: number,
  otherObject: types.StaticGameObject
) => {
  const cx = otherObject.mesh.position.x;
  const cy = otherObject.mesh.position.y;
  const cosA = otherObject.cosA;
  const sinA = otherObject.sinA;
  const hx = otherObject.halfWidth;
  const hy = otherObject.halfHeight;

  // translate into rectangle space
  const dx = x - cx;
  const dy = y - cy;

  // rotate by inverse Z rotation
  const localX = dx * cosA - dy * sinA;
  const localY = dx * sinA + dy * cosA;

  // AABB check
  const inside = localX >= -hx && localX <= hx && localY >= -hy && localY <= hy;

  return inside;
};

export const checkCollisions = (
  loopId: number,
  gameObject: types.TickStateObject,
  sharedObjects: types.TickStateObject[],
  localObjects: types.TickLocalObject[],
  gameEventHandler: types.GameEventHandler
) => {
  const x = gameObject.x;
  const y = gameObject.y;
  const z = gameObject.z;

  for (let i = localObjects.length - 1; i > -1; i--) {
    const localGameObject = localObjects[i];
    if (
      isColliding(
        x,
        y,
        z,
        localGameObject,
        parameters.collisionMaxDistanceLocalObject
      )
    ) {
      gameEventHandler({
        type: types.EventType.CollisionLocalObject,
        data: [gameObject, localGameObject],
      });
    }
  }

  for (let i = sharedObjects.length - 1; i > -1; i--) {
    const sharedGameObject = sharedObjects[i];
    if (
      sharedGameObject !== gameObject &&
      sharedGameObject.exists &&
      sharedGameObject.currentLoopId === loopId &&
      isColliding(x, y, z, sharedGameObject, parameters.collisionMaxDistance)
    ) {
      gameEventHandler({
        type: types.EventType.Collision,
        data: [gameObject, sharedGameObject],
      });
    }
  }

  for (let i = globals.staticObjects.length - 1; i > -1; i--) {
    const staticGameObject = globals.staticObjects[i];
    if (isCollidingPlane(x, y, staticGameObject)) {
      gameEventHandler({
        type: types.EventType.CollisionStaticObject,
        data: [gameObject, staticGameObject],
      });
    }
  }
};
