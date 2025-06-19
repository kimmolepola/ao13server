import { handleSendState, savePlayerData } from "./objects";
import { sendOrdered } from "./channels";
import * as parameters from "../parameters";

export const startIntervals = () => {
  setInterval(() => {
    handleSendState(sendOrdered);
  }, parameters.sendIntervalMainState);
  setInterval(() => {
    savePlayerData();
  }, parameters.savePlayerDataInterval);
};
