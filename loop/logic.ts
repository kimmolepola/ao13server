import * as THREE from "three";
import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import { encodeQuaternionWithOnlyZRotation } from "../utils";

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

export const gatherUnreliableStateDataBinary = (
  view: DataView,
  totalOffset: number,
  gameObject: types.SharedGameObject
): number => {
  const o = gameObject;
  const recentObjectState = globals.recentlySentState.value?.data[o.id];
  let providedValues1to8 = 0b00000000;
  let providedValues9to16 = 0b00000000;
  // 2 bytes for provided values info
  let localOffset = 2;

  if (o.score !== recentObjectState?.score) {
    providedValues1to8 |= 0b00000001; // 1st bit
    view.setUint32(totalOffset + localOffset, o.score);
    localOffset += 4; // 6 bytes #1
  }

  if (o.health !== recentObjectState?.health) {
    providedValues1to8 |= 0b00000010; // 2nd bit
    view.setUint8(totalOffset + localOffset, o.health);
    localOffset += 1; // 7 bytes #2
  }

  const up = Math.round(o.controlsOverChannelsUp);
  if (up) {
    providedValues1to8 |= 0b00000100; // 3rd bit
    view.setUint8(totalOffset + localOffset, up);
    localOffset += 1; // 8 bytes #3
  }

  const down = Math.round(o.controlsOverChannelsDown);
  if (down) {
    providedValues1to8 |= 0b00001000; // 4th bit
    view.setUint8(totalOffset + localOffset, down);
    localOffset += 1; // 9 bytes #4
  }

  const left = Math.round(o.controlsOverChannelsLeft);
  if (left) {
    providedValues1to8 |= 0b00010000; // 5th bit
    view.setUint8(totalOffset + localOffset, left);
    localOffset += 1; // 10 bytes #5
  }

  const right = Math.round(o.controlsOverChannelsRight);
  if (right) {
    providedValues1to8 |= 0b00100000; // 6th bit
    view.setUint8(totalOffset + localOffset, right);
    localOffset += 1; // 11 bytes #6
  }

  const space = Math.round(o.controlsOverChannelsSpace);
  if (space) {
    providedValues1to8 |= 0b01000000; // 7th bit
    view.setUint8(totalOffset + localOffset, space);
    localOffset += 1; // 12 bytes #7
  }

  const d = Math.round(o.controlsOverChannelsD);
  if (d) {
    providedValues1to8 |= 0b10000000; // 8th bit
    view.setUint8(totalOffset + localOffset, d);
    localOffset += 1; // 13 bytes #8
  }

  const f = Math.round(o.controlsOverChannelsF);
  if (f) {
    providedValues9to16 |= 0b00000001; // 1st bit of 2nd byte
    view.setUint8(totalOffset + localOffset, f);
    localOffset += 1; // 14 bytes #9
  }

  const rotationSpeed = Math.round(o.rotationSpeed);
  if (rotationSpeed !== recentObjectState?.rotationSpeed) {
    providedValues9to16 |= 0b00000010; // 2nd bit of 2nd byte
    view.setInt8(totalOffset + localOffset, rotationSpeed);
    localOffset += 1; // 15 bytes #10
  }

  const verticalSpeed = Math.round(o.verticalSpeed);
  if (verticalSpeed !== recentObjectState?.verticalSpeed) {
    providedValues9to16 |= 0b00000100; // 3nd bit of 2nd byte
    view.setInt8(totalOffset + localOffset, verticalSpeed);
    localOffset += 1; // 16 bytes #11
  }

  if (o.speed !== recentObjectState?.speed) {
    providedValues9to16 |= 0b00001000; // 4th bit of 2nd byte
    view.setUint16(
      totalOffset + localOffset,
      Math.round(o.speed * parameters.speedToNetworkFactor)
    );
    localOffset += 2; // 18 bytes #12
  }

  if (o.mesh.position.x !== recentObjectState?.position.x) {
    providedValues9to16 |= 0b00010000; // 5th bit of 2nd byte
    view.setFloat32(totalOffset + localOffset, o.mesh?.position.x || 0);
    localOffset += 4; // 22 bytes #13
  }

  if (o.mesh.position.y !== recentObjectState?.position.y) {
    providedValues9to16 |= 0b00100000; // 6th bit of 2nd byte
    view.setFloat32(totalOffset + localOffset, o.mesh?.position.y || 0);
    localOffset += 4; // 26 bytes #14
  }

  if (o.positionZ !== recentObjectState?.position.z) {
    providedValues9to16 |= 0b01000000; // 7th bit of 2nd byte
    view.setFloat32(totalOffset + localOffset, o.positionZ || 0);
    localOffset += 4; // 30 bytes #15
  }

  if (
    o.mesh.quaternion.z !== o.previousSend.quaternionZ ||
    o.mesh.quaternion.w !== o.previousSend.quaternionW
  ) {
    const angleZ = encodeQuaternionWithOnlyZRotation(o.mesh.quaternion);
    if (angleZ !== recentObjectState?.angleZ) {
      providedValues9to16 |= 0b10000000; // 8th bit of 2nd byte
      view.setUint16(totalOffset + localOffset, angleZ);
      localOffset += 2; // 32 bytes #16
    }
  }

  // if (o.mesh?.quaternion.x !== recentObjectState?.quaternion.x) {
  //   providedValues9to16 |= 0b00010000; // 5th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.x || 0);
  //   localOffset += 4; // 31 bytes #13
  // }

  // if (o.mesh?.quaternion.y !== recentObjectState?.quaternion.y) {
  //   providedValues9to16 |= 0b00100000; // 6th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.y || 0);
  //   localOffset += 4; // 35 bytes #14
  // }

  // if (o.mesh?.quaternion.z !== recentObjectState?.quaternion.z) {
  //   providedValues9to16 |= 0b01000000; // 7th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.z || 0);
  //   localOffset += 4; // 39 bytes #15
  // }

  // if (o.mesh?.quaternion.w !== recentObjectState?.quaternion.w) {
  //   providedValues9to16 |= 0b10000000; // 8th bit of 2nd byte
  //   view.setFloat32(totalOffset + localOffset, o.mesh?.quaternion.w || 0);
  //   localOffset += 4; // 43 bytes #16
  // }

  view.setUint8(totalOffset, providedValues1to8);
  view.setUint8(totalOffset + 1, providedValues9to16);

  // offset max total = 32 bytes
  if (localOffset > types.unreliableStateSingleObjectMaxBytes) {
    console.warn(
      `Warning: Game object data exceeded the maximum size of ${types.unreliableStateSingleObjectMaxBytes} bytes. Actual size: ${localOffset} bytes.`
    );
  }
  return totalOffset + localOffset;
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
