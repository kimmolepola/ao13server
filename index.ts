import readline from "readline";
import nodeDataChannel, {
  PeerConnection,
  IceServer,
  DescriptionType,
} from "node-datachannel";
import axios from "axios";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import * as types from "./types";

const backendUrl = "http://localhost:5095";
const serverId = Math.random().toString(36).substring(2, 15);
const password = process.env.ASPNETCORE_Ao13back__ServerOptions__LoginPassword;
const turnPort = process.env.ASPNETCORE_Ao13back__ServerOptions__TurnPort;
const pathPrefix = "/api/v1";

let loggedInServerInfo: { token: string };
const connections: types.Connection[] = [];
let iceServers: (string | IceServer)[];
console.log("Server", serverId, "Starting");

nodeDataChannel.initLogger("Error");

const pcMap: Record<string, PeerConnection> = {};

const createPeerConnection = async (
  peerId: string,
  hubConnection: HubConnection
) => {
  const peerConnection = new nodeDataChannel.PeerConnection(
    "server-" + serverId,
    { iceServers }
  );
  console.log("Peer", peerId, "Connection initialized");

  pcMap[peerId] = peerConnection;
  connections.push({
    clientId: peerId,
    peerConnection,
    orderedChannel: null,
    unorderedChannel: null,
  });

  peerConnection.onStateChange((state) => {
    console.log("Peer", peerId, "Connection state:", state);
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
  peerConnection.onDataChannel((dc) => {
    const id = dc.getId();
    const label = dc.getLabel();
    console.log("Peer", peerId, "DataChannel created:", id, label);
    const connection = connections.find((c) => c.clientId === peerId);
    if (connection && label === "ordered") {
      connection.orderedChannel = dc;
      console.log("Peer", peerId, "Ordered channel set:", id, label);
    }
    if (connection && label === "unordered") {
      connection.unorderedChannel = dc;
      console.log("Peer", peerId, "Unordered channel set:", id, label);
    }
    dc.onOpen(() => {
      console.log("Peer", peerId, "DataChannel opened:", id, label);
    });
    dc.onClosed(() => {
      console.log("Peer", peerId, "DataChannel closed:", id, label);
    });
  });

  peerConnection.onIceStateChange((state) => {
    peerConnection.iceState();
    console.log("Peer", peerId, "ICE State:", state);
  });
  peerConnection.onSignalingStateChange((state) => {
    console.log("Peer", peerId, "Signaling state:", state);
  });
};

const registerHubConnectionListeners = (hubConnection: HubConnection) => {
  hubConnection.on(
    "signaling",
    (
      msg:
        | { id: string; type: DescriptionType; description: string }
        | { id: string; type: "candidate"; candidate: string; mid: string }
    ) => {
      switch (msg.type) {
        case "offer":
          createPeerConnection(msg.id, hubConnection);
          pcMap[msg.id].setRemoteDescription(msg.description, msg.type);
          break;
        case "answer":
          pcMap[msg.id].setRemoteDescription(msg.description, msg.type);
          break;
        case "candidate":
          pcMap[msg.id].addRemoteCandidate(msg.candidate, msg.mid);
          break;
        default:
          break;
      }
    }
  );
};

// -----------------------------------------------------------------------------------

const createHubConnection = () => {
  const hubConnection = new HubConnectionBuilder()
    .withUrl(backendUrl + pathPrefix + "/hub", {
      accessTokenFactory: () => loggedInServerInfo?.token || "",
    })
    .build();

  registerHubConnectionListeners(hubConnection);

  hubConnection.start().catch((err) => {
    console.error(err);
  });
};

const getIceServers = async () => {
  const response = await axios.post(
    `${backendUrl}/api/v1/auth/getTurnCredentials`
  );
  const turnInfo: IceServer = response.data;
  const port = Number(turnPort);
  const servers: IceServer[] = [{ ...turnInfo, port, relayType: "TurnUdp" }];
  return servers;
};

const login = async () => {
  console.log("Server", serverId, "Logging in");
  const response = await axios.post(
    backendUrl + pathPrefix + "/auth/serverLogin",
    {
      id: serverId,
      password,
    }
  );
  loggedInServerInfo = response.data;
  console.log(
    "Server",
    serverId,
    "Logged in, token length",
    loggedInServerInfo.token?.length
  );

  axios.defaults.headers.common = {
    Authorization: `Bearer ${loggedInServerInfo.token}`,
  };
};

const start = async () => {
  await login();
  iceServers = await getIceServers();
  createHubConnection();
};

start();
