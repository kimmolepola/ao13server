export const handleReceiveAck = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>
) => {
  const buffer = msg as Buffer<ArrayBufferLike>;
  const sequenceNumber = buffer[0];

  return sequenceNumber;
};
