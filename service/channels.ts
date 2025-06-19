import * as types from "../types";
import * as globals from "../globals";

export const sendOrdered = (
  data: types.State | types.ChatMessageFromServer
) => {
  const stringData = JSON.stringify(data);
  try {
    globals.clients.array.forEach((x) => {
      if (x.orderedChannel?.isOpen()) {
        console.log("--send:", data);
        x.orderedChannel.sendMessage(stringData);
      }
    });
  } catch (error) {
    console.error("Error sending ordered data:", error, data);
  }
};

export const sendUnordered = (data: types.Update) => {
  const stringData = JSON.stringify(data);
  globals.clients.array.forEach((x) => {
    try {
      if (x.unorderedChannel?.isOpen()) {
        x.unorderedChannel.sendMessage(stringData);
      }
    } catch (error) {
      console.error("Error sending unordered data:", error, data);
    }
  });
};
