import { startConnection } from "./connection";
import { run } from "./service/service";
import { handleNewId, handleRemoveId } from "./service/objects";
import * as globals from "./globals";
import { startIntervals } from "./service/intervals";

const onChannelsChanged = (peerId: string) => {
  const client = globals.clients.map[peerId];
  if (
    client &&
    client.orderedChannel?.isOpen() &&
    client.unorderedChannel?.isOpen()
  ) {
    console.log(`Both channels are open for peer ${peerId}`);
    handleNewId(peerId);
  } else {
    console.log(`One or both channels are closed for peer ${peerId}`);
    handleRemoveId(peerId);
  }
};

startConnection(onChannelsChanged);
startIntervals();
run();

setInterval(() => {
  console.log(
    "--o:",
    globals.sharedGameObjects
      .map((x) => x.id + ":" + x.mesh.position.toArray())
      .join(", ")
  );
}, 3000);
