import { DataChannel } from "node-datachannel";
import * as types from "../types";
import * as globals from "../globals";
import { startLoop } from "../loop/loop";
import { sendReliable } from "./channels";
import { handleReceiveControlsData } from "./objects";
import { gameEventHandler } from "./events";

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
  const buffer = msg as Buffer<ArrayBufferLike>;
  const dataView = new DataView(buffer.buffer);

  const providedValues = dataView.getUint8(0);
  let offset = 1;

  const data = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    space: 0,
    d: 0,
    f: 0,
  };

  if (providedValues & 0b00000001) {
    data.up = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00000010) {
    data.down = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00000100) {
    data.left = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00001000) {
    data.right = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00010000) {
    data.space = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00100000) {
    data.d = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b01000000) {
    data.f = dataView.getUint8(offset);
    offset += 1;
  }

  handleReceiveControlsData(clientId, data);
};

export const run = () => {
  startLoop(gameEventHandler);
};
