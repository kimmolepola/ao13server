import nodeDataChannel from "node-datachannel";

// Log Level
nodeDataChannel.initLogger("Error");

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
  console.log(
    "Peer2 DataChannel created:",
    dc.getLabel(),
    dc.getId(),
    dc.getProtocol()
  );
  dc2 = dc;

  dc2.onOpen(() => {
    console.log("Peer2 DataChannel opened:", dc.getLabel(), dc.getId());
  });
  dc2.onMessage((msg) => {
    console.log("Peer2 Received Msg:", msg);
  });
  dc2.sendMessage("Hello From Peer2");
});

dc1 = peer1.createDataChannel("unordered", { unordered: true });
const dc1b = peer1.createDataChannel("ordered", { unordered: false });

dc1b.onOpen(() => {
  dc1b.sendMessage("Hello from Peer1 ordered channel");
});
dc1b.onMessage((msg) => {
  console.log("Peer1 ordered Received Msg:", msg);
});

dc1.onOpen(() => {
  dc1.sendMessage("Hello from Peer1");
});

dc1.onMessage((msg) => {
  console.log("Peer1 Received Msg:", msg);
});
