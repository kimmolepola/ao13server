import * as types from "../types";
import * as globals from "../globals";

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

export const sendReliableBinary = (data: types.ReliableStateBinary) => {
  globals.clients.array.forEach((x) => {
    try {
      if (x.controlsChannel?.isOpen()) {
        x.controlsChannel.sendMessageBinary(data);
      }
    } catch (error) {
      console.error("Error sending binary data reliable:", error, data);
    }
  });
};

export const sendUnreliableBinary = (data: types.UnreliableStateBinary) => {
  globals.clients.array.forEach((x) => {
    try {
      if (x.stateChannel?.isOpen()) {
        x.stateChannel.sendMessageBinary(data);
      }
    } catch (error) {
      console.error("Error sending binary data unreliable:", error, data);
    }
  });
};
