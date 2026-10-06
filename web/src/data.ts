import {
  LEVEL_RULE,
  COMBAT_RULE,
  EXPLORE_RULE,
  SHOP_RULE,
  GUARD_RULE,
} from "../../src/config/balance";
import {
  EQUIP_SLOTS,
  GAME_SUBTITLE,
  GAME_TITLE,
  MAX_LEVEL,
} from "../../src/config/constants";
import { CHAPTER_01 } from "../../src/data/chapters/chapter01";
import { CHARACTER_TEMPLATES } from "../../src/data/characters";
import { AREAS, ENEMIES } from "../../src/data/enemies";
import { ITEMS } from "../../src/data/items";
import { OBJECTIVE_ALL_DONE, OBJECTIVES } from "../../src/data/objectives";
import { SCENES, START_SCENE } from "../../src/data/scenes";
import { SHOPS } from "../../src/data/shops";
import { SKILLS } from "../../src/data/skills";

// 網頁版直接取用 src/ 的共用資料，避免與終端機版重複維護。
// 鍵名與 scripts/build-web.ts 原本的 window.__PALADIN__ payload 完全一致。
export const D = {
  START_SCENE,
  SCENES,
  STORY: CHAPTER_01.nodes,
  ENEMIES,
  AREAS,
  ITEMS,
  OBJECTIVES,
  OBJECTIVE_ALL_DONE,
  SKILLS,
  SHOPS,
  CHARACTERS: CHARACTER_TEMPLATES,
  LEVEL_RULE,
  COMBAT_RULE,
  EXPLORE_RULE,
  SHOP_RULE,
  GUARD_RULE,
  MAX_LEVEL,
  EQUIP_SLOTS,
  GAME_TITLE,
  GAME_SUBTITLE,
};
