import { LEVEL_RULE } from "../config/balance";
import { MAX_LEVEL } from "../config/constants";
import { Character, EquipStats, Item } from "../models/types";
import { CHARACTER_TEMPLATES } from "../data/characters";
import { ITEMS } from "../data/items";

export function expToNext(level: number): number {
  return Math.floor(
    LEVEL_RULE.baseExp * Math.pow(LEVEL_RULE.growth, level - 1),
  );
}

// 加總目前裝備所提供的屬性加成。
export function equipBonus(c: Character): EquipStats {
  const total: EquipStats = {};
  for (const itemId of Object.values(c.equipment)) {
    const item = itemId ? ITEMS[itemId] : undefined;
    if (!item?.bonus) continue;
    for (const [key, value] of Object.entries(item.bonus)) {
      const k = key as keyof EquipStats;
      total[k] = (total[k] ?? 0) + (value ?? 0);
    }
  }
  return total;
}

// 該角色是否能裝備此物品（依原作的「裝備角色」限制）。
export function canEquip(c: Character, item: Item): boolean {
  if (!item.equipBy || item.equipBy.length === 0) return true;
  const gender = CHARACTER_TEMPLATES[c.id]?.gender;
  return item.equipBy.some((t) => t === c.id || t === gender);
}

export function recomputeStats(c: Character): void {
  const g = LEVEL_RULE.growthPerLevel;
  const lv = c.level - 1;
  const b = equipBonus(c);
  const prevMaxHp = c.maxHp;
  const prevMaxMp = c.maxMp;
  c.maxHp = c.base.hp + g.hp * lv + (b.hp ?? 0);
  c.maxMp = c.base.mp + g.mp * lv + (b.mp ?? 0);
  c.atk = c.base.atk + g.atk * lv + (b.atk ?? 0);
  c.def = c.base.def + g.def * lv + (b.def ?? 0);
  c.spd = c.base.spd + g.spd * lv + (b.spd ?? 0);
  c.mag = c.base.mag + g.mag * lv + (b.mag ?? 0);
  if (prevMaxHp > 0) c.hp += c.maxHp - prevMaxHp;
  if (prevMaxMp > 0) c.mp += c.maxMp - prevMaxMp;
  c.hp = Math.min(c.hp, c.maxHp);
  c.mp = Math.min(c.mp, c.maxMp);
}

export interface LevelUpLog {
  level: number;
  skills: string[];
}

export function gainExp(c: Character, amount: number): LevelUpLog[] {
  const logs: LevelUpLog[] = [];
  c.exp += amount;
  while (c.level < MAX_LEVEL && c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level);
    c.level += 1;
    recomputeStats(c);
    const learnset = CHARACTER_TEMPLATES[c.id]?.learnset ?? [];
    const learned = learnset
      .filter((l) => l.level === c.level)
      .map((l) => l.skill);
    for (const s of learned) if (!c.skills.includes(s)) c.skills.push(s);
    logs.push({ level: c.level, skills: learned });
  }
  return logs;
}
