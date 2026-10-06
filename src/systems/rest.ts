import { GameState } from "../models/types";

export type RestResult = "ok" | "full" | "poor";

// 客棧投宿休息：回復全隊生命與真氣。
// cost 為 0 表示免費（如李逍遙自己的房間）。
export function restParty(state: GameState, cost: number): RestResult {
  const needRest = state.party.some((p) => p.hp < p.maxHp || p.mp < p.maxMp);
  if (!needRest) return "full";
  if (cost > 0 && state.gold < cost) return "poor";
  if (cost > 0) state.gold -= cost;
  for (const p of state.party) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  return "ok";
}
