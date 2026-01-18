import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";

const isColliding = (
  x: number,
  y: number,
  z: number,
  otherObject: types.LocalGameObject | types.SharedGameObject,
  maxDistance: number
) => {
  const dx = x - otherObject.mesh.position.x;
  const dy = y - otherObject.mesh.position.y;
  const dz = z - otherObject.positionZ;

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

export const detectCollision = (
  gameObject: types.SharedGameObject,
  gameEventHandler: types.GameEventHandler
) => {
  const x = gameObject.mesh.position.x;
  const y = gameObject.mesh.position.y;
  const z = gameObject.positionZ;

  for (let i = globals.localGameObjects.length - 1; i > -1; i--) {
    const localGameObject = globals.localGameObjects[i];
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

  for (let i = globals.sharedGameObjects.length - 1; i > -1; i--) {
    const sharedGameObject = globals.sharedGameObjects[i];
    if (
      sharedGameObject !== gameObject &&
      isColliding(x, y, z, sharedGameObject, parameters.collisionMaxDistance)
    ) {
      gameEventHandler({
        type: types.EventType.Collision,
        data: [gameObject, sharedGameObject],
      });
    }
  }

  for (let i = globals.staticGameObjects.length - 1; i > -1; i--) {
    const staticGameObject = globals.staticGameObjects[i];
    if (isCollidingPlane(x, y, staticGameObject)) {
      gameEventHandler({
        type: types.EventType.CollisionStaticObject,
        data: [gameObject, staticGameObject],
      });
    }
  }
};

export const checkHealth = (
  gameObject: types.SharedGameObject,
  commonGameEventHandler: types.GameEventHandler
) => {
  if (gameObject.health <= 0) {
    commonGameEventHandler({
      type: types.EventType.HealthZero,
      data: gameObject,
    });
  }
};

export const refreshControlValues = (gameObject: types.SharedGameObject) => {
  const o = gameObject;
  const intrvl = parameters.unreliableStateInterval;
  o.controlsOverChannelsUp -= Math.min(intrvl, o.controlsOverChannelsUp);
  o.controlsOverChannelsDown -= Math.min(intrvl, o.controlsOverChannelsDown);
  o.controlsOverChannelsLeft -= Math.min(intrvl, o.controlsOverChannelsLeft);
  o.controlsOverChannelsRight -= Math.min(intrvl, o.controlsOverChannelsRight);
  o.controlsOverChannelsSpace -= Math.min(intrvl, o.controlsOverChannelsSpace);
  o.controlsOverChannelsD -= Math.min(intrvl, o.controlsOverChannelsD);
  o.controlsOverChannelsF -= Math.min(intrvl, o.controlsOverChannelsF);
};

export const handleShot = (
  delta: number,
  gameObject: types.SharedGameObject,
  gameEventHandler: types.GameEventHandler
) => {
  const o = gameObject;
  if (o.controlsSpace) {
    const timeQuantity = Math.min(delta, o.controlsSpace);
    o.controlsSpace -= timeQuantity;

    //shooting
    if (o.shotDelay <= timeQuantity) {
      // shoot
      o.shotDelay += parameters.shotDelay;
      gameEventHandler({
        type: types.EventType.Shot,
        data: gameObject,
      });
    }
  }
  o.shotDelay -= Math.min(delta, o.shotDelay);
};

export const handleLocalObject = (
  delta: number,
  gameObject: types.LocalGameObject
) => {
  const o = gameObject;
  o.mesh.translateY(o.speed * parameters.speedFactor * delta);
  o.speed *= parameters.bulletSpeedReductionFactor;
  o.timeToLive -= delta;
  return o.timeToLive < 0;
};

export const handleMovement = (delta: number, o: types.SharedGameObject) => {
  const p = parameters;

  //
  // 1. INPUT → VELOCITY
  //
  const up = o.fuel ? Math.min(o.controlsUp, delta) : 0;
  const down = o.fuel ? Math.min(o.controlsDown, delta) : delta;
  const left = Math.min(o.controlsLeft, delta);
  const right = Math.min(o.controlsRight, delta);
  const d = Math.min(o.controlsD, delta);
  const f = Math.min(o.controlsF, delta);

  o.controlsUp -= up;
  o.controlsDown -= down;
  o.controlsLeft -= left;
  o.controlsRight -= right;
  o.controlsD -= d;
  o.controlsF -= f;

  o.speed += up * p.forceUpToSpeedFactor;
  o.speed -= down * p.forceDownToSpeedFactor;

  o.rotationSpeed += left * p.forceLeftOrRightToRotationFactor;
  o.rotationSpeed -= right * p.forceLeftOrRightToRotationFactor;

  o.verticalSpeed -= d * p.forceAscOrDescToVerticalSpeedFactor;
  o.verticalSpeed += f * p.forceAscOrDescToVerticalSpeedFactor;

  //
  // 2. CLAMP VELOCITIES
  //
  o.speed = Math.min(Math.max(o.speed, p.minSpeed), p.maxSpeed);
  o.rotationSpeed = Math.min(
    Math.max(o.rotationSpeed, -p.maxRotationSpeedAbsolute),
    p.maxRotationSpeedAbsolute
  );
  o.verticalSpeed = Math.min(
    Math.max(o.verticalSpeed, -p.maxVerticalSpeedAbsolute),
    p.maxVerticalSpeedAbsolute
  );

  //
  // 3. APPLY DAMPING (time‑based exponential)
  //
  if (!left && !right) {
    const decay = Math.exp(-p.rotationDecay * delta);
    o.rotationSpeed *= decay;
    if (Math.abs(o.rotationSpeed) < 0.00001) o.rotationSpeed = 0;
  }

  if (!d && !f) {
    const decay = Math.exp(-p.verticalDecay * delta);
    o.verticalSpeed *= decay;
    if (Math.abs(o.verticalSpeed) < 0.00001) o.verticalSpeed = 0;
  }

  //
  // 4. INTEGRATE VELOCITIES → TRANSFORM
  //
  const angle = o.rotationSpeed * p.rotationFactor * delta;
  const distance = o.speed * p.speedFactor * delta;
  const distanceZ = o.verticalSpeed * p.verticalSpeedFactor * delta;
  o.mesh.rotateZ(angle);
  o.mesh.translateY(distance);
  o.positionZ += distanceZ;

  if (o.mesh.position.x > parameters.maxWorldCoordinateValue) {
    o.mesh.position.x = parameters.maxWorldCoordinateValue;
  }
  if (o.mesh.position.x < parameters.minWorldCoordinateValue) {
    o.mesh.position.x = parameters.minWorldCoordinateValue;
  }
  if (o.mesh.position.y > parameters.maxWorldCoordinateValue) {
    o.mesh.position.y = parameters.maxWorldCoordinateValue;
  }
  if (o.mesh.position.y < parameters.minWorldCoordinateValue) {
    o.mesh.position.y = parameters.minWorldCoordinateValue;
  }

  o.fuel -= Math.min(o.fuel, o.speed * delta * 0.000001);
};
