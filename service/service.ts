import { DataChannel } from "node-datachannel";
import * as types from "../types";
import * as globals from "../globals";
import { startLoop } from "../loop/loop";
import { sendReliable } from "./channels";
import { handleReceiveControlsData } from "./objects";
import { gameEventHandler } from "./events";
import { receiveBinaryMessage } from "../netcode/message";

export const onMessage = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string,
  dc: DataChannel
) => {
  if (msg === "ping") {
    dc.sendMessage("pong");
    return;
  }
  const data: types.ClientStringData = JSON.parse(msg as string);

  switch (data.type) {
    case types.ClientStringDataType.ChatMessage_Client: {
      const message = {
        id: clientId + Date.now().toString(),
        text: data.text,
        userId: clientId,
        username:
          globals.sharedGameObjects.find((x) => x.id === clientId)?.username ||
          "",
      };
      sendReliable({
        ...message,
        type: types.ServerStringDataType.ChatMessage_Server,
      });
      break;
    }
    default:
      break;
  }
};

export const onMessageBinary = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string
) => {
  const data = receiveBinaryMessage(msg);
  handleReceiveControlsData(clientId, data);
};

export const run = () => {
  startLoop(gameEventHandler);
};
