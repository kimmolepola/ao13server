import * as THREE from "three";
import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";

const boxA = new THREE.Box3();
const boxB = new THREE.Box3();

export const detectCollision = (
  sharedGameObject: types.SharedGameObject,
  time: number,
  gameEventHandler: types.GameEventHandler
) => {
  const o1 = sharedGameObject;
  const collisions: types.GameObject[] = [];
  boxA.setFromObject(o1.mesh);

  for (let i = globals.localGameObjects.length - 1; i > -1; i--) {
    const o2 = globals.localGameObjects[i];
    boxB.setFromObject(o2.mesh);
    boxA.intersectsBox(boxB) && collisions.push(o2);
  }

  for (let i = globals.sharedGameObjects.length - 1; i > -1; i--) {
    const o2 = globals.sharedGameObjects[i];
    if (o1.id !== o2.id) {
      // get collision info from the other object
      // if it has already calculated collision between it and this object
      const collisionInfo = o2.collisions[o1.id];
      if (collisionInfo?.time === time) {
        collisionInfo.collision && collisions.push(o2);
      } else {
        // if no collision info from the other object
        // let's calculate if there is a collision
        boxB.setFromObject(o2.mesh);
        const collision = boxA.intersectsBox(boxB);
        collision && collisions.push(o2);

        // let's add the result to this object's collision info
        // so that the other object can use it and we will not calculate it twice
        sharedGameObject.collisions[o2.id] = { time, collision };
      }
    }
  }

  // let's handle the possible collisions between this and other objects
  collisions.length &&
    gameEventHandler({
      type: types.EventType.Collision,
      data: { object: sharedGameObject, otherObjects: collisions },
    });
};

export const checkHealth = (
  remoteGameObject: types.SharedGameObject,
  commonGameEventHandler: types.GameEventHandler
) => {
  if (remoteGameObject.health <= 0) {
    commonGameEventHandler({
      type: types.EventType.HealthZero,
      data: remoteGameObject,
    });
  }
};

export const resetControlValues = (gameObject: types.SharedGameObject) => {
  const o = gameObject;
  o.controlsOverChannelsUp = 0;
  o.controlsOverChannelsDown = 0;
  o.controlsOverChannelsLeft = 0;
  o.controlsOverChannelsRight = 0;
  o.controlsOverChannelsSpace = 0;
  o.controlsOverChannelsD = 0;
  o.controlsOverChannelsF = 0;
};

export const handleShot = (
  delta: number,
  gameObject: types.SharedGameObject,
  commonGameEventHandler: types.GameEventHandler
) => {
  const o = gameObject;
  if (o.controlsSpace) {
    const timeQuantity = o.controlsSpace > delta ? delta : o.controlsSpace;
    o.controlsSpace -= timeQuantity;

    //shooting
    if (o.shotDelay - timeQuantity <= 0) {
      // shoot
      o.shotDelay += parameters.shotDelay;
      commonGameEventHandler({
        type: types.EventType.Shot,
        data: { mesh: o.mesh, speed: o.speed },
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
  const forceUp = o.controlsUp > delta ? delta : o.controlsUp;
  const forceDown = o.controlsDown > delta ? delta : o.controlsDown;
  const forceLeft = o.controlsLeft > delta ? delta : o.controlsLeft;
  const forceRight = o.controlsRight > delta ? delta : o.controlsRight;
  const forceD = o.controlsD > delta ? delta : o.controlsD;
  const forceF = o.controlsF > delta ? delta : o.controlsF;
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
  if (!forceLeft && !forceRight && o.rotationSpeed) {
    if (Math.abs(o.rotationSpeed) < 0.00001) {
      o.rotationSpeed = 0;
    }
    o.rotationSpeed *= 0.99;
  }
  if (!forceD && !forceF && o.verticalSpeed) {
    if (Math.abs(o.verticalSpeed) < 0.00001) {
      o.verticalSpeed = 0;
    }
    o.verticalSpeed *= 0.9;
  }
};
