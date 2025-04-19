import nodeDataChannel from "node-datachannel";

// Log Level
nodeDataChannel.initLogger("Debug");

// Integrated WebSocket available and can be used for signaling etc
// const ws = new nodeDataChannel.WebSocket();

let dc1 = null;
let dc2 = null;

let peer1 = new nodeDataChannel.PeerConnection("Peer1", {
  // iceServers: ["stun:stun.l.google.com:19302"],
  iceServers: [],
});

peer1.onLocalDescription((sdp, type) => {
  peer2.setRemoteDescription(sdp, type);
});
peer1.onLocalCandidate((candidate, mid) => {
  peer2.addRemoteCandidate(candidate, mid);
});

let peer2 = new nodeDataChannel.PeerConnection("Peer2", {
  // iceServers: ["stun:stun.l.google.com:19302"],
  iceServers: [],
});

peer2.onLocalDescription((sdp, type) => {
  peer1.setRemoteDescription(sdp, type);
});
peer2.onLocalCandidate((candidate, mid) => {
  peer1.addRemoteCandidate(candidate, mid);
});
peer2.onDataChannel((dc) => {
  dc2 = dc;
  dc2.onMessage((msg) => {
    console.log("Peer2 Received Msg:", msg);
  });
  dc2.sendMessage("Hello From Peer2");
});

dc1 = peer1.createDataChannel("test");

dc1.onOpen(() => {
  dc1.sendMessage("Hello from Peer1");
});

dc1.onMessage((msg) => {
  console.log("Peer1 Received Msg:", msg);
});
