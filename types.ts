import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

export enum ReceivedEventType {
  NewId,
  RemoveId,
}

export type ReceivedEvent =
  | { type: ReceivedEventType.NewId; data: string }
  | { type: ReceivedEventType.RemoveId; data: string };

export type Count60FPSWithin20FPS = 0 | 1 | 2 | 3;
export type ReceivedInputs = {
  tickNumber: number;
  idOverNetwork: number;
  inputs: Inputs;
};

export type TickStateObject = GameObject & {
  exists: boolean;
  currentLoopId: number;
  idOverNetwork: number;
  isPlayer: boolean;
  username: string;
  health: number;
  type: GameObjectType.Fighter;
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  score: number;
  speed: number;
  rotationSpeed: number;
  verticalSpeed: number;
  shotDelay: number;
  fuel: number;
  bullets: number;
};

export type TickLocalObject = {
  type: GameObjectType.Bullet;
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  speed: number;
  timeToLive: number;
  originId: number;
};

export const recentStatesLength = 8; // sequence number max value 256 / 32 = 8

export type RecentStates = {
  [sequenceNumber: number]: {
    acknowledged: boolean;
    state: {
      [idOverNetwork: number]:
        | {
            index: number;
            idOverNetwork: number;
            inputs1: number;
            inputs2: number;
            inputsPrev1: number;
            inputsPrev2: number;
            inputsPrevPrev1: number;
            inputsPrevPrev2: number;
            inputsPrevPrevPrev1: number;
            inputsPrevPrevPrev2: number;
            inputsPrevPrevPrevPrev1: number;
            inputsPrevPrevPrevPrev2: number;
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
  controlsE: number;
  controlsOverChannelsUp: number;
  controlsOverChannelsDown: number;
  controlsOverChannelsLeft: number;
  controlsOverChannelsRight: number;
  controlsOverChannelsSpace: number;
  controlsOverChannelsD: number;
  controlsOverChannelsF: number;
  controlsOverChannelsE: number;
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
  Queue,
  RemoveId,
  NewId,
}

export type GameEvent =
  | {
      type: EventType.HealthZero;
      data: {
        id: string;
        currentState: TickStateObject[];
      };
    }
  | {
      type: EventType.Collision;
      data: [currentObject: TickStateObject, otherObject: TickStateObject];
    }
  | {
      type: EventType.CollisionLocalObject;
      data: [currentObject: TickStateObject, otherObject: TickLocalObject];
    }
  | {
      type: EventType.CollisionStaticObject;
      data: [currentObject: TickStateObject, otherObject: StaticGameObject];
    }
  | {
      type: EventType.Shot;
      data: {
        gameObject: TickStateObject;
        tickLocalObjects: TickLocalObject[];
      };
    }
  | { type: EventType.RemoveLocalObjectIndexes; data: number[] }
  | {
      type: EventType.NewId;
      data: {
        id: string;
        currentState: TickStateObject[];
      };
    }
  | {
      type: EventType.RemoveId;
      data: {
        id: string;
        currentState: TickStateObject[];
      };
    };

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

export type Inputs = {
  up: Count60FPSWithin20FPS | undefined;
  down: Count60FPSWithin20FPS | undefined;
  left: Count60FPSWithin20FPS | undefined;
  right: Count60FPSWithin20FPS | undefined;
  space: Count60FPSWithin20FPS | undefined;
  keyD: Count60FPSWithin20FPS | undefined;
  keyF: Count60FPSWithin20FPS | undefined;
  keyE: Count60FPSWithin20FPS | undefined;
};

export type InputsWithBytes = {
  inputs: Inputs;
  byte1: number | undefined;
  byte2: number | undefined;
};

export type InputsData = InputsWithBytes & {
  tickNumber: number;
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

export const unreliableStateSingleObjectMaxBytes = 23;

// State shape (1 + n * 1-25 bytes)
// [
//   Uint8 sequence number (1 byte)
//   ...game object data (1-25 bytes each): [                                                 bytes cumulative max
//     Uint8 providedValues1to8                                                               1
//       1: values9to16IsProvided                                                             |
//       2: inputs1                                                                           |
//       3: inputs2                                                                           |
//       4: lateInputs                                                                        |
//       5: providedBytesForPositionAndRotation                                               |
//       6: positionX                                                                         |
//       7: positionY                                                                         |
//       8: rotationZ                                                                         |
//     Uint8 providedValues9to16                                                              2
//       1: idOverNetwork                                                                     |
//       2: positionZ                                                                         |
//       3: health                                                                            |
//       4: fuel                                                                              |
//       5: ordnanceChannel1                                                                  |
//       6: ordnanceChannel2                                                                  |
//       7:                                                                                   |
//       8:                                                                                   |
//     Uint8 idOverNetwork?                                                                   3
//     Uint8 inputs1? (1&2:up 3&4:down 5&6:left 7&8:right)                                    4
//     Uint8 inputs2? (1&2:space 3&4:keyD 5&6:keyF 7&8:keyE)                                  5
//     Uint8 lateInputs?                                                                      6
//       1: prev1                                                                             |
//       2: prev2                                                                             |
//       3: prevPrev1                                                                         |
//       4: prevPrev2                                                                         |
//       5: prevPrevPrev1                                                                     |
//       6: prevPrevPrev2                                                                     |
//       7: prevPrevPrevPrev1                                                                 |
//       8: prevPrevPrevPrev2                                                                 |
//     Uint8 health?                                                                          7
//     Uint8 fuel?                                                                            8
//     Uint8 providedBytesForPositionAndRotation? (6 bits in use)                             9
//       1&2 positionX:                                                                       |
//         [00]: 1 byte                                                                       |
//         [01]: 2 bytes                                                                      |
//         [10]: 3 bytes                                                                      |
//         [11]: 4 bytes                                                                      |
//       3&4 positionY:                                                                       |
//         [00]: 1 byte                                                                       |
//         [01]: 2 bytes                                                                      |
//         [10]: 3 bytes                                                                      |
//         [11]: 4 bytes                                                                      |
//       5 positionZ:                                                                         |
//         [0]: 1 byte                                                                        |
//         [1]: 2 bytes                                                                       |
//       6 rotationZ:                                                                         |
//         [0]: 1 byte                                                                        |
//         [1]: 2 bytes                                                                       |
//     Uint8*1-4 positionX? (unit is cm * positonToNetworkFactor (0.01) = meter)              13
//     Uint8*1-4 positionY? (unit is cm * positonToNetworkFactor (0.01) = meter)              17
//     Uint8*1-2 positionZ? (unit is feet)                                                    19
//     Uint8*1-2 rotationZ?                                                                   21
//     Uint8 ordnanceChannel1(1/2)?                                                           22
//       1: id part 1                                                                         |
//       2: id part 2                                                                         |
//       3: id part 3                                                                         |
//       4: byte count (value 0 = 1, value 1 = 2)                                             |
//       5: value part 1                                                                      |
//       6: value part 2                                                                      |
//       7: value part 3                                                                      |
//       8: value part 4 (4 bit max value 15)                                                 |
//     Uint8 ordnanceChannel1(2/2)?                                                           23
//       1: value part 5                                                                      |
//       2: value part 6                                                                      |
//       3: value part 7                                                                      |
//       4: value part 8                                                                      |
//       5: value part 9                                                                      |
//       6: value part 10                                                                     |
//       7: value part 11                                                                     |
//       8: value part 12 (12 bit max value 4095)                                             |
//     Uint8 ordnanceChannel2(1/2)?                                                           24
//       1: id part 1                                                                         |
//       2: id part 2                                                                         |
//       3: id part 3                                                                         |
//       4: byte count (value 0 = 1, value 1 = 2)                                             |
//       5: value part 1                                                                      |
//       6: value part 2                                                                      |
//       7: value part 3                                                                      |
//       8: value part 4 (4 bit max value 15)                                                 |
//     Uint8 ordnanceChannel2(2/2)?                                                           25
//       1: value part 5                                                                      |
//       2: value part 6                                                                      |
//       3: value part 7                                                                      |
//       4: value part 8                                                                      |
//       5: value part 9                                                                      |
//       6: value part 10                                                                     |
//       7: value part 11                                                                     |
//       8: value part 12 (12 bit max value 4095)                                             |
//     Uint8 lateInputsPrev1 (seqNum - 1) (1&2:up 3&4:down 5&6:left 7&8:right)                26
//     Uint8 lateInputsPrev2 (seqNum - 1) (1&2:up 3&4:down 5&6:left 7&8:right)                27
//     Uint8 lateInputsPrevPrev1 (seqNum - 2) (1&2:up 3&4:down 5&6:left 7&8:right)            28
//     Uint8 lateInputsPrevPrev2 (seqNum - 2) (1&2:up 3&4:down 5&6:left 7&8:right)            29
//     Uint8 lateInputsPrevPrevPrev1 (seqNum - 3) (1&2:up 3&4:down 5&6:left 7&8:right)        30
//     Uint8 lateInputsPrevPrevPrev2 (seqNum - 3) (1&2:up 3&4:down 5&6:left 7&8:right)        31
//     Uint8 lateInputsPrevPrevPrevPrev1 (seqNum - 4) (1&2:up 3&4:down 5&6:left 7&8:right)    32
//     Uint8 lateInputsPrevPrevPrevPrev2 (seqNum - 4) (1&2:up 3&4:down 5&6:left 7&8:right)    33
//   ]
// ]

// Controls shape (2-3 bytes) big endian
// [
//     Uint8 tickNumber
//     Uint8
//       1: up
//       2: up
//       3: down
//       4: down
//       5: left
//       6: left
//       7: right
//       8: right
//     Uint8
//       1: space
//       2: space
//       3: keyD
//       4: keyD
//       5: keyF
//       6: keyF
//       7: keyE
//       8: keyE
// ]
