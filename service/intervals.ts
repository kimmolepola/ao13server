import { handleSendReliableState, savePlayerData } from "./objects";
import * as parameters from "../parameters";

export const startIntervals = () => {
  setInterval(() => {
    handleSendReliableState();
  }, parameters.reliableStateInterval);
  setInterval(() => {
    savePlayerData();
  }, parameters.savePlayerDataInterval);
};
