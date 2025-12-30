import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";

const isColliding = (
  x: number,
  y: number,
  z: number,
  otherObject: types.GameObject,
  maxDistance: number
) => {
  const dx = x - otherObject.mesh.position.x;
  const dy = y - otherObject.mesh.position.y;
  const dz = z - otherObject.positionZ;

  const distSq = dx * dx + dy * dy + dz * dz;
  const maxDistSq = maxDistance * maxDistance;

  return distSq < maxDistSq;
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

export const handleMovement = (
  delta: number,
  gameObject: types.SharedGameObject
) => {
  const o = gameObject;
  const forceUp = Math.min(delta, o.controlsUp);
  const forceDown = Math.min(delta, o.controlsDown);
  const forceLeft = Math.min(delta, o.controlsLeft);
  const forceRight = Math.min(delta, o.controlsRight);
  const forceD = Math.min(delta, o.controlsD);
  const forceF = Math.min(delta, o.controlsF);
  o.controlsUp -= forceUp;
  o.controlsDown -= forceDown;
  o.controlsLeft -= forceLeft;
  o.controlsRight -= forceRight;
  o.controlsF -= forceF;
  o.controlsD -= forceD;
  o.speed += forceUp * parameters.forceUpToSpeedFactor;
  o.speed -= forceDown * parameters.forceDownToSpeedFactor;
  o.rotationSpeed += forceLeft * parameters.forceLeftOrRightToRotationFactor;
  o.rotationSpeed -= forceRight * parameters.forceLeftOrRightToRotationFactor;
  o.verticalSpeed -= forceD * parameters.forceAscOrDescToVerticalSpeedFactor;
  o.verticalSpeed += forceF * parameters.forceAscOrDescToVerticalSpeedFactor;
  if (o.speed > parameters.maxSpeed) {
    o.speed = parameters.maxSpeed;
  }
  if (o.speed < parameters.minSpeed) {
    o.speed = parameters.minSpeed;
  }
  if (o.rotationSpeed > parameters.maxRotationSpeedAbsolute) {
    o.rotationSpeed = parameters.maxRotationSpeedAbsolute;
  } else if (o.rotationSpeed < -parameters.maxRotationSpeedAbsolute) {
    o.rotationSpeed = -parameters.maxRotationSpeedAbsolute;
  }
  if (o.verticalSpeed > parameters.maxVerticalSpeedAbsolute) {
    o.verticalSpeed = parameters.maxVerticalSpeedAbsolute;
  } else if (o.verticalSpeed < -parameters.maxVerticalSpeedAbsolute) {
    o.verticalSpeed = -parameters.maxVerticalSpeedAbsolute;
  }
  o.mesh.rotateZ(o.rotationSpeed * parameters.rotationFactor * delta);
  o.mesh.translateY(o.speed * parameters.speedFactor * delta);
  o.positionZ += o.verticalSpeed * parameters.verticalSpeedFactor * delta;
  if (!forceLeft && !forceRight) {
    const rs = o.rotationSpeed;
    if (rs !== 0) {
      const decayed = rs * 0.99;
      o.rotationSpeed = Math.abs(decayed) < 0.00001 ? 0 : decayed;
    }
  }
  if (!forceD && !forceF) {
    const vs = o.verticalSpeed;
    if (vs !== 0) {
      const decayed = vs * 0.99;
      o.verticalSpeed = Math.abs(decayed) < 0.00001 ? 0 : decayed;
    }
  }
};
