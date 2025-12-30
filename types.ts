import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

export const recentStatesLength = 8; // sequence number max value 256 / 32 = 8

export const reliableStateSingleObjectBytes = 14;
export const reliableStateOffsets = {
  idOverNetwork: 0,
  health: 1,
  positionX: 2,
  positionY: 6,
  positionZ: 10,
  angleZ: 12,
};

export const unreliableStateSingleObjectMaxBytes = 17;

export type RecentStates = {
  [sequenceNumber: number]: {
    acknowledged: boolean;
    state: {
      [idOverNetwork: number]:
        | {
            index: number;
            idOverNetwork: number;
            controls: number;
            health: number;
            providedBytesForPositionAndRotation: number;
            x: number;
            y: number;
            z: number;
            rotationZ: number;
          }
        | undefined;
    };
  };
};

export interface GameObject {
  id: string;
  type: GameObjectType;
  speed: number;
  mesh: THREE.Mesh<THREE.BoxGeometry>;
  positionZ: number;
}

export interface LocalGameObject extends GameObject {
  type: GameObjectType.Bullet;
  timeToLive: number;
}

export interface SharedGameObject extends GameObject {
  idOverNetwork: number; // 0-255
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
}

export enum EventType {
  HealthZero,
  Collision,
  CollisionLocalObject,
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
      data: [currentObject: SharedGameObject, otherObject: SharedGameObject];
    }
  | {
      type: EventType.CollisionLocalObject;
      data: [currentObject: SharedGameObject, otherObject: LocalGameObject];
    }
  | {
      type: EventType.Shot;
      data: SharedGameObject;
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
  Queue = "Queue",
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
  score: number;
};

// State shape (1 + n * 1-17 bytes)
// [
//   Uint8 sequence number (1 byte)
//   ...game object data (1-17 bytes each): [                                           bytes cumulative max
//     Uint8 providedValues1to8                                                         1
//       1: idOverNetwork                                                               |
//       2: controls                                                                    |
//       3: health                                                                      |
//       4: positionX                                                                   |
//       5: positionY                                                                   |
//       6: positionZ                                                                   |
//       7: angleZ                                                                      |
//       8: providedBytesForPositionAndAngle                                            |
//     Uint8 idOverNetwork? #1                                                          2
//     Uint8 controls? #2 (1:up 2:down 3:left 4:right 5:space 6:keyD 7:keyF)            3
//     Uint8 health? #3                                                                 4
//     Uint8 providedBytesForPositionAndAngle? #4 (6 bits in use)                       5
//       1&2 positionX:                                                                 |
//         [00]: 1 byte                                                                 |
//         [01]: 2 bytes                                                                |
//         [10]: 3 bytes                                                                |
//         [11]: 4 bytes                                                                |
//       3&4 positionY:                                                                 |
//         [00]: 1 byte                                                                 |
//         [01]: 2 bytes                                                                |
//         [10]: 3 bytes                                                                |
//         [11]: 4 bytes                                                                |
//       5 positionZ:                                                                   |
//         [0]: 1 byte                                                                  |
//         [1]: 2 bytes                                                                 |
//       6 angleZ:                                                                      |
//         [0]: 1 byte                                                                  |
//         [1]: 2 bytes                                                                 |
//     Uint8*1-4 positionX? #3 (unit is cm * positonToNetworkFactor (0.01) = meter)     9
//     Uint8*1-4 positionY? #4 (unit is cm * positonToNetworkFactor (0.01) = meter)     13
//     Uint8*1-2 positionZ? #5 (unit is feet)                                           15
//     Uint8*1-2 angleZ? #6                                                             17
//   ]
// ]

// Controls shape (1-5 bytes)
// [
//     Uint8 providedControls1to7 (1:up 2:down 3:left 4:right 5:space 6:keyD 7:keyF)
//     Uint8
//       1-4 providedControl1?
//       5-8 providedControl2?
//     Uint8
//       1-4 providedControl3?
//       5-8 providedControl4?
//     Uint8
//       1-4 providedControl5?
//       5-8 providedControl6?
//     Uint8
//       1-4 providedControl7?
// ]

export type ReliableStateBinary = Uint8Array;
export type UnreliableStateBinary = Uint8Array;

export type BaseState = {
  type: ServerStringDataType.BaseState;
  data: BaseStateObject[];
};

export type Queue = {
  type: ServerStringDataType.Queue;
  queuePosition: number;
};

export type ClientStringData = ChatMessageFromClient;

export type ServerStringData = ChatMessageFromServer | BaseState;

type Client = {
  id: string;
  peerConnection: PeerConnection;
  stringChannel: DataChannel | null;
  ackChannel: DataChannel | null;
  controlsChannel: DataChannel | null;
  stateChannel: DataChannel | null;
};

export type Clients = {
  map: Record<string, Client>; // id, Client
  array: Client[];
};
