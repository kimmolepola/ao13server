import { startConnection } from "./connection";
import { run } from "./service/service";
import * as globals from "./globals";
import dotenv from "dotenv";
import { setupStaticObjects } from "./setup";
import * as types from "./types";
import { receiveEvent } from "./logic/tick";

dotenv.config();

const onChannelsChanged = (peerId: string) => {
  const client = globals.clients.map[peerId];
  if (client && client.stringChannel?.isOpen()) {
    console.log(`Connection open for peer ${peerId}`);
    // handleNewId(peerId);
    receiveEvent({ type: types.ReceivedEventType.NewId, data: peerId });
  } else {
    console.log(`Connection closed for peer ${peerId}`);
    // handleRemoveId(peerId);
    receiveEvent({ type: types.ReceivedEventType.RemoveId, data: peerId });
  }
};

setupStaticObjects();
startConnection(onChannelsChanged);
run();
