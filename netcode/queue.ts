import * as globals from "../globals";
import * as types from "../types";
import { sendReliableStringSingleClient } from "../service/channels";

export const handleSendQueue = (id: string) => {
  sendReliableStringSingleClient(id, {
    type: types.ServerStringDataType.Queue,
    queuePosition: globals.queue.indexOf(id),
  });
};
