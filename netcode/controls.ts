export const decodeControls = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>
) => {
  const buffer = msg as Buffer<ArrayBufferLike>;

  const data = {
    up: (buffer[0] >> 0) & 1,
    down: (buffer[0] >> 1) & 1,
    left: (buffer[0] >> 2) & 1,
    right: (buffer[0] >> 3) & 1,
    space: (buffer[0] >> 4) & 1,
    d: (buffer[0] >> 5) & 1,
    f: (buffer[0] >> 6) & 1,
  };

  return data;
};
