import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

export type SharedObjectInfo = {
  id: string;
  idOverNetwork: number;
  username: string;
};

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
  gameEventIds: number[];
};

export type TickLocalObject = {
  type: GameObjectType.Bullet;
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  segDx: number;
  segDy: number;
  segLenSq: number;
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
            // info byte 1
            inputs1: number | undefined;
            x: number;
            y: number;
            rotationZ: number;
            rotationSpeed: number;
            // info byte 2
            idOverNetwork: number;
            speed: number;
            eventsEncoded: number;
            gameEventIdBytes: number[];
            health: number;
            fuel: number;
            // info byte 3
            inputs2: number | undefined;
            verticalSpeed: number;
            z: number;
            ordnanceChannel1: {
              idWithFlag: number;
              byte1: number;
              byte2: number;
            };
            ordnanceChannel2: {
              idWithFlag: number;
              byte1: number;
              byte2: number;
            };
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
        currentTickNumber: number;
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

export const unreliableStateSingleObjectMaxBytes = 38;

// State shape (1 + n * 1-38 bytes)
// [
//   Uint8 sequence number (1 byte)
//   ...game object data (1-38 bytes each): [                                                 bytes cumulative max
//     Uint8 providedValues1to8                                                               1
//       1: providedValues9to16 (true if the byte is non-zero, not compared to recent state)  |
//       2: inputs1                                                                           |
//       3: providedBytesPositionX                                                            |
//       4: providedBytesPositionX                                                            |
//          [00]: 0 bytes                                                                     |
//          [01]: 1 byte                                                                      |
//          [10]: 2 bytes                                                                     |
//          [11]: 4 bytes                                                                     |
//       5: providedBytesPositionY                                                            |
//       6: providedBytesPositionY                                                            |
//          [00]: 0 bytes                                                                     |
//          [01]: 1 byte                                                                      |
//          [10]: 2 bytes                                                                     |
//          [11]: 4 bytes                                                                     |
//       7: rotationZ                                                                         |
//       8: rotationSpeed                                                                     |
//     Uint8 providedValues9to16?                                                             2
//       1: providedValues17to24 (true if the byte is non-zero, not compared to recent state) |
//       2: idOverNetwork                                                                     |
//       3: speed                                                                             |
//       4: eventsIds                                                                         |
//       5: events                                                                            |
//       6: health                                                                            |
//       7: fuel                                                                              |
//       8:                                                                                   |
//     Uint8 providedValues17to24?                                                            3
//       1: inputs2                                                                           |
//       2: verticalSpeed                                                                     |
//       3: positionZ                                                                         |
//       4: ordnanceChannel1                                                                  |
//       5: ordnanceChannel2                                                                  |
//       6:                                                                                   |
//       7:                                                                                   |
//       8:                                                                                   |
//     Uint8 idOverNetwork?                                                                   4
//     Uint8 inputs1? (1&2:up 3&4:down 5&6:left 7&8:right)                                    5
//     Uint8*1-4 positionX? (unit is cm * positonToNetworkFactor (0.01) = meter)              9
//     Uint8*1-4 positionY? (unit is cm * positonToNetworkFactor (0.01) = meter)              13
//     Uint8*2 rotationZ?                                                                     15
//     Uint8 rotationSpeed?                                                                   16
//     Uint8*2 speed?                                                                         18
//     Uint8 events?                                                                          19
//       1: cur had one or more game events                                                   |
//       2: p had one or more game events                                                     |
//       3: pp had one or more game events                                                    |
//       4: ppp had one or more game events                                                   |
//       5-8: unused                                                                          |
//     Uint8* gameEventIds? (linked list per tick, cur then p then pp then ppp)              20+
//       1-7: event id (0-127)                                                                |
//       8: another event follows for this tick (1) or end of tick's events (0)              |
//     Uint8 health?                                                                          20+n
//     Uint8 fuel?                                                                            29
//     Uint8 inputs2? (1&2:space 3&4:keyD 5&6:keyF 7&8:keyE)                                  30
//     Uint8 verticalSpeed?                                                                   31
//     Uint8*2 positionZ? (unit is feet)                                                      32
//     Uint8 ordnanceChannel1ID?                                                              33
//       1: id part 1                                                                         |
//       2: id part 2                                                                         |
//       3: id part 3                                                                         |
//       4: id part 4                                                                         |
//       5: id part 5                                                                         |
//       6: id part 6                                                                         |
//       7: id part 7 (7 bit max value 127)                                                   |
//       8: byte 2 provided                                                                   |
//     Uint8 ordnanceChannel1ValueByte1?                                                      34
//     Uint8 ordnanceChannel1ValueByte2?                                                      35
//     Uint8 ordnanceChannel2ID?                                                              36
//       1: id part 1                                                                         |
//       2: id part 2                                                                         |
//       3: id part 3                                                                         |
//       4: id part 4                                                                         |
//       5: id part 5                                                                         |
//       6: id part 6                                                                         |
//       7: id part 7 (7 bit max value 127)                                                   |
//       8: byte 2 provided                                                                   |
//     Uint8 ordnanceChannel2ValueByte1?                                                      37
//     Uint8 ordnanceChannel2ValueByte2?                                                      38
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
