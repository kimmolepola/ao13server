import axios from "axios";
import { HubConnectionBuilder } from "@microsoft/signalr";
import * as types from "./types";

const backendUrl = process.env.ASPNETCORE_Ao13back__ServerOptions__BackendUrl;
const pathPrefix = "/api/v1";

export const postSaveGameState = (data: types.PlayerState[]) =>
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

export const accessTokenForHubConnection: { accessToken: string | undefined } =
  {
    accessToken: undefined,
  };

export const setAccessToken = (accessToken: string) => {
  accessTokenForHubConnection.accessToken = accessToken;
  axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
};

export const buildHubConnection = () => {
  const hubConnection = new HubConnectionBuilder()
    .withUrl(backendUrl + pathPrefix + "/serverHub", {
      accessTokenFactory: () => accessTokenForHubConnection.accessToken || "",
    })
    .build();

  return hubConnection;
};

export const postRefreshToken = async (refreshToken: string) => {
  const result = await axios.post(
    backendUrl + pathPrefix + "/auth/refreshToken",
    {
      refreshToken,
    }
  );
  !result.data && console.error("postRefreshToken error", result);
  return {
    accessToken: result.data?.accessToken,
    refreshToken: result.data?.refreshToken,
  };
};
