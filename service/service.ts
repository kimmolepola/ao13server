import { DataChannel, PeerConnection } from "node-datachannel";
import * as types from "../types";
import * as globals from "../globals";
import { startLoop } from "../loop/loop";
import { sendOrdered } from "./channels";
import { handleReceiveControlsData } from "./objects";
import { gameEventHandler } from "./events";

export const onMessage = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string,
  dc: DataChannel
) => {
  console.log("--msg--", clientId, msg);

  if (msg === "ping") {
    dc.sendMessage("pong");
    return;
  }
  const data: types.ClientData = JSON.parse(msg as string);

  switch (data.type) {
    case types.ClientDataType.Controls: {
      handleReceiveControlsData(clientId, data);
      break;
    }
    case types.ClientDataType.ChatMessage_Client: {
      const message = {
        id: clientId + Date.now().toString(),
        text: data.text,
        userId: clientId,
        username:
          globals.sharedGameObjects.find((x) => x.id === clientId)?.username ||
          "",
      };
      sendOrdered({
        ...message,
        type: types.ServerDataType.ChatMessage_Server,
      });
      break;
    }
    default:
      break;
  }
};

export const run = () => {
  startLoop(gameEventHandler);
};
