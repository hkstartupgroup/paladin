import { COMBAT_RULE } from "../config/balance";
import {
  Character,
  ElementType,
  Enemy,
  Fighter,
  StatKey,
  StatusType,
} from "../models/types";
import { ENEMIES } from "../data/enemies";
import { CHARACTER_TEMPLATES } from "../data/characters";
import { ITEMS } from "../data/items";

// 戰鬥「純規則」核心：不依賴任何終端 UI，供終端引擎與網頁版共用。
// 依賴 UI 的戰鬥流程請見 combat.ts。

export interface BattleOutcome {
  victory: boolean;
  fled: boolean;
  exp: number;
  gold: number;
  drops: { itemId: string; qty: number }[];
  /** 敵人因劇情（如隊伍中有趙靈兒）自動退避，未實際開戰。 */
  enemiesFled?: boolean;
}

export interface BattleOptions {
  boss?: boolean;
}

let uidSeq = 0;

export function spawnEnemy(templateId: string): Enemy {
  const t = ENEMIES[templateId];
  if (!t) throw new Error(`未知敵人：${templateId}`);
  uidSeq += 1;
  return {
    uid: `${t.id}-${uidSeq}`,
    id: t.id,
    name: t.name,
    level: t.level,
    maxHp: t.hp,
    hp: t.hp,
    maxMp: t.mp,
    mp: t.mp,
    atk: t.atk,
    def: t.def,
    spd: t.spd,
    mag: t.mag,
    expReward: t.exp,
    goldReward: t.gold,
    ai: t.ai,
    skills: [...t.skills],
    drops: t.drops.map((d) => ({ ...d })),
    fleesFrom: [...(t.fleesFrom ?? [])],
    status: {},
    buffs: [],
  };
}

export function aliveOf<T extends Fighter>(list: T[]): T[] {
  return list.filter((u) => u.hp > 0);
}

// 敵人是否因隊伍中有特定角色而退避。
export function enemyFlees(enemy: Enemy, party: Character[]): boolean {
  return (enemy.fleesFrom ?? []).some((id) => party.some((p) => p.id === id));
}

// ───────────── 異常狀態與增益 ─────────────

const STATUS_LABEL: Record<StatusType, string> = {
  poison: "中毒",
  sleep: "昏睡",
  paralyze: "定身",
  confuse: "瘋魔",
  seal: "咒封",
};

export function statusLabel(s: StatusType): string {
  return STATUS_LABEL[s];
}

// 計入增益後的實際數值。
export function effectiveStat(f: Fighter, key: StatKey): number {
  let rate = 0;
  for (const b of f.buffs) if (b.stat === key) rate += b.rate;
  return Math.round(f[key] * (1 + rate));
}

export function statusText(f: Fighter): string {
  const names = (Object.keys(f.status) as StatusType[])
    .filter((s) => (f.status[s] ?? 0) > 0)
    .map(statusLabel);
  const buffed = f.buffs.length > 0 ? ["增益"] : [];
  const all = [...names, ...buffed];
  return all.length > 0 ? `〔${all.join("、")}〕` : "";
}

export function hasStatus(f: Fighter, s: StatusType): boolean {
  return (f.status[s] ?? 0) > 0;
}

export function applyStatus(f: Fighter, s: StatusType, turns: number): void {
  f.status[s] = Math.max(f.status[s] ?? 0, turns);
}

// 回合結束：狀態與增益倒數。
export function tickTimers(f: Fighter): void {
  for (const s of Object.keys(f.status) as StatusType[]) {
    const left = (f.status[s] ?? 0) - 1;
    if (left > 0) f.status[s] = left;
    else delete f.status[s];
  }
  f.buffs = f.buffs
    .map((b) => ({ ...b, turns: b.turns - 1 }))
    .filter((b) => b.turns > 0);
}

export function physicalDamage(
  atk: number,
  def: number,
  variance: number = COMBAT_RULE.variance,
): number {
  const base = atk * (100 / (100 + def));
  const factor = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(1, Math.round(base * factor));
}

export function skillDamage(
  power: number,
  attacker: Fighter,
  defender: Fighter,
  element: ElementType,
  variance: number = COMBAT_RULE.variance,
): number {
  const physical = element === "sword" || element === "none";
  const src = physical
    ? effectiveStat(attacker, "atk")
    : effectiveStat(attacker, "mag");
  const defense = effectiveStat(defender, "def");
  const effDef = physical ? defense : defense * 0.5;
  const base = src * (power / 100) * (100 / (100 + effDef));
  const factor = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(1, Math.round(base * factor));
}

export function rollCrit(raw: number): { value: number; isCrit: boolean } {
  if (Math.random() < COMBAT_RULE.critRate)
    return {
      value: Math.round(raw * COMBAT_RULE.critMultiplier),
      isCrit: true,
    };
  return { value: raw, isCrit: false };
}

// 治療量公式：與戰鬥內外共用。
export function healAmount(mag: number, power: number): number {
  return Math.round(mag * (power / 100) * 2 + 10);
}

// 戰鬥中可使用的道具種類（裝備／材料不列入）。
const CONSUMABLE_KINDS = ["heal", "mana", "revive", "throw"];

export function isConsumable(itemId: string): boolean {
  return CONSUMABLE_KINDS.includes(ITEMS[itemId].kind);
}

// 擋格彩蛋：找出願意替 target 攔下攻擊的同伴（見 characters.ts 的 guard 設定）。
export function willingGuardian(
  target: Character,
  party: Character[],
): Character | null {
  for (const g of party) {
    if (g.uid === target.uid || g.hp <= 0) continue;
    const cfg = CHARACTER_TEMPLATES[g.id]?.guard;
    if (!cfg) continue;
    if ((cfg.except ?? []).includes(target.id)) continue;
    const protects =
      (cfg.ids ?? []).includes(target.id) ||
      (cfg.females === true &&
        CHARACTER_TEMPLATES[target.id]?.gender === "female");
    if (protects) return g;
  }
  return null;
}
