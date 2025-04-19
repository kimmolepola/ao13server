import nodeDataChannel, {
  IceServer,
  PeerConnection,
  DataChannel,
} from "node-datachannel";

export type Connection = {
  remoteId: string;
  peerConnection: PeerConnection;
  orderedChannel: DataChannel;
  unorderedChannel: DataChannel;
};
