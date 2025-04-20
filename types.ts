import nodeDataChannel, {
  IceServer,
  PeerConnection,
  DataChannel,
} from "node-datachannel";

export type Connection = {
  clientId: string;
  peerConnection: PeerConnection;
  orderedChannel: DataChannel | null;
  unorderedChannel: DataChannel | null;
};
