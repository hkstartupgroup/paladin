import { EquipSlot } from "../models/types";

export const GAME_TITLE = "仙劍奇俠傳";
export const GAME_SUBTITLE = "終端文字版 · 第一章 仙島求藥";
export const MAX_LEVEL = 99;
export const SAVE_DIR = ".saves";
export const SAVE_FILE = "slot1.json";
export const RULE_WIDTH = 56;

// 裝備部位（順序即選單顯示順序）
export const EQUIP_SLOTS: { id: EquipSlot; name: string }[] = [
  { id: "weapon", name: "武器" },
  { id: "armor", name: "防具" },
  { id: "head", name: "頭部" },
  { id: "boots", name: "足部" },
  { id: "accessory", name: "飾品" },
];
