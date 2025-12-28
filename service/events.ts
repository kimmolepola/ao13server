import * as crypto from "crypto";
import * as THREE from "three";
import * as types from "../types";
import * as globals from "../globals";
import * as parameters from "../parameters";
import { handleRemoveId } from "./objects";

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
        globals.localGameObjects[index] &&
          globals.localGameObjects.splice(index, 1);
      }
      break;
    }
    case types.EventType.Shot: {
      const id = crypto.randomBytes(12).toString("hex");
      const speed = gameEvent.data.speed + parameters.bulletSpeed;
      const type = types.GameObjectType.Bullet as types.GameObjectType.Bullet;
      const geometry = new THREE.BoxGeometry(600, 600, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh?.geometry.computeBoundingBox();
      const timeToLive = 1500;
      const collisions = {};
      mesh?.position.copy(gameEvent.data.mesh.position);
      // mesh?.quaternion.copy(gameEvent.data.mesh.quaternion);
      mesh?.rotation.copy(gameEvent.data.mesh.rotation);
      mesh?.translateY(5000);
      globals.localGameObjects.push({
        id,
        type,
        speed,
        mesh,
        timeToLive,
        collisions,
      });
      break;
    }
    case types.EventType.Collision: {
      gameEvent.data.object.health -= 1;
      if (gameEvent.data.object.health < 0) {
        gameEvent.data.object.health = 0;
      }
      break;
    }

    default:
      break;
  }
};
