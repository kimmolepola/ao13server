import * as crypto from "crypto";
import * as THREE from "three";
import * as types from "../types";
import * as globals from "../globals";
import { handleSendState, savePlayerData } from "./objects";
import { sendOrdered } from "./channels";

export const gameEventHandler = (gameEvent: types.GameEvent) => {
  switch (gameEvent.type) {
    case types.EventType.HealthZero: {
      savePlayerData();
      const obj = gameEvent.data;
      globals.sharedGameObjects.splice(globals.sharedGameObjects.indexOf(obj));
      handleSendState(sendOrdered);
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
      const speed = gameEvent.data.speed + 2;
      const type = types.GameObjectType.Bullet as types.GameObjectType.Bullet;
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mesh = new THREE.Mesh(geometry);
      mesh?.geometry.computeBoundingBox();
      const timeToLive = 1500;
      const collisions = {};
      mesh?.position.copy(gameEvent.data.mesh.position);
      mesh?.quaternion.copy(gameEvent.data.mesh.quaternion);
      mesh?.translateY(1);
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
