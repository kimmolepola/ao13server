import * as globals from "../globals";
import * as types from "../types";
import { sendReliable } from "../service/channels";

export const handleSendBaseState = () => {
  const data: types.BaseStateObject[] = globals.sharedGameObjects.map((x) => ({
    id: x.id,
    isPlayer: x.isPlayer,
    username: x.username,
  }));
  sendReliable({ type: types.ServerStringDataType.BaseState, data });
};
