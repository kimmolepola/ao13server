export const receiveBinaryMessage = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>
) => {
  const buffer = msg as Buffer<ArrayBufferLike>;
  const dataView = new DataView(buffer.buffer);

  const providedValues = dataView.getUint8(0);
  let offset = 1;

  const data = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    space: 0,
    d: 0,
    f: 0,
  };

  if (providedValues & 0b00000001) {
    data.up = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00000010) {
    data.down = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00000100) {
    data.left = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00001000) {
    data.right = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00010000) {
    data.space = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b00100000) {
    data.d = dataView.getUint8(offset);
    offset += 1;
  }

  if (providedValues & 0b01000000) {
    data.f = dataView.getUint8(offset);
    offset += 1;
  }

  return data;
};
