import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

// 2 bytes for sequence number, 1 byte for associated reliable-state sequence number
export const unreliableStateInfoBytes = 3;

export const reliableStateSingleObjectBytes = 41;
export const unreliableStateSingleObjectMaxBytes = 32;

export type RecentlySentStateObjectData = {
  [id: string]: Omit<SharedGameObject, "mesh"> & {
    mesh: undefined;
    position: { x: number; y: number; z: number };
    // quaternion: { x: number; y: number; z: number; w: number };
    angleZ: number;
  };
};

export type RecentlySentState = {
  value?: {
    idsVersionMax255: number;
    sequenceNumberMax255: number;
    data: RecentlySentStateObjectData;
  };
};

export interface GameObject {
  id: string;
  type: GameObjectType;
  speed: number;
  mesh: THREE.Mesh<THREE.BoxGeometry>;
  collisions: { [gameObjectId: string]: { time: number; collision: boolean } };
}

export interface LocalGameObject extends GameObject {
  type: GameObjectType.Bullet;
  timeToLive: number;
}

export interface SharedGameObject extends GameObject {
  health: number;
  type: GameObjectType.Fighter;
  isPlayer: boolean;
  username: string;
  score: number;
  controlsUp: number;
  controlsDown: number;
  controlsLeft: number;
  controlsRight: number;
  controlsSpace: number;
  controlsD: number;
  controlsF: number;
  controlsOverChannelsUp: number;
  controlsOverChannelsDown: number;
  controlsOverChannelsLeft: number;
  controlsOverChannelsRight: number;
  controlsOverChannelsSpace: number;
  controlsOverChannelsD: number;
  controlsOverChannelsF: number;
  rotationSpeed: number;
  verticalSpeed: number;
  shotDelay: number;
  previousSend: {
    quaternionZ: number;
    quaternionW: number;
  };
  positionZ: number;
}

export enum EventType {
  HealthZero,
  Collision,
  Shot,
  RemoveLocalObjectIndexes,
}

export type GameEvent =
  | {
      type: EventType.HealthZero;
      data: SharedGameObject;
    }
  | {
      type: EventType.Collision;
      data: {
        object: SharedGameObject;
        otherObjects: GameObject[];
      };
    }
  | {
      type: EventType.Shot;
      data: { mesh: THREE.Mesh<THREE.BoxGeometry>; speed: number };
    }
  | { type: EventType.RemoveLocalObjectIndexes; data: number[] };

export type GameEventHandler = (e: GameEvent) => void;

export type PlayerState = {
  clientId: string;
  score: number;
};

export enum GameObjectType {
  Bullet,
  Fighter,
}

export enum ClientStringDataType {
  ChatMessage_Client = "ChatMessage_Client",
}

export enum ServerStringDataType {
  ChatMessage_Server = "ChatMessage_Server",
  BaseState = "BaseState",
}

export type ChatMessageFromClient = {
  type: ClientStringDataType.ChatMessage_Client;
  text: string;
};

export type ChatMessageFromServer = {
  type: ServerStringDataType.ChatMessage_Server;
  id: string;
  text: string;
  userId: string;
};

export type Controls = {
  up: number;
  down: number;
  left: number;
  right: number;
  space: number;
  d: number;
  f: number;
};

export type BaseStateObject = {
  id: string;
  isPlayer: boolean;
  username: string;
};

// Reliable-State shape (1 + n * 41 bytes)
// [
//   Uint8 sequence number (1 byte)
//   ...stateDataInOrder (41 bytes each): [
//     Uint32 guid part 1
//     Uint32 guid part 2
//     Uint32 guid part 3
//     Uint32 guid part 4
//     Uint32 score
//     Uint8 health
//     Int8 rotationSpeed
//     Int8 verticalSpeed
//     Uint16 speed
//     Int32 positionX
//     Int32 positionY
//     Int32 positionZ
//     Uint16 angleZ
//   ]
// ]

// Unreliable-State shape (3 + n * 2-32 bytes)
// [
//   Uint16 sequence number (2 bytes)
//   Uint8 sequence number of associated reliable-state (1 byte)
//   ...game object data (2-32 bytes each): [
//     Uint8 providedValues1to8
//     Uint8 providedValues9to16
//     Uint32 score? #1
//     Uint8 health? #2
//     Uint8 controlsUp? #3
//     Uint8 controlsDown? #4
//     Uint8 controlsLeft? #5
//     Uint8 controlsRight? #6
//     Uint8 controlsSpace? #7
//     Uint8 controlsD? #8
//     Uint8 controlsF? #9
//     Int8 rotationSpeed? #10
//     int8 verticalSpeed? #11
//     Uint16 speed? #12
//     Int32 positionX? #13
//     Int32 positionY? #14
//     Int32 positionZ? #15
//     Uint16 angleZ? #16
//   ]
// ]

// ControlsBinary shape (1-8 bytes)
// [
//   Uint8 providedValues
//   Uint8 up?
//   Uint8 down?
//   Uint8 left?
//   Uint8 right?
//   Uint8 space?
//   Uint8 d?
//   Uint8 f?
// ]

export type ReliableStateBinary = Uint8Array;
export type UnreliableStateBinary = Uint8Array;

export type BaseState = {
  type: ServerStringDataType.BaseState;
  data: BaseStateObject[];
};

export type ClientStringData = ChatMessageFromClient;

export type ServerStringData = ChatMessageFromServer | BaseState;

type Client = {
  id: string;
  peerConnection: PeerConnection;
  reliableChannel: DataChannel | null;
  reliableChannelBinary: DataChannel | null;
  unreliableChannelBinary: DataChannel | null;
};

export type Clients = {
  map: Record<string, Client>;
  array: Client[];
};
