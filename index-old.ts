import axios from "axios";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import * as types from "./types";
import nodeDataChannel, { IceServer, PeerConnection } from "node-datachannel";

const backendUrl = "http://localhost:5095";
const username = "ao13server";
const password = "8VzwvbCyrVkvF0iJzYPk";
const pathPrefix = "/api/v1";

let user: { score: number; userId: string; username: string; token: string };
const connections: types.Connection[] = [];
console.log("--hello");

// TODO
const onReceiveOnMain = (remoteId: string, data: any) => {
  console.log("--onReceiveOnMain", remoteId, data);
};

// TODO
const handleRemoveIdOnMain = (remoteId: string) => {
  console.log("--handleRemoveIdOnMain", remoteId);
};

// TODO
const handleNewIdOnMain = (remoteId: string) => {
  console.log("--handleNewIdOnMain", remoteId);
};

const closePeerConnection = (connection: types.Connection) => {
  connection.orderedChannel.close();
  connection.unorderedChannel.close();
  connection.peerConnection.close();
};

const removePeer = (remoteId: string) => {
  const index = connections.findIndex((x) => x.remoteId === remoteId);
  if (index !== -1) {
    closePeerConnection(connections[index]);
    connections.splice(index, 1);
  }
};

const handleChannelClosed = (remoteId: string) => {
  handleRemoveIdOnMain(remoteId);
  removePeer(remoteId);
};

const handleChannelOpen = (remoteId: string) => {
  handleNewIdOnMain(remoteId);
};

const createPeerConnection = (
  hubConnection: HubConnection,
  remoteId: string,
  iceServers: IceServer[]
) => {
  console.log(remoteId + " connecting...");
  console.log("--x");

  // const xpeerConnection = new RTCPeerConnection({ iceServers });
  const peerConnection = new nodeDataChannel.PeerConnection("Peer1", {
    iceServers,
    // iceTransportPolicy: "relay",
  });

  // peerConnection.addTransceiver("audio", { direction: "recvonly" });

  const orderedChannel = peerConnection.createDataChannel("ordered", {
    unordered: false,
    negotiated: true,
    id: 0,
  });
  const unorderedChannel = peerConnection.createDataChannel("unordered", {
    unordered: true,
    negotiated: true,
    id: 1,
  });
  orderedChannel.onOpen(() => {
    console.log("--ordered open");
    unorderedChannel.isOpen() && handleChannelOpen(remoteId);
  });
  unorderedChannel.onOpen(() => {
    console.log("--unordered open");
    orderedChannel.isOpen() && handleChannelOpen(remoteId);
  });
  orderedChannel.onClosed(() => {
    handleChannelClosed(remoteId);
  });
  unorderedChannel.onClosed(() => {
    handleChannelClosed(remoteId);
  });
  orderedChannel.onMessage(
    (msg: string | ArrayBuffer | Buffer<ArrayBufferLike>) => {
      const d = JSON.parse(msg.toString());
      onReceiveOnMain(remoteId, d);
    }
  );
  unorderedChannel.onMessage(
    (msg: string | ArrayBuffer | Buffer<ArrayBufferLike>) => {
      const d = JSON.parse(msg.toString());
      onReceiveOnMain(remoteId, d);
    }
  );
  peerConnection.onLocalCandidate((candidate, mid) => {
    console.log(
      "--onicecandidate:",
      // candidate,
      mid,
      remoteId,
      "isSame:",
      mid === remoteId
    );
    hubConnection?.send("signaling", { remoteId, candidate });
    hubConnection?.send("signalingx", "peerConnection.onicecandidate");
    console.log("--signalingx", "peerConnection.onicecandidate", remoteId);
  });
  peerConnection.onLocalDescription((description) => {
    console.log("--onnegotiationneeded");
    try {
      // peerConnection.setLocalDescription();
      // const socket = socketRef.current;
      hubConnection?.send("signaling", {
        remoteId,
        description,
      });
      hubConnection?.send("signalingx", "peerConnection.onnegotiationneeded");
      console.log(
        "--signalingx",
        "peerConnection.onnegotiationneeded",
        remoteId
      );
    } catch (err) {
      console.error(err);
    }
  });
  console.log("--push:", remoteId);
  connections.push({
    remoteId,
    peerConnection,
    orderedChannel,
    unorderedChannel,
  });
};

const peerConnectionHandleSignaling = (
  hubConnection: HubConnection,
  remoteId: string,
  description: RTCSessionDescription | undefined,
  candidate: RTCIceCandidate | undefined
) => {
  const peerConnection = connections.find(
    (x) => x.remoteId === remoteId
  )?.peerConnection;
  if (peerConnection) {
    try {
      if (description) {
        peerConnection.setRemoteDescription(description.sdp, description.type);
        if (description.type === "offer") {
          peerConnection.setLocalDescription();
          hubConnection.send("signaling", {
            remoteId,
            description: peerConnection.localDescription,
          });
        }
      } else if (candidate) {
        peerConnection.addRemoteCandidate(candidate.candidate, remoteId);
      }
    } catch (err) {
      console.error(err);
    }
  }
};

const registerHubConnectionListeners = (
  hubConnection: HubConnection,
  iceServers: IceServer[]
) => {
  hubConnection.on("main", () => {
    console.log("Is main");
  });

  hubConnection.on("connectToMain", (remoteId: string) => {
    console.log("This is error. Connect to main received: ", remoteId);
  });

  hubConnection.on(
    "signaling",
    ({
      id: remoteId,
      description,
      candidate,
    }: {
      id: string;
      description?: RTCSessionDescription;
      candidate?: RTCIceCandidate;
    }) => {
      console.log(
        "Signaling received:",
        remoteId,
        connections.some((x) => x.remoteId === remoteId)
      );
      !connections.some((x) => x.remoteId === remoteId) &&
        createPeerConnection(hubConnection, remoteId, iceServers);
      peerConnectionHandleSignaling(
        hubConnection,
        remoteId,
        description,
        candidate
      );
    }
  );
};

const createHubConnection = (iceServers: IceServer[]) => {
  const hubConnection = new HubConnectionBuilder()
    .withUrl(backendUrl + pathPrefix + "/hub", {
      accessTokenFactory: () => user?.token || "",
    })
    .build();

  registerHubConnectionListeners(hubConnection, iceServers);

  hubConnection.start().catch((err) => {
    console.error(err);
  });
};

const getIceServers = async () => {
  const response = await axios.post(
    `${backendUrl}/api/v1/auth/getTurnCredentials`
  );
  const turnInfo: IceServer = response.data;
  const iceServers = [turnInfo];
  return iceServers;
};

const login = async () => {
  const response = await axios.post(backendUrl + pathPrefix + "/auth/login", {
    username,
    password,
  });
  user = response.data;
  console.log("User data:", user);

  axios.defaults.headers.common = { Authorization: `Bearer ${user.token}` };
};

const start = async () => {
  await login();
  const iceServers = await getIceServers();
  console.log("--Ice servers:", iceServers);
  createHubConnection(iceServers);
};

start();
