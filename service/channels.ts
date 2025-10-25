import * as types from "../types";
import * as globals from "../globals";

export const sendReliable = (
  data: types.BaseState | types.ChatMessageFromServer
) => {
  const stringData = JSON.stringify(data);
  try {
    globals.clients.array.forEach((x) => {
      if (x.reliableChannel?.isOpen()) {
        x.reliableChannel.sendMessage(stringData);
      }
    });
  } catch (error) {
    console.error("Error sending data reliable:", error, data);
  }
};

export const sendReliableBinary = (data: types.ReliableStateBinary) => {
  globals.clients.array.forEach((x) => {
    try {
      if (x.reliableChannelBinary?.isOpen()) {
        x.reliableChannelBinary.sendMessageBinary(data);
      }
    } catch (error) {
      console.error("Error sending binary data reliable:", error, data);
    }
  });
};

export const sendUnreliableBinary = (data: types.UnreliableStateBinary) => {
  globals.clients.array.forEach((x) => {
    try {
      if (x.unreliableChannelBinary?.isOpen()) {
        x.unreliableChannelBinary.sendMessageBinary(data);
      }
    } catch (error) {
      console.error("Error sending binary data unreliable:", error, data);
    }
  });
};
