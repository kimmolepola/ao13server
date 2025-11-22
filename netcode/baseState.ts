import * as globals from "../globals";
import * as types from "../types";
import { sendReliableString } from "../service/channels";

export const handleSendBaseState = () => {
  const data: types.BaseStateObject[] = globals.sharedGameObjects.map((x) => ({
    id: x.id,
    isPlayer: x.isPlayer,
    username: x.username,
    score: x.score,
    idOverNetwork: x.idOverNetwork,
  }));
  sendReliableString({ type: types.ServerStringDataType.BaseState, data });
};
