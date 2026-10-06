import { BaseStats, Character, EquipSlot } from "../models/types";

export interface GuardConfig {
  /** true 表示願替任何女性同伴擋格。 */
  females?: boolean;
  /** 願替這些角色 id 擋格。 */
  ids?: string[];
  /** 不替這些角色 id 擋格（優先於上面兩項）。 */
  except?: string[];
}

export interface CharacterTemplate {
  id: string;
  name: string;
  gender?: "male" | "female";
  base: BaseStats;
  baseSkills: string[];
  learnset: { level: number; skill: string }[];
  /** 入隊時自帶的裝備（部位 → 物品 id）。 */
  defaultEquipment?: Partial<Record<EquipSlot, string>>;
  /** 擋格彩蛋：願意替同伴攔下敵方普通攻擊。 */
  guard?: GuardConfig;
}

export const CHARACTER_TEMPLATES: Record<string, CharacterTemplate> = {
  "li-xiaoyao": {
    id: "li-xiaoyao",
    name: "李逍遙",
    gender: "male",
    base: { hp: 90, mp: 24, atk: 14, def: 8, spd: 11, mag: 8 },
    // 彩蛋：李逍遙願替任何女角擋格，唯獨不替林月如（歡喜冤家）。
    guard: { females: true, except: ["lin-yueru"] },
    // 氣療術為自帶仙術。
    baseSkills: ["qi-heal"],
    // 依原作升級習得；御劍術／酒神（酒劍仙）、冰心訣（手卷）、飛龍探雲手、
    // 醉仙望月步、仙風雲體術、靈葫咒、山神／雷神（女媧遺跡）等由劇情或支線取得，不列入 learnset。
    learnset: [
      { level: 7, skill: "tianshi-talisman" },
      { level: 9, skill: "tian-gang" },
      { level: 11, skill: "ning-shen" },
      { level: 13, skill: "myriad-swords" },
      { level: 18, skill: "yuan-ling" },
      { level: 20, skill: "zhen-yuan" },
      { level: 23, skill: "heaven-sword" },
      { level: 28, skill: "jin-chan" },
      { level: 30, skill: "xiaoyao-sword" },
      { level: 36, skill: "sword-god" },
    ],
  },
  "zhao-linger": {
    id: "zhao-linger",
    name: "趙靈兒",
    gender: "female",
    base: { hp: 78, mp: 36, atk: 10, def: 6, spd: 12, mag: 16 },
    // 初始五系咒法與觀音咒、淨衣咒、金剛咒、回夢、冰心訣。
    baseSkills: [
      "guan-yin",
      "jing-yi",
      "jin-gang",
      "hui-meng",
      "ice-heart",
      "feng-zhou",
      "lei-zhou",
      "bing-zhou",
      "yan-zhou",
      "tu-zhou",
    ],
    learnset: [
      { level: 7, skill: "xuan-feng" },
      { level: 8, skill: "wu-qi" },
      { level: 9, skill: "xuan-bing" },
      { level: 10, skill: "fei-yan" },
      { level: 11, skill: "five-thunder" },
      { level: 13, skill: "san-mei" },
      { level: 28, skill: "kuang-lei" },
      { level: 29, skill: "lian-yu" },
      { level: 32, skill: "wu-shen" },
    ],
    // 趙靈兒入隊時自帶的衣裝（原作可考品項）。
    defaultEquipment: {
      weapon: "fairy-sword",
      armor: "cloth-robe",
      head: "silk-scarf",
      boots: "straw-shoes",
    },
  },
};

export function createCharacter(id: string): Character {
  const t = CHARACTER_TEMPLATES[id];
  if (!t) throw new Error(`未知角色：${id}`);
  return {
    uid: id,
    id,
    name: t.name,
    level: 1,
    exp: 0,
    base: { ...t.base },
    maxHp: t.base.hp,
    hp: t.base.hp,
    maxMp: t.base.mp,
    mp: t.base.mp,
    atk: t.base.atk,
    def: t.base.def,
    spd: t.base.spd,
    mag: t.base.mag,
    skills: [...t.baseSkills],
    equipment: { ...(t.defaultEquipment ?? {}) },
    status: {},
    buffs: [],
  };
}
