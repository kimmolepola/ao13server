import { DataChannel } from "node-datachannel";
import * as types from "../types";
import * as globals from "../globals";
import { startLoop } from "../loop/loop";
import { sendReliableString } from "./channels";
import { receiveControlsData } from "./objects";
import { gameEventHandler } from "./events";
import { decodeControls } from "../netcode/controls";
import { handleReceiveAck } from "../netcode/ack";
import { receiveAck } from "../netcode/state";

export const onReceiveString = (
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
      sendReliableString({
        ...message,
        type: types.ServerStringDataType.ChatMessage_Server,
      });
      break;
    }
    default:
      break;
  }
};

export const onReceiveControls = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string
) => {
  const data = decodeControls(msg);
  receiveControlsData(clientId, data);
};

export const onReceiveAck = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string
) => {
  const sequenceNumber = handleReceiveAck(msg);
  receiveAck(sequenceNumber, clientId);
};

export const run = () => {
  startLoop(gameEventHandler);
};
