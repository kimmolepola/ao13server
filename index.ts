import { startConnection } from "./connection";
import { run } from "./service/service";
import { handleNewId, handleRemoveId } from "./service/objects";
import * as globals from "./globals";
import { startIntervals } from "./service/intervals";

const onChannelsChanged = (peerId: string) => {
  const client = globals.clients.map[peerId];
  if (client && client.orderedChannel?.isOpen()) {
    console.log(`Connection open for peer ${peerId}`);
    handleNewId(peerId);
  } else {
    console.log(`Connection closed for peer ${peerId}`);
    handleRemoveId(peerId);
  }
};

startConnection(onChannelsChanged);
startIntervals();
run();
