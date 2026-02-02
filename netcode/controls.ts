import * as types from "../types";

const data: types.InputsData = {
  tickNumber: 0,
  inputs: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    space: 0,
    keyD: 0,
    keyF: 0,
    keyE: 0,
  },
};

function get2BitValueFromBufferBE(
  buf: Buffer<ArrayBufferLike>, // byte1: tickNumber, byte2: value, byte3: value
  pos: 0 | 2 | 4 | 6 | 8 | 10 | 12 | 14
) {
  const len = buf.length;

  // Assemble big-endian integer manually
  const value16 = len === 2 ? buf[1] : (buf[1] << 8) | buf[2];

  return ((value16 >> pos) & 0b11) as types.Count60FPSWithin20FPS;
}

export const decodeControls = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>
) => {
  const buffer = msg as Buffer<ArrayBufferLike>;

  data.tickNumber = buffer[0];
  data.inputs.up = get2BitValueFromBufferBE(buffer, 0);
  data.inputs.down = get2BitValueFromBufferBE(buffer, 2);
  data.inputs.left = get2BitValueFromBufferBE(buffer, 4);
  data.inputs.right = get2BitValueFromBufferBE(buffer, 6);
  data.inputs.space = get2BitValueFromBufferBE(buffer, 8);
  data.inputs.keyD = get2BitValueFromBufferBE(buffer, 10);
  data.inputs.keyF = get2BitValueFromBufferBE(buffer, 12);
  data.inputs.keyE = get2BitValueFromBufferBE(buffer, 14);

  return data;
};
