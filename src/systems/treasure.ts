import { ITEMS } from "../data/items";
import { GameState, Loadout } from "../models/types";
import { addItem, consumeItem } from "./inventory";

export interface TreasureResult {
  gold: number;
  items: { itemId: string; qty: number }[];
  skills: string[];
}

// 開啟寶物（包袱、手卷等）：發放內容並消耗該道具；非寶物則回傳 null。
export function openTreasure(
  state: GameState,
  entry: Loadout,
): TreasureResult | null {
  const item = ITEMS[entry.itemId];
  if (!item || item.kind !== "treasure" || entry.qty <= 0) return null;
  const gold = item.contains?.gold ?? 0;
  const items = item.contains?.items ?? [];
  const skills = item.contains?.skills ?? [];
  if (gold > 0) state.gold += gold;
  for (const it of items) addItem(state.items, it.itemId, it.qty);
  consumeItem(state.items, entry);
  return { gold, items, skills };
}
