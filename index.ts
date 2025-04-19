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
const pathPrefix = "/api/v1";

let loggedInServerInfo: { token: string };
const connections: types.Connection[] = [];
let iceServers: (string | IceServer)[];
console.log("--hello");

// Init Logger
nodeDataChannel.initLogger("Error");

// PeerConnection Map
const pcMap: Record<string, PeerConnection> = {};

// Local ID
// const id = randomId(4);

// Signaling Server
// const WS_URL = process.env.WS_URL || "ws://localhost:8000";
// const ws = new nodeDataChannel.WebSocket();
// ws.open(WS_URL + "/" + id);

// console.log(`The local ID is: ${id}`);
// console.log(`Waiting for signaling to be connected...`);

// ws.onOpen(() => {
//   console.log("WebSocket connected, signaling ready");
//   readUserInput();
// });

// ws.onError((err) => {
//   console.log("WebSocket Error: ", err);
// });

// ws.onMessage((msgStr) => {
//   const msg = typeof msgStr === "string" ? JSON.parse(msgStr) : null;
//   if (!msg) {
//     console.error("typeof msgStr not string");
//     return;
//   }
//   switch (msg.type) {
//     case "offer":
//       createPeerConnection(msg.id);
//       pcMap[msg.id].setRemoteDescription(msg.description, msg.type);
//       break;
//     case "answer":
//       pcMap[msg.id].setRemoteDescription(msg.description, msg.type);
//       break;
//     case "candidate":
//       pcMap[msg.id].addRemoteCandidate(msg.candidate, msg.mid);
//       break;

//     default:
//       break;
//   }
// });

// --------------------------------------------------------------------------------
// function readUserInput() {
//   // Read Line Interface
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   rl.question("Enter a remote ID to send an offer:\n", (peerId) => {
//     if (peerId && peerId.length > 2) {
//       console.log("Offering to ", peerId);
//       createPeerConnection(peerId);

//       console.log('Creating DataChannel with label "test"');
//       let dc = pcMap[peerId].createDataChannel("test");
//       dc.onOpen(() => {
//         dc.sendMessage("Hello from " + id);
//       });

//       dc.onMessage((msg) => {
//         console.log("Message from " + peerId + " received:", msg);
//       });
//     }

//     rl.close();
//     readUserInput();
//   });
// }
// --------------------------------------------------------------------------------

const createPeerConnection = async (
  peerId: string,
  hubConnection: HubConnection
) => {
  console.log("--Ice servers:", iceServers);

  // Create PeerConnection
  const peerConnection = new nodeDataChannel.PeerConnection("pc", {
    iceServers,
  });
  peerConnection.onStateChange((state) => {
    console.log("State: ", state);
  });
  peerConnection.onGatheringStateChange((state) => {
    console.log("GatheringState: ", state);
  });
  peerConnection.onLocalDescription((description, type) => {
    // hubConnection.send(
    //   "signaling",
    //   JSON.stringify({ id: peerId, type, description })
    // );
    console.log("--onLocalDescription", peerId, type, description);
    hubConnection.send("signaling", { id: peerId, type, description });
  });
  peerConnection.onLocalCandidate((candidate, mid) => {
    console.log("--onLocalCandidate", peerId, candidate, mid);
    hubConnection.send("signaling", {
      id: peerId,
      type: "candidate",
      candidate,
      mid,
    });
  });
  peerConnection.onDataChannel((dc) => {
    console.log(
      "DataChannel from " + peerId + ' received with label "',
      dc.getLabel() + '"'
    );
    dc.onMessage((msg) => {
      console.log("Message from " + peerId + " received:", msg);
    });
    dc.sendMessage("Hello From " + "main");
  });

  peerConnection.onIceStateChange((state) => {
    console.log("ICE State: ", state);
  });
  peerConnection.onSignalingStateChange((state) => {
    console.log("Signaling State: ", state);
  });
  // try {
  //   peerConnection.setLocalDescription();
  // } catch (e) {
  //   console.error("Error setting local description:", e);
  // }
  pcMap[peerId] = peerConnection;
  console.log("--PeerConnection created:", peerId, pcMap, pcMap[peerId]);
};

// function randomId(length: number) {
//   var result = "";
//   var characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   var charactersLength = characters.length;
//   for (var i = 0; i < length; i++) {
//     result += characters.charAt(Math.floor(Math.random() * charactersLength));
//   }
//   return result;
// }

const registerHubConnectionListeners = (hubConnection: HubConnection) => {
  hubConnection.on("main", () => {
    console.log("Is main");
  });

  hubConnection.on("connectToMain", async (remoteId: string) => {
    console.log("Connect to main: ", remoteId);
    await createPeerConnection(remoteId, hubConnection);

    console.log('Creating DataChannel with label "test"');
    let dc = pcMap[remoteId].createDataChannel("test");
    dc.onOpen(() => {
      dc.sendMessage("Hello from " + "peer2");
    });

    dc.onMessage((msg: any) => {
      console.log("Message from " + remoteId + " received:", msg);
    });
  });

  hubConnection.on(
    "signaling",
    (
      msg:
        | { id: string; type: DescriptionType; description: string }
        | { id: string; type: "candidate"; candidate: string; mid: string }
    ) => {
      console.log("--signaling received:", msg, msg.id, pcMap, pcMap[msg.id]);
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

  // hubConnection.on(
  //   "signaling",
  //   ({
  //     id: remoteId,
  //     description,
  //     candidate,
  //   }: {
  //     id: string;
  //     description?: RTCSessionDescription;
  //     candidate?: RTCIceCandidate;
  //   }) => {
  //     console.log(
  //       "Signaling received:",
  //       remoteId,
  //       connections.some((x) => x.remoteId === remoteId)
  //     );
  //     !connections.some((x) => x.remoteId === remoteId) &&
  //       createPeerConnection(hubConnection, remoteId, iceServers);
  //     peerConnectionHandleSignaling(
  //       hubConnection,
  //       remoteId,
  //       description,
  //       candidate
  //     );
  //   }
  // );
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

const getIceServers: () => Promise<(string | IceServer)[]> = async () => {
  const response = await axios.post(
    `${backendUrl}/api/v1/auth/getTurnCredentials`
  );
  const turnInfo: IceServer = response.data;
  // const iceServers = [turnInfo];
  // const iceServers = ["stun:stun.l.google.com:19302"];
  const iceServers: any[] = [];
  return iceServers;
};

const login = async () => {
  console.log("Logging in with serverId:", serverId, password);
  const response = await axios.post(
    backendUrl + pathPrefix + "/auth/serverLogin",
    {
      id: serverId,
      password,
    }
  );
  loggedInServerInfo = response.data;
  console.log("Logged in server info:", loggedInServerInfo);

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
