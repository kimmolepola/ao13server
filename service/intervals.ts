import { savePlayerData } from "./objects";
import { handleSendReliableState } from "../netcode/reliableState";
import * as parameters from "../parameters";

export const startIntervals = () => {
  setInterval(() => {
    handleSendReliableState();
  }, parameters.reliableStateInterval);
  setInterval(() => {
    savePlayerData();
  }, parameters.savePlayerDataInterval);
};
