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

export const gatherUpdateData = (
  updateData: { [id: string]: types.UpdateObject },
  o: types.SharedGameObject
) => {
  const data = updateData;
  data[o.id] = {
    uScore: o.score,
    uHealth: o.health,
    uControlsUp: o.controlsOverChannelsUp,
    uControlsDown: o.controlsOverChannelsDown,
    uControlsLeft: o.controlsOverChannelsLeft,
    uControlsRight: o.controlsOverChannelsRight,
    uControlsSpace: o.controlsOverChannelsSpace,
    uRotationSpeed: o.rotationSpeed,
    uSpeed: o.speed,
    uPositionX: o.mesh?.position.x || 0,
    uPositionY: o.mesh?.position.y || 0,
    uPositionZ: o.mesh?.position.z || 0,
    uQuaternionX: o.mesh?.quaternion.x || 0,
    uQuaternionY: o.mesh?.quaternion.y || 0,
    uQuaternionZ: o.mesh?.quaternion.z || 0,
    uQuaternionW: o.mesh?.quaternion.w || 0,
  };
};

export const resetControlValues = (gameObject: types.SharedGameObject) => {
  const o = gameObject;
  o.controlsOverChannelsUp = 0;
  o.controlsOverChannelsDown = 0;
  o.controlsOverChannelsLeft = 0;
  o.controlsOverChannelsRight = 0;
  o.controlsOverChannelsSpace = 0;
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

export const handleMovement = (
  delta: number,
  gameObject: types.SharedGameObject,
  object3D: THREE.Object3D
) => {
  const o = gameObject;
  const forceUp = o.controlsUp > delta ? delta : o.controlsUp;
  const forceDown = o.controlsDown > delta ? delta : o.controlsDown;
  const forceLeft = o.controlsLeft > delta ? delta : o.controlsLeft;
  const forceRight = o.controlsRight > delta ? delta : o.controlsRight;
  o.controlsUp -= forceUp;
  o.controlsDown -= forceDown;
  o.controlsLeft -= forceLeft;
  o.controlsRight -= forceRight;
  o.speed += forceUp * parameters.acceleration;
  o.speed -= forceDown * parameters.acceleration;
  o.rotationSpeed += forceLeft * parameters.rotationAcceleration;
  o.rotationSpeed -= forceRight * parameters.rotationAcceleration;
  if (o.speed > parameters.maxSpeed) {
    o.speed = parameters.maxSpeed;
  }
  if (o.speed < parameters.minSpeed) {
    o.speed = parameters.minSpeed;
  }
  if (o.rotationSpeed > parameters.maxRotationSpeed) {
    o.rotationSpeed = parameters.maxRotationSpeed;
  }
  if (o.rotationSpeed < -parameters.maxRotationSpeed) {
    o.rotationSpeed = -parameters.maxRotationSpeed;
  }
  object3D.rotateZ(o.rotationSpeed * delta);
  object3D.translateY((o.speed * delta) / 100);
  if (!forceLeft && !forceRight && o.rotationSpeed) {
    if (Math.abs(o.rotationSpeed) < 0.00001) {
      o.rotationSpeed = 0;
    }
    o.rotationSpeed *= 0.99;
  }
};
