import { PeerConnection, DataChannel } from "node-datachannel";
import * as THREE from "three";

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
  controlsOverChannelsUp: number;
  controlsOverChannelsDown: number;
  controlsOverChannelsLeft: number;
  controlsOverChannelsRight: number;
  controlsOverChannelsSpace: number;
  rotationSpeed: number;
  shotDelay: number;
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

export enum ClientDataType {
  ChatMessage_Client,
  Controls,
}

export enum ServerDataType {
  ChatMessage_Server,
  Update,
  State,
}

export type ChatMessageFromClient = {
  type: ClientDataType.ChatMessage_Client;
  text: string;
};

export type ChatMessageFromServer = {
  type: ServerDataType.ChatMessage_Server;
  id: string;
  text: string;
  userId: string;
};

export type Controls = {
  type: ClientDataType.Controls;
  data: {
    up: number;
    down: number;
    left: number;
    right: number;
    space: number;
  };
};

export type UpdateObject = {
  uScore: number;
  uHealth: number;
  uControlsUp: number;
  uControlsDown: number;
  uControlsLeft: number;
  uControlsRight: number;
  uControlsSpace: number;
  uRotationSpeed: number;
  uSpeed: number;
  uPositionX: number;
  uPositionY: number;
  uPositionZ: number;
  uQuaternionX: number;
  uQuaternionY: number;
  uQuaternionZ: number;
  uQuaternionW: number;
};

export type StateObject = {
  sId: string;
  sIsPlayer: boolean;
  sUsername: string;
  sScore: number;
  sRotationSpeed: number;
  sSpeed: number;
  sPositionX: number;
  sPositionY: number;
  sPositionZ: number;
  sQuaternionX: number;
  sQuaternionY: number;
  sQuaternionZ: number;
  sQuaternionW: number;
};

export type Update = {
  timestamp: number;
  type: ServerDataType.Update;
  data: {
    [id: string]: UpdateObject;
  };
};

export type State = {
  type: ServerDataType.State;
  data: { [id: string]: StateObject };
};

export type ClientData = ChatMessageFromClient | Controls;

export type ServerData = ChatMessageFromServer | Update | State;

type Client = {
  id: string;
  peerConnection: PeerConnection;
  orderedChannel: DataChannel | null;
  unorderedChannel: DataChannel | null;
};

export type Clients = {
  map: Record<string, Client>;
  array: Client[];
};
