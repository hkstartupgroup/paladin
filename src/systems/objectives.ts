import { OBJECTIVE_ALL_DONE, OBJECTIVES } from "../data/objectives";
import { GameState } from "../models/types";
import { hasFlags } from "./explore";

// 依主線順序回傳當前目標文字；全部完成時回傳收尾提示。
export function currentObjective(state: GameState): string {
  const found = OBJECTIVES.find((o) => !hasFlags(state, o.done));
  return found ? found.text : OBJECTIVE_ALL_DONE;
}
