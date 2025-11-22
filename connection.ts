import nodeDataChannel, { IceServer, DescriptionType } from "node-datachannel";
import { HubConnection } from "@microsoft/signalr";
import * as types from "./types";
import * as api from "./api";
import {
  onReceiveString,
  onReceiveControls,
  onReceiveAck,
} from "./service/service";
import * as globals from "./globals";

// const backendUrl = "http://localhost:5095";
const serverId = Math.random().toString(36).substring(2, 15);
const password = process.env.ASPNETCORE_Ao13back__ServerOptions__LoginPassword;
const turnPort = process.env.ASPNETCORE_Ao13back__ServerOptions__TurnPort;

let iceServers: (string | IceServer)[];
console.log("Server", serverId, "Starting");

nodeDataChannel.initLogger("Error");

const createPeerConnection = (
  peerId: string,
  hubConnection: HubConnection,
  onChannelsChanged: (peerId: string) => void
) => {
  const peerConnection = new nodeDataChannel.PeerConnection(
    "server-" + serverId,
    { iceServers }
  );
  const client = {
    id: peerId,
    peerConnection,
    stringChannel: null,
    ackChannel: null,
    controlsChannel: null,
    stateChannel: null,
  };
  globals.clients.array.push(client);
  globals.clients.map[peerId] = client;
  console.log("Peer", peerId, "Connection initialized");

  peerConnection.onStateChange((state) => {
    console.log("Peer", peerId, "Connection state:", state);
    if (state === "closed") {
      const index = globals.clients.array.findIndex(
        (x) => x.peerConnection === peerConnection
      );
      if (index !== -1) {
        globals.clients.array.splice(index, 1);
      }
      if (globals.clients.map[peerId]?.peerConnection === peerConnection) {
        delete globals.clients.map[peerId];
      }
      onChannelsChanged(peerId);
    }
  });

  peerConnection.onGatheringStateChange((state) => {
    console.log("Peer", peerId, "Gathering state:", state);
  });

  peerConnection.onLocalDescription((description, type) => {
    hubConnection.send("signaling", { id: peerId, type, description });
  });

  peerConnection.onLocalCandidate((candidate, mid) => {
    hubConnection.send("signaling", {
      id: peerId,
      type: "candidate",
      candidate,
      mid,
    });
  });

  peerConnection.onIceStateChange((state) => {
    peerConnection.iceState();
    console.log("Peer", peerId, "ICE State:", state);
  });

  peerConnection.onSignalingStateChange((state) => {
    console.log("Peer", peerId, "Signaling state:", state);
  });

  peerConnection.onDataChannel((dc) => {
    const label = dc.getLabel();
    const client = globals.clients.map[peerId];
    if (client && label === "string-reliable") {
      client.stringChannel = dc;
    }
    if (client && label === "ack-reliable") {
      client.controlsChannel = dc;
    }
    if (client && label === "controls-unreliable") {
      client.controlsChannel = dc;
    }
    if (client && label === "state-unreliable") {
      client.stateChannel = dc;
    }
    dc.onOpen(() => {
      console.log("Peer", peerId, "Data channel opened", label);
      label === "string-reliable" && onChannelsChanged(peerId);
    });
    dc.onClosed(() => {
      console.log("Peer", peerId, "Data channel closed", label);
      label === "string-reliable" && onChannelsChanged(peerId);
    });
    dc.onMessage((msg) => {
      switch (label) {
        case "string-reliable":
          onReceiveString(msg, peerId, dc);
          break;
        case "controls-unreliable":
          onReceiveControls(msg, peerId);
          break;
        case "ack-reliable":
          onReceiveAck(msg, peerId);
          break;
        default:
          break;
      }
    });
  });
};

const registerHubConnectionListeners = (
  hubConnection: HubConnection,
  onChannelsChanged: (peerId: string) => void
) => {
  hubConnection.on("connected", () => {
    console.log("Connected to main server");
  });
  hubConnection.on(
    "signaling",
    (
      msg:
        | { id: string; type: DescriptionType; description: string }
        | { id: string; type: "candidate"; candidate: string; mid: string }
    ) => {
      switch (msg.type) {
        case "offer":
          globals.clients.map[msg.id]?.peerConnection.close();
          const index = globals.clients.array.findIndex((x) => x.id === msg.id);
          index !== -1 && globals.clients.array.splice(index, 1);

          createPeerConnection(msg.id, hubConnection, onChannelsChanged);
          globals.clients.map[msg.id]?.peerConnection.setRemoteDescription(
            msg.description,
            msg.type
          );
          break;
        case "answer":
          globals.clients.map[msg.id]?.peerConnection.setRemoteDescription(
            msg.description,
            msg.type
          );
          break;
        case "candidate":
          globals.clients.map[msg.id]?.peerConnection.addRemoteCandidate(
            msg.candidate,
            msg.mid
          );
          break;
        default:
          break;
      }
    }
  );
};

// -----------------------------------------------------------------------------------

const createHubConnection = (
  token: string,
  onChannelsChanged: (peerId: string) => void
) => {
  const hubConnection = api.buildHubConnection(token);

  registerHubConnectionListeners(hubConnection, onChannelsChanged);

  hubConnection.start().catch((err) => {
    console.error(err);
  });
};

const getIceServers = async () => {
  const { data } = await api.getTurnCredentials();
  const turnInfo: IceServer = data;
  const port = Number(turnPort);
  const servers: IceServer[] = [{ ...turnInfo, port, relayType: "TurnUdp" }];
  // console.log("Turn server info", turnInfo);
  return servers;
};

const login = async () => {
  console.log("Server", serverId, "Logging in");
  const { data } = await api.postServerLogin(serverId, password);
  const loggedInServerInfo: { token: string } = data;
  api.setToken(loggedInServerInfo.token);

  console.log(
    "Server",
    serverId,
    "Logged in, token length",
    loggedInServerInfo.token?.length
  );

  return loggedInServerInfo.token;
};

const handleIceServers = async () => {
  iceServers = await getIceServers();
  setInterval(async () => {
    iceServers = await getIceServers();
  }, 1000 * 55);
};

export const startConnection = async (
  onChannelsChanged: (peerId: string) => void
) => {
  const token = await login();
  await handleIceServers();
  createHubConnection(token, onChannelsChanged);
};
