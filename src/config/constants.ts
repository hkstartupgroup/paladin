import { EquipSlot } from "../models/types";

export const GAME_TITLE = "仙劍奇俠傳";
export const GAME_SUBTITLE = "終端文字版 · 第一～二章";
export const MAX_LEVEL = 99;
export const SAVE_DIR = ".saves";
export const SAVE_FILE = "slot1.json";
export const RULE_WIDTH = 56;

// 完成第一章（旗標 chapter1.done）後，戰鬥失敗改於悅來客棧甦醒；此前仍在餘杭客棧。
export const SUZHOU_RESPAWN_SCENE = "suzhou-inn";

// 裝備部位（順序即選單顯示順序）
export const EQUIP_SLOTS: { id: EquipSlot; name: string }[] = [
  { id: "weapon", name: "武器" },
  { id: "armor", name: "防具" },
  { id: "head", name: "頭部" },
  { id: "boots", name: "足部" },
  { id: "accessory", name: "飾品" },
];
