import * as types from "../types";
import * as globals from "../globals";
import { handleSendQueue } from "../netcode/queue";
import { resetRecentStates } from "../netcode/state";
import { handleSendBaseState } from "../netcode/baseState";
import * as api from "../api";
import * as parameters from "../parameters";

const object3d = globals.object3d;
const axis = globals.axis;

export const gameEventHandler = (gameEvent: types.GameEvent) => {
  switch (gameEvent.type) {
    case types.EventType.RemoveId: {
      handleRemoveId(gameEvent.data);
      break;
    }
    case types.EventType.NewId: {
      const data = gameEvent.data;
      const freeObject = data.currentState.find((x) => !x.exists);
      if (freeObject) {
        resetRecentStates();
        insertNewObject(data.id, freeObject);
        handleSendBaseState(data.currentState);
      } else {
        globals.queue.push(data.id);
        handleSendQueue(data.id);
      }
      break;
    }
    case types.EventType.HealthZero: {
      handleRemoveId(gameEvent.data);
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
          z: o.z,
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
      const obj2 = gameEvent.data[1];
      obj.health -= Math.min(obj.health, 1);
      obj2.health -= Math.min(obj2.health, 1);
      break;
    }
    case types.EventType.CollisionLocalObject: {
      const obj = gameEvent.data[0];
      obj.health -= Math.min(obj.health, 1);
      const otherObj = gameEvent.data[1];
      otherObj.timeToLive = 0;
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

const savePlayerData = async (currentState: types.TickStateObject[]) => {
  const data =
    currentState.reduce((acc: types.PlayerState[], cur) => {
      if (cur.isPlayer) {
        acc.push({ clientId: cur.id, score: cur.score });
      }
      return acc;
    }, []) || [];
  api.postSaveGameState(data);
};

const handleRemoveId = (data: {
  id: string;
  currentState: types.TickStateObject[];
}) => {
  const obj = data.currentState.find((x) => x.id === data.id);
  if (obj) {
    obj.exists = false;
    savePlayerData(data.currentState);
    handleSendBaseState(data.currentState);
  }
};

const idFailure = (id: string) => {
  console.error("Failed to add new object, id length not 32:", id);
};

const dataFailure = (id: string) => {
  console.error("Failed to add new object, no initialGameObject. Id: ", id);
};

const insertNewObject = async (
  id: string,
  freeObject: types.TickStateObject
) => {
  if (id.length !== 32) return idFailure(id);

  const { data } = await api.getGameObject(id);
  if (!data) return dataFailure(id);

  const o = freeObject;
  o.exists = true;
  o.currentLoopId = -1;
  o.score = data.score || 0;
  o.isPlayer = data.isPlayer || false;
  o.username = data.username = "";
  o.id = id;
  o.type = types.GameObjectType.Fighter as const;
  o.speed = parameters.initialSpeed;
  o.fuel = parameters.maxFuelKg;
  o.bullets = 480;
  o.rotationSpeed = 0;
  o.verticalSpeed = 0;
  o.x = 0;
  o.y = 0;
  o.z = 1000;
  o.shotDelay = 0;
  o.health = 100;
  o.rotationZ = 0;
};
