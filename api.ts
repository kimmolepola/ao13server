import axios from "axios";
import { HubConnectionBuilder } from "@microsoft/signalr";
import * as types from "./types";

const backendUrl = process.env.ASPNETCORE_Ao13back__ServerOptions__BackendUrl;
const pathPrefix = "/api/v1";

console.log("--backendUrl:", backendUrl);

export const saveGameState = (data: types.PlayerState[]) =>
  axios.post(backendUrl + pathPrefix + "/gameObject/saveGameState", data);

export const getGameObject = (id: string) =>
  axios.get(backendUrl + pathPrefix + "/gameObject/" + id);

export const getTurnCredentials = () =>
  axios.get(backendUrl + pathPrefix + "/auth/getTurnCredentials");

export const postServerLogin = (
  serverId: string,
  password: string | undefined
) =>
  axios.post(backendUrl + pathPrefix + "/auth/serverLogin", {
    id: serverId,
    password,
  });

export const setToken = (token: string) => {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const buildHubConnection = (token: string) => {
  const hubConnection = new HubConnectionBuilder()
    .withUrl(backendUrl + pathPrefix + "/serverHub", {
      accessTokenFactory: () => token || "",
    })
    .build();

  return hubConnection;
};
