import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

export const recentStatesLength = 8; // sequence number max value 256 / 32 = 8

export const unreliableStateSingleObjectMaxBytes = 23;

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
            fuel: number;
            ordnanceChannel1: { byte1: number; byte2: number };
            ordnanceChannel2: { byte1: number; byte2: number };
          }
        | undefined;
    };
  };
};

export interface GameObject {
  id: string;
  type: GameObjectType;
}

export interface StaticGameObject extends GameObject {
  mesh: THREE.Mesh<THREE.PlaneGeometry>;
  halfWidth: number;
  halfHeight: number;
  cosA: number;
  sinA: number;
}

export interface LocalGameObject extends GameObject {
  type: GameObjectType.Bullet;
  mesh: THREE.Mesh<THREE.BoxGeometry>;
  timeToLive: number;
  speed: number;
  positionZ: number;
}

export interface SharedGameObject extends GameObject {
  idOverNetwork: number; // 0-255
  mesh: THREE.Mesh<THREE.BoxGeometry>;
  health: number;
  type: GameObjectType.Fighter;
  isPlayer: boolean;
  username: string;
  score: number;
  speed: number;
  fuel: number;
  bullets: number;
  positionZ: number;
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
  CollisionStaticObject,
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
      type: EventType.CollisionStaticObject;
      data: [currentObject: SharedGameObject, otherObject: StaticGameObject];
    }
  | {
      type: EventType.Shot;
      data: { gameObject: SharedGameObject; delta: number };
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
  Runway,
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

export type BaseStateSharedObject = {
  id: string;
  isPlayer: boolean;
  username: string;
  score: number;
  idOverNetwork: number;
};

export type BaseStateStaticObject = {
  id: string;
  type: GameObjectType;
  x: number;
  y: number;
  rotation: number;
};

// State shape (1 + n * 1-23 bytes)
// [
//   Uint8 sequence number (1 byte)
//   ...game object data (1-23 bytes each): [                                           bytes cumulative max
//     Uint8 providedValues1to8                                                         1
//       1: values9to16IsProvided                                                       |
//       2: controls                                                                    |
//       3: fuel                                                                        |
//       4: providedBytesForPositionAndRotation                                         |
//       5: positionX                                                                   |
//       6: positionY                                                                   |
//       7: positionZ                                                                   |
//       8: rotationZ                                                                   |
//     Uint8 providedValues9to16                                                        2
//       1: idOverNetwork                                                               |
//       2: health                                                                      |
//       3: ordnanceChannel1                                                            |
//       4: ordnanceChannel2                                                            |
//       5:                                                                             |
//       6:                                                                             |
//       7:                                                                             |
//     Uint8 idOverNetwork?                                                             3
//     Uint8 controls? (1:up 2:down 3:left 4:right 5:space 6:keyD 7:keyF)               4
//     Uint8 health?                                                                    5
//     Uint8 fuel?                                                                      6
//     Uint8 providedBytesForPositionAndRotation? (6 bits in use)                       7
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
//       6 rotationZ:                                                                   |
//         [0]: 1 byte                                                                  |
//         [1]: 2 bytes                                                                 |
//     Uint8*1-4 positionX? (unit is cm * positonToNetworkFactor (0.01) = meter)        11
//     Uint8*1-4 positionY? (unit is cm * positonToNetworkFactor (0.01) = meter)        15
//     Uint8*1-2 positionZ? (unit is feet)                                              17
//     Uint8*1-2 rotationZ?                                                             19
//     Uint8 ordnanceChannel1(1/2)?                                                     20
//       1: id part 1                                                                   |
//       2: id part 2                                                                   |
//       3: id part 3                                                                   |
//       4: byte count (value 0 = 1, value 1 = 2)                                       |
//       5: value part 1                                                                |
//       6: value part 2                                                                |
//       7: value part 3                                                                |
//       8: value part 4 (4 bit max value 15)                                           |
//     Uint8 ordnanceChannel1(2/2)?                                                     21
//       1: value part 5                                                                |
//       2: value part 6                                                                |
//       3: value part 7                                                                |
//       4: value part 8                                                                |
//       5: value part 9                                                                |
//       6: value part 10                                                               |
//       7: value part 11                                                               |
//       8: value part 12 (12 bit max value 4095)                                       |
//     Uint8 ordnanceChannel2(1/2)?                                                     22
//       1: id part 1                                                                   |
//       2: id part 2                                                                   |
//       3: id part 3                                                                   |
//       4: byte count (value 0 = 1, value 1 = 2)                                       |
//       5: value part 1                                                                |
//       6: value part 2                                                                |
//       7: value part 3                                                                |
//       8: value part 4 (4 bit max value 15)                                           |
//     Uint8 ordnanceChannel2(2/2)?                                                     23
//       1: value part 5                                                                |
//       2: value part 6                                                                |
//       3: value part 7                                                                |
//       4: value part 8                                                                |
//       5: value part 9                                                                |
//       6: value part 10                                                               |
//       7: value part 11                                                               |
//       8: value part 12 (12 bit max value 4095)                                       |
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
  data: {
    sharedObjects: BaseStateSharedObject[];
    staticObjects: BaseStateStaticObject[];
  };
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

// export const unreliableStateSingleObjectMaxBytes = 17;

// OLD State shape (1 + n * 1-17 bytes)
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
