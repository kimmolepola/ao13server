import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";

const isColliding = (
  x: number,
  y: number,
  z: number,
  otherObject: types.TickStateObject,
  maxDistance: number
) => {
  const dx = x - otherObject.x;
  const dy = y - otherObject.y;
  const dz = z - otherObject.z;

  const distSq = dx * dx + dy * dy + dz * dz;
  const maxDistSq = maxDistance * maxDistance;

  return distSq < maxDistSq;
};

// Swept sphere check: minimum distance from target point to bullet's path segment this tick.
const isCollidingSwept = (
  x: number,
  y: number,
  z: number,
  bullet: types.TickLocalObject,
  maxDistance: number
) => {
  const dz = z - bullet.z;
  const maxDistSq = maxDistance * maxDistance;
  if (dz * dz >= maxDistSq) return false;

  const ax = bullet.prevX,
    ay = bullet.prevY;
  const { segDx, segDy, segLenSq } = bullet;

  let xyDistSq: number;
  if (segLenSq === 0) {
    const px = x - ax,
      py = y - ay;
    xyDistSq = px * px + py * py;
  } else {
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * segDx + (y - ay) * segDy) / segLenSq)
    );
    const cx = ax + t * segDx,
      cy = ay + t * segDy;
    const px = x - cx,
      py = y - cy;
    xyDistSq = px * px + py * py;
  }

  return xyDistSq + dz * dz < maxDistSq;
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
  objIndex: number, // idOverNetwork
  gameObject: types.TickStateObject,
  sharedObjects: types.TickStateObject[],
  localObjects: types.TickLocalObject[],
  gameEventHandler: types.GameEventHandler
): boolean => {
  const x = gameObject.x;
  const y = gameObject.y;
  const z = gameObject.z;

  for (let i = localObjects.length - 1; i > -1; i--) {
    const localGameObject = localObjects[i];
    if (
      isCollidingSwept(
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

  for (let i = 0; i < objIndex; i++) {
    const sharedGameObject = sharedObjects[i];
    if (
      sharedGameObject !== gameObject &&
      sharedGameObject.exists &&
      isColliding(x, y, z, sharedGameObject, parameters.collisionMaxDistance)
    ) {
      gameEventHandler({
        type: types.EventType.Collision,
        data: [gameObject, sharedGameObject],
      });
    }
  }

  let onRunway = false;
  for (let i = globals.staticObjects.length - 1; i > -1; i--) {
    const staticGameObject = globals.staticObjects[i];
    if (isCollidingPlane(x, y, staticGameObject)) {
      if (staticGameObject.type === types.GameObjectType.Runway) {
        onRunway = true;
      }
      gameEventHandler({
        type: types.EventType.CollisionStaticObject,
        data: [gameObject, staticGameObject],
      });
    }
  }
  return onRunway;
};
