import * as crypto from "crypto";
import * as THREE from "three";
import * as types from "../types";
import * as globals from "../globals";
import * as parameters from "../parameters";
import { handleRemoveId } from "./objects";

const object3d = globals.object3d;
const axis = globals.axis;

export const gameEventHandler = (gameEvent: types.GameEvent) => {
  switch (gameEvent.type) {
    case types.EventType.HealthZero: {
      setTimeout(() => {
        const obj = gameEvent.data;
        handleRemoveId(obj.id);
      }, 1000);
      break;
    }
    case types.EventType.RemoveLocalObjectIndexes: {
      for (const index of gameEvent.data) {
        globals.localObjects[index] && globals.localObjects.splice(index, 1);
      }
      break;
    }
    case types.EventType.Shot: {
      const o = gameEvent.data.gameObject;
      const localObjects = gameEvent.data.tickLocalObjects;
      if (o.bullets >= 1) {
        object3d.position.set(o.x, o.y, 0);
        object3d.setRotationFromAxisAngle(axis, o.rotationZ);
        object3d.translateY(1);
        const obj = {
          type: types.GameObjectType.Bullet as const,
          x: object3d.position.x,
          y: object3d.position.y,
          rotationZ: o.rotationZ,
          speed: o.speed,
          timeToLive: 1500,
          originId: o.idOverNetwork,
        };
        o.bullets -= Math.min(o.bullets, 1);
        localObjects.push(obj);
      }
      break;
    }
    case types.EventType.Collision: {
      const obj = gameEvent.data[0];
      obj.health -= Math.min(obj.health, 1);
      break;
    }
    case types.EventType.CollisionLocalObject: {
      const obj = gameEvent.data[0];
      obj.health -= Math.min(obj.health, 1);
      // const otherObj = gameEvent.data[1];
      // otherObj.timeToLive = 0;
      break;
    }
    case types.EventType.CollisionStaticObject: {
      const obj = gameEvent.data[0];
      if (obj.speed === 0) {
        obj.fuel < 8200 && (obj.fuel += 0.1);
        obj.fuel > 8200 && (obj.fuel = 8200);
        obj.bullets < 480 && (obj.bullets += 1);
      }
      break;
    }

    default:
      break;
  }
};
