import * as parameters from "../parameters";

const factor = parameters.networkToControlFactor;

const getBit = (value: number, bitPosition: number) =>
  !!((value >> bitPosition) & 1);

export const decodeControls = (
  msg: string | ArrayBuffer | Buffer<ArrayBufferLike>
) => {
  const buffer = msg as Buffer<ArrayBufferLike>;
  const providedControls1to7 = buffer[0];

  let offset = 1;
  let position: 0 | 4 = 0;

  const upIsProvided = getBit(providedControls1to7, 0);
  const downIsProvided = getBit(providedControls1to7, 1);
  const leftIsProvided = getBit(providedControls1to7, 2);
  const rightIsProvided = getBit(providedControls1to7, 3);
  const spaceIsProvided = getBit(providedControls1to7, 4);
  const keyDIsProvided = getBit(providedControls1to7, 5);
  const keyFIsProvided = getBit(providedControls1to7, 6);

  const getNextValue = () => {
    if (position) {
      const byte = buffer[offset];
      const value = byte >> position;
      position = 0;
      offset++;
      return value;
    } else {
      const byte = buffer[offset];
      const value = byte & 0x0f;
      position = 4;
      return value;
    }
  };

  const data = {
    up: upIsProvided ? getNextValue() * factor : 0,
    down: downIsProvided ? getNextValue() * factor : 0,
    left: leftIsProvided ? getNextValue() * factor : 0,
    right: rightIsProvided ? getNextValue() * factor : 0,
    space: spaceIsProvided ? getNextValue() * factor : 0,
    d: keyDIsProvided ? getNextValue() * factor : 0,
    f: keyFIsProvided ? getNextValue() * factor : 0,
  };

  return data;
};
