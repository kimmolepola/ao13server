import { DataChannel } from "node-datachannel";
import * as types from "../types";
import * as globals from "../globals";
import { receiveInputData } from "../logic/tick";
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
          globals.sharedObjects.find((x) => x.id === clientId)?.username || "",
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

export const onReceiveInputs = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string
) => {
  const data = decodeControls(msg);
  receiveInputData(clientId, data);
};

export const onReceiveAck = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>,
  clientId: string
) => {
  const sequenceNumber = handleReceiveAck(msg);
  receiveAck(sequenceNumber, clientId);
};

export const sendReliableStringSingleClient = (
  id: string,
  data: types.Queue
) => {
  const stringData = JSON.stringify(data);
  try {
    const client = globals.clients.map[id];
    if (client.stringChannel?.isOpen) {
      client.stringChannel.sendMessage(stringData);
    }
  } catch (error) {
    console.error(
      "Error sending string data reliable single client:",
      id,
      error,
      data
    );
  }
};

export const sendReliableString = (
  data: types.BaseState | types.ChatMessageFromServer
) => {
  const stringData = JSON.stringify(data);
  try {
    globals.clients.array.forEach((x) => {
      if (x.stringChannel?.isOpen()) {
        x.stringChannel.sendMessage(stringData);
      }
    });
  } catch (error) {
    console.error("Error sending string data reliable:", error, data);
  }
};

export const sendUnreliableBinary = (data: types.UnreliableStateBinary) => {
  const clientsArray = globals.clients.array;
  for (let i = 0; i < clientsArray.length; i++) {
    const stateChannel = clientsArray[i].stateChannel;
    try {
      if (stateChannel?.isOpen()) {
        stateChannel.sendMessageBinary(data);
      }
    } catch (error) {
      console.error("Error sending binary data unreliable:", error, data);
    }
  }
};
