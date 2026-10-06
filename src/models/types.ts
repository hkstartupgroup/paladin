export type ElementType =
  | "sword"
  | "thunder"
  | "ice"
  | "fire"
  | "wind"
  | "earth"
  | "holy"
  | "none";

// 異常狀態
export type StatusType = "poison" | "sleep" | "paralyze" | "confuse" | "seal";

export type StatKey = "atk" | "def" | "spd" | "mag";

export interface BuffEffect {
  stat: StatKey;
  /** 增益倍率（0.5 表示 +50%）。 */
  rate: number;
  /** 持續回合數。 */
  turns: number;
}

export type SkillKind =
  | "attack"
  | "heal"
  | "revive"
  | "buff"
  | "cure"
  | "steal"
  | "escape";

export interface Skill {
  id: string;
  name: string;
  element: ElementType;
  kind: SkillKind;
  target: "enemy" | "all-enemies" | "ally" | "all-allies" | "self";
  mpCost: number;
  power: number;
  desc: string;
  /** kind === "attack" 時，附帶施加的異常狀態。 */
  inflict?: { status: StatusType; chance: number; turns: number };
  /** kind === "buff" 時，施加的增益。 */
  buffs?: BuffEffect[];
  /** kind === "cure" 時，可解除的異常狀態。 */
  cures?: StatusType[];
}

export interface BaseStats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
}

export type EquipSlot = "weapon" | "armor" | "head" | "boots" | "accessory";

export interface EquipStats {
  hp?: number;
  mp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  mag?: number;
}

export interface Item {
  id: string;
  name: string;
  kind:
    | "heal"
    | "mana"
    | "revive"
    | "throw"
    | "equip"
    | "material"
    | "treasure";
  // value 的意義依 kind 而定：
  //   heal→恢復的體力、mana→恢復的真氣、revive→復活時回復體力的百分比、throw→投擲固定傷害
  value: number;
  // kind === "heal" 時，額外恢復的真氣量（原作「體力真氣+X」類道具）。
  mp?: number;
  desc: string;
  price: number;
  // kind === "equip" 時使用
  slot?: EquipSlot;
  bonus?: EquipStats;
  // kind === "equip" 時使用：可裝備者（角色 id，或 "male"／"female"）。未填表示不限。
  equipBy?: string[];
  // kind === "treasure" 時使用：開啟後獲得的內容（包袱、手卷等）。
  contains?: {
    gold?: number;
    items?: Loadout[];
    skills?: string[];
  };
}

export interface Fighter {
  uid: string;
  name: string;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
  /** 異常狀態：狀態 → 剩餘回合數。 */
  status: Partial<Record<StatusType, number>>;
  /** 增益（可疊加）。 */
  buffs: BuffEffect[];
}

export interface Character extends Fighter {
  id: string;
  level: number;
  exp: number;
  base: BaseStats;
  skills: string[];
  equipment: Partial<Record<EquipSlot, string>>;
}

export type EnemyAi = "aggressive" | "caster";

export interface DropSpec {
  itemId: string;
  chance: number;
  min?: number;
  max?: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  level: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
  exp: number;
  gold: number;
  ai: EnemyAi;
  skills: string[];
  drops: DropSpec[];
  /** 隊伍中若有這些角色，敵人會自動退避（依劇情）。 */
  fleesFrom?: string[];
}

export interface Enemy extends Fighter {
  id: string;
  level: number;
  expReward: number;
  goldReward: number;
  ai: EnemyAi;
  skills: string[];
  drops: DropSpec[];
  fleesFrom: string[];
}

export interface Loadout {
  itemId: string;
  qty: number;
}

export interface GameState {
  party: Character[];
  gold: number;
  items: Loadout[];
  sceneId: string;
  flags: Record<string, boolean>;
}

export interface StoryChoice {
  label: string;
  next: string;
}

export interface StoryNode {
  id: string;
  text: string[];
  choices?: StoryChoice[];
  next?: string;
  battle?: string[];
  boss?: boolean;
  rewards?: { exp?: number; gold?: number; items?: Loadout[] };
  learnSkills?: string[];
  /** 加入隊伍的角色 id（於戰鬥前生效）。 */
  joinParty?: string[];
  setFlags?: string[];
  end?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  nodes: Record<string, StoryNode>;
}

export interface SceneExit {
  to: string;
  label: string;
  requires?: string[];
  hideWhen?: string[];
  /** 這些旗標成立時，出口封閉（仍顯示並提示 lockedText）。旗標前加 "!" 表示須未成立。 */
  lockedWhen?: string[];
  lockedText?: string[];
}

export interface Interactable {
  id: string;
  name: string;
  kind: "npc" | "object";
  story?: string;
  text?: string[];
  repeatText?: string[];
  requires?: string[];
  hideWhen?: string[];
  repeatable?: boolean;
  gold?: number;
  items?: Loadout[];
  setFlags?: string[];
  battle?: string[];
  area?: string;
  boss?: boolean;
  /** 商店 id（對應 data/shops.ts 的 SHOPS）。互動時開啟買賣選單。 */
  shop?: string;
  /** 客棧投宿休息：所需金錢（0 表示免費，如李逍遙自己的房間）。互動時回復全隊生命與真氣。 */
  restCost?: number;
}

export interface Shop {
  id: string;
  name: string;
  /** 進店時的招呼語。 */
  greeting: string[];
  /** 販售的商品 id（售價取自 ITEMS 的 price）。 */
  stock: string[];
}

export interface GameScene {
  id: string;
  name: string;
  enterStory?: string;
  exits: SceneExit[];
  interactables: Interactable[];
}
