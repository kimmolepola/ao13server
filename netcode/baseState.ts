import * as globals from "../globals";
import * as types from "../types";
import { sendReliableString } from "../service/channels";

export const handleSendBaseState = (currentState: types.TickStateObject[]) => {
  const sharedObjects: types.BaseStateSharedObject[] = currentState
    .filter((x) => x.exists)
    .map((x) => ({
      id: x.id,
      isPlayer: x.isPlayer,
      username: x.username,
      score: x.score,
      idOverNetwork: x.idOverNetwork,
    }));

  const staticObjects: types.BaseStateStaticObject[] =
    globals.staticObjects.map((x) => ({
      id: x.id,
      type: x.type,
      x: x.mesh.position.x,
      y: x.mesh.position.y,
      rotation: x.mesh.rotation.z,
    }));

  const data = {
    sharedObjects,
    staticObjects,
  };

  sendReliableString({
    type: types.ServerStringDataType.BaseState,
    data,
  });
};
