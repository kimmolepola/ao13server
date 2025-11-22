import { savePlayerData } from "./objects";
import * as parameters from "../parameters";

export const startIntervals = () => {
  setInterval(() => {
    savePlayerData();
  }, parameters.savePlayerDataInterval);
};
