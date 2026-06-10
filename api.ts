import { HubConnectionBuilder } from "@microsoft/signalr";
import * as types from "./types";

const backendUrl = process.env.ASPNETCORE_Ao13back__ServerOptions__BackendUrl;
const pathPrefix = "/api/v1";

export const accessTokenForHubConnection: { accessToken: string | undefined } =
  {
    accessToken: undefined,
  };

export const setAccessToken = (accessToken: string) => {
  accessTokenForHubConnection.accessToken = accessToken;
};

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${accessTokenForHubConnection.accessToken || ""}`,
  "Content-Type": "application/json",
});

const apiFetch = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, { ...init, headers: authHeaders() });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const postSaveGameState = (data: types.PlayerState[]) =>
  apiFetch(backendUrl + pathPrefix + "/gameObject/saveGameState", {
    method: "POST",
    body: JSON.stringify(data),
  }).catch((err) => console.error("postSaveGameState error", err));

export const getGameObject = async (id: string) => {
  const data = await apiFetch(backendUrl + pathPrefix + "/gameObject/" + id);
  return { data };
};

export const getTurnCredentials = async () => {
  const data = await apiFetch(
    backendUrl + pathPrefix + "/auth/getTurnCredentials"
  );
  return { data };
};

export const postServerLogin = async (
  serverId: string,
  password: string | undefined
) => {
  const data = await apiFetch(backendUrl + pathPrefix + "/auth/serverLogin", {
    method: "POST",
    body: JSON.stringify({ id: serverId, password }),
  });
  return { data };
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
  const result = await apiFetch(
    backendUrl + pathPrefix + "/auth/refreshToken",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }
  );
  !result && console.error("postRefreshToken error", result);
  return {
    accessToken: result?.accessToken,
    refreshToken: result?.refreshToken,
  };
};
