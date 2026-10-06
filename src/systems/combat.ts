import { COMBAT_RULE, GUARD_RULE } from "../config/balance";
import {
  Character,
  Enemy,
  Fighter,
  Loadout,
  Skill,
  StatusType,
} from "../models/types";
import { SKILLS } from "../data/skills";
import { ITEMS } from "../data/items";
import { addItem, consumeItem } from "./inventory";
import * as ui from "../ui/display";
import { pick, pause, sleep } from "../ui/input";
import {
  BattleOptions,
  BattleOutcome,
  aliveOf,
  applyStatus,
  effectiveStat,
  enemyFlees,
  hasStatus,
  healAmount,
  isConsumable,
  physicalDamage,
  rollCrit,
  skillDamage,
  statusLabel,
  statusText,
  tickTimers,
  willingGuardian,
} from "./combat-core";

// 轉出 combat-core 的公開 API，維持 src 內既有 import 路徑（"../systems/combat"）不變。
export {
  BattleOptions,
  BattleOutcome,
  aliveOf,
  applyStatus,
  effectiveStat,
  enemyFlees,
  hasStatus,
  healAmount,
  isConsumable,
  physicalDamage,
  rollCrit,
  skillDamage,
  spawnEnemy,
  statusLabel,
  statusText,
  tickTimers,
  willingGuardian,
} from "./combat-core";

// 戰鬥過程每段之間的間隔（毫秒）。
const BATTLE_DELAY = 500;

function renderBattle(
  party: Character[],
  enemies: Enemy[],
  activeUid?: string,
  round?: number,
): void {
  ui.clear();
  ui.rule("═");
  console.log(ui.paint.bold(ui.paint.magenta("　戰　鬥")));
  if (round !== undefined) console.log(ui.paint.dim(`　第 ${round} 回合`));
  ui.rule("═");
  ui.blank();
  console.log(ui.paint.bold("　我方"));
  for (const m of party)
    console.log(
      ui.fighterLine(m, m.uid === activeUid, m.hp <= 0, statusText(m)),
    );
  ui.blank();
  console.log(ui.paint.bold("　敵方"));
  for (const e of enemies)
    console.log(ui.fighterLine(e, false, e.hp <= 0, statusText(e)));
  ui.blank();
  ui.rule();
}

async function chooseEnemy(enemies: Enemy[]): Promise<Enemy | null> {
  const alive = aliveOf(enemies);
  if (alive.length === 0) return null;
  if (alive.length === 1) return alive[0];
  return pick(
    "　選擇攻擊目標（Esc 返回）",
    alive.map((e) => ({
      label: `${e.name}（HP ${e.hp}/${e.maxHp}）`,
      value: e,
    })),
  );
}

async function chooseAlly(party: Character[]): Promise<Character | null> {
  const alive = aliveOf(party);
  if (alive.length === 0) return null;
  if (alive.length === 1) return alive[0];
  return pick(
    "　選擇對象（Esc 返回）",
    alive.map((p) => ({
      label: `${p.name}（HP ${p.hp}/${p.maxHp}）`,
      value: p,
    })),
  );
}

async function chooseDownedAlly(party: Character[]): Promise<Character | null> {
  const downed = party.filter((p) => p.hp <= 0);
  if (downed.length === 0) return null;
  if (downed.length === 1) return downed[0];
  return pick(
    "　復活誰？（Esc 返回）",
    downed.map((p) => ({ label: p.name, value: p })),
  );
}

// 戰鬥中可使用的道具種類（裝備／材料不列入）與 isConsumable 已移至 combat-core。

async function chooseItem(items: Loadout[]): Promise<Loadout | null> {
  const available = items.filter((e) => e.qty > 0 && isConsumable(e.itemId));
  if (available.length === 0) {
    ui.info("沒有可在戰鬥中使用的道具。");
    await pause();
    return null;
  }
  const opts: { label: string; value: Loadout | null }[] = available.map(
    (e) => ({
      label: `${ITEMS[e.itemId].name} ×${e.qty} — ${ITEMS[e.itemId].desc}`,
      value: e,
    }),
  );
  opts.push({ label: "返回", value: null });
  return pick("　使用物品", opts);
}

async function resolveTargets(
  skill: Skill,
  actor: Character,
  party: Character[],
  enemies: Enemy[],
): Promise<Fighter[] | null> {
  if (skill.kind === "revive") {
    const t = await chooseDownedAlly(party);
    return t ? [t] : null;
  }
  switch (skill.target) {
    case "enemy": {
      const t = await chooseEnemy(enemies);
      return t ? [t] : null;
    }
    case "all-enemies":
      return aliveOf(enemies);
    case "ally": {
      const t = await chooseAlly(party);
      return t ? [t] : null;
    }
    case "all-allies":
      return aliveOf(party);
    case "self":
      return [actor];
    default:
      return null;
  }
}

// 逐段顯示戰鬥過程，每段間隔 0.5 秒。
async function battleLog(text: string): Promise<void> {
  ui.info(text);
  await sleep(BATTLE_DELAY);
}

function applyAttack(actor: Fighter, target: Fighter, damageRate = 1): string {
  const res = rollCrit(
    physicalDamage(effectiveStat(actor, "atk"), effectiveStat(target, "def")),
  );
  const value = Math.max(1, Math.round(res.value * damageRate));
  target.hp = Math.max(0, target.hp - value);
  if (target.hp > 0) delete target.status.sleep; // 受擊驚醒
  return `${actor.name} 攻擊 ${target.name}，造成 ${value} 點傷害。${res.isCrit ? ui.paint.yellow("會心一擊！") : ""}`;
}

// 擋格彩蛋：willingGuardian 已移至 combat-core。

function applySkill(
  actor: Fighter,
  skill: Skill,
  targets: Fighter[],
): string[] {
  const logs: string[] = [];
  for (const t of targets) {
    if (skill.kind === "heal") {
      const amount = healAmount(effectiveStat(actor, "mag"), skill.power);
      const healed = Math.min(amount, t.maxHp - t.hp);
      t.hp += healed;
      logs.push(`${t.name} 恢復了 ${healed} 點生命。`);
      continue;
    }
    if (skill.kind === "revive") {
      if (t.hp > 0) {
        logs.push(`${t.name} 並未倒下。`);
        continue;
      }
      t.hp = Math.max(1, Math.floor(t.maxHp * 0.3));
      logs.push(`${t.name} 復活了！`);
      continue;
    }
    if (skill.kind === "buff") {
      for (const b of skill.buffs ?? []) t.buffs.push({ ...b });
      logs.push(`${t.name} 獲得「${skill.name}」的加持。`);
      continue;
    }
    if (skill.kind === "cure") {
      const cured = (skill.cures ?? []).filter((s) => (t.status[s] ?? 0) > 0);
      for (const s of cured) delete t.status[s];
      logs.push(
        cured.length > 0
          ? `${t.name} 解除了${cured.map(statusLabel).join("、")}。`
          : `${t.name} 沒有可解除的異常狀態。`,
      );
      continue;
    }
    // attack
    const res = rollCrit(skillDamage(skill.power, actor, t, skill.element));
    t.hp = Math.max(0, t.hp - res.value);
    if (t.hp > 0) delete t.status.sleep;
    logs.push(
      `${t.name} 受到 ${res.value} 點傷害。${res.isCrit ? ui.paint.yellow("會心一擊！") : ""}`,
    );
    if (skill.inflict && t.hp > 0 && Math.random() < skill.inflict.chance) {
      applyStatus(t, skill.inflict.status, skill.inflict.turns);
      logs.push(`${t.name} ${statusLabel(skill.inflict.status)}了！`);
    }
  }
  return logs;
}

// 一回合分兩階段：我方先全員下達指令，再依身法順序統一結算（含敵方）。
type PendingAction =
  | { type: "attack"; target: Fighter }
  | { type: "skill"; skill: Skill; targets: Fighter[] }
  | { type: "escape"; skill: Skill }
  | { type: "steal"; skill: Skill; target: Enemy }
  | { type: "item"; entry: Loadout; target: Fighter }
  | { type: "flee" };

function randomAlive<T extends Fighter>(list: T[]): T | null {
  const alive = aliveOf(list);
  return alive.length > 0
    ? alive[Math.floor(Math.random() * alive.length)]
    : null;
}

// 第一階段：只選擇行動與目標，不立即結算。
async function chooseAction(
  actor: Character,
  party: Character[],
  enemies: Enemy[],
  items: Loadout[],
  opts: BattleOptions,
): Promise<PendingAction> {
  const sealed = hasStatus(actor, "seal");
  while (true) {
    const action = await pick(`　▶ ${actor.name} 的行動`, [
      { label: "攻擊", value: "attack" },
      { label: "武功", value: "skill", disabled: sealed },
      { label: "物品", value: "item" },
      { label: "逃跑", value: "flee", disabled: opts.boss === true },
    ]);
    if (!action) continue;

    if (action === "attack") {
      const target = await chooseEnemy(enemies);
      if (!target) continue;
      return { type: "attack", target };
    }

    if (action === "skill") {
      if (sealed) {
        ui.info("咒封之下，無法施展仙術。");
        await pause();
        continue;
      }
      const usable = actor.skills
        .map((id) => SKILLS[id])
        .filter((s): s is Skill => Boolean(s));
      if (usable.length === 0) {
        ui.info("尚未習得任何武功。");
        await pause();
        continue;
      }
      const skill = await pick(
        "　施展武功",
        usable.map((s) => ({
          label: `${s.name}（真氣 ${s.mpCost}）— ${s.desc}`,
          value: s,
          disabled: s.mpCost > actor.mp,
        })),
      );
      if (!skill) continue;

      if (skill.kind === "escape") return { type: "escape", skill };

      if (skill.kind === "steal") {
        const target = await chooseEnemy(enemies);
        if (!target) continue;
        return { type: "steal", skill, target };
      }

      const targets = await resolveTargets(skill, actor, party, enemies);
      if (!targets || targets.length === 0) continue;
      return { type: "skill", skill, targets };
    }

    if (action === "item") {
      const entry = await chooseItem(items);
      if (!entry) continue;
      const item = ITEMS[entry.itemId];
      if (item.kind === "throw") {
        const target = await chooseEnemy(enemies);
        if (!target) continue;
        return { type: "item", entry, target };
      }
      if (item.kind === "revive") {
        if (party.filter((p) => p.hp <= 0).length === 0) {
          ui.info("沒有需要復活的同伴。");
          await pause();
          continue;
        }
        const target = await chooseDownedAlly(party);
        if (!target) continue;
        return { type: "item", entry, target };
      }
      const target = await chooseAlly(party);
      if (!target) continue;
      if (item.kind === "heal") {
        const hpGain = Math.max(0, target.maxHp - target.hp);
        const mpGain = item.mp ? Math.max(0, target.maxMp - target.mp) : 0;
        if (hpGain <= 0 && mpGain <= 0) {
          ui.info("生命與真氣已滿，無需使用。");
          await pause();
          continue;
        }
      } else if (target.mp >= target.maxMp) {
        ui.info("真氣已滿，無需使用。");
        await pause();
        continue;
      }
      return { type: "item", entry, target };
    }

    return { type: "flee" };
  }
}

// 第二階段：實際執行指令，回傳是否脫離戰鬥。
async function resolveAction(
  actor: Character,
  action: PendingAction,
  party: Character[],
  enemies: Enemy[],
  items: Loadout[],
): Promise<"acted" | "flee"> {
  if (action.type === "attack") {
    let target = action.target;
    if (target.hp <= 0) target = randomAlive(enemies) ?? target;
    if (target.hp <= 0) return "acted";
    await battleLog(applyAttack(actor, target));
    if (target.hp <= 0)
      await battleLog(ui.paint.dim(`${target.name} 被擊倒了。`));
    return "acted";
  }

  if (action.type === "escape") {
    actor.mp = Math.max(0, actor.mp - action.skill.mpCost);
    await battleLog(`${actor.name} 施展「${action.skill.name}」，從容脫身！`);
    return "flee";
  }

  if (action.type === "steal") {
    let target = action.target;
    if (target.hp <= 0) target = randomAlive(enemies) ?? target;
    actor.mp = Math.max(0, actor.mp - action.skill.mpCost);
    await battleLog(`${actor.name} 施展「${action.skill.name}」！`);
    if (target.hp > 0 && target.drops.length > 0) {
      const d = target.drops[Math.floor(Math.random() * target.drops.length)];
      addItem(items, d.itemId, 1);
      await battleLog(`　得手！竊得「${ITEMS[d.itemId].name}」。`);
    } else {
      await battleLog(`　${target.name} 身上空無一物。`);
    }
    return "acted";
  }

  if (action.type === "skill") {
    const skill = action.skill;
    let targets: Fighter[];
    if (skill.kind === "attack") {
      targets = action.targets.filter((t) => t.hp > 0);
      if (targets.length === 0) {
        const r = randomAlive(enemies);
        targets = r ? [r] : [];
      }
    } else if (skill.kind === "revive") {
      targets = action.targets.filter((t) => t.hp <= 0);
    } else {
      targets = action.targets.filter((t) => t.hp > 0);
    }
    if (targets.length === 0) return "acted";
    actor.mp = Math.max(0, actor.mp - skill.mpCost);
    await battleLog(`${actor.name} 施展「${skill.name}」！`);
    for (const l of applySkill(actor, skill, targets)) await battleLog(l);
    return "acted";
  }

  if (action.type === "flee") {
    if (Math.random() < COMBAT_RULE.fleeRate) {
      ui.info("成功脫離戰鬥！");
      return "flee";
    }
    await battleLog("逃跑失敗！");
    return "acted";
  }

  // item
  const item = ITEMS[action.entry.itemId];
  const target = action.target;
  consumeItem(items, action.entry);
  if (item.kind === "throw") {
    target.hp = Math.max(0, target.hp - item.value);
    await battleLog(
      `${actor.name} 投出「${item.name}」，${target.name} 受到 ${item.value} 點傷害。`,
    );
    if (target.hp <= 0)
      await battleLog(ui.paint.dim(`${target.name} 被擊倒了。`));
  } else if (item.kind === "revive") {
    if (target.hp > 0) {
      await battleLog(
        `${actor.name} 使用「${item.name}」，但 ${target.name} 並未倒下。`,
      );
    } else {
      target.hp = Math.max(1, Math.floor((target.maxHp * item.value) / 100));
      await battleLog(
        `${actor.name} 使用「${item.name}」，${target.name} 復活了！`,
      );
    }
  } else if (item.kind === "heal") {
    const hpGain = Math.min(item.value, Math.max(0, target.maxHp - target.hp));
    const mpGain = item.mp
      ? Math.min(item.mp, Math.max(0, target.maxMp - target.mp))
      : 0;
    target.hp += hpGain;
    target.mp += mpGain;
    await battleLog(
      `${actor.name} 使用「${item.name}」，${target.name} 恢復了 ${ui.recoverText(hpGain, mpGain)}。`,
    );
  } else {
    const healed = Math.min(item.value, Math.max(0, target.maxMp - target.mp));
    target.mp += healed;
    await battleLog(
      `${actor.name} 使用「${item.name}」，${target.name} 恢復了 ${healed} 點真氣。`,
    );
  }
  return "acted";
}

async function enemyTurn(enemy: Enemy, party: Character[]): Promise<void> {
  const targets = aliveOf(party);
  if (targets.length === 0) return;
  const target = targets[Math.floor(Math.random() * targets.length)];
  const usable = enemy.skills
    .map((id) => SKILLS[id])
    .filter(
      (s): s is Skill =>
        Boolean(s) && s.kind === "attack" && s.mpCost <= enemy.mp,
    );
  const useSkill =
    usable.length > 0 && Math.random() < (enemy.ai === "caster" ? 0.55 : 0.3);
  if (useSkill) {
    const skill = usable[Math.floor(Math.random() * usable.length)];
    enemy.mp -= skill.mpCost;
    await battleLog(`${enemy.name} 施展「${skill.name}」！`);
    for (const l of applySkill(enemy, skill, [target])) await battleLog(l);
    if (target.hp <= 0)
      await battleLog(ui.paint.red(`${target.name} 倒下了……`));
  } else {
    // 擋格彩蛋：同伴挺身替被攻擊者攔下這一擊。
    const guardian = willingGuardian(target, party);
    let hit = target;
    let rate = 1;
    if (guardian && Math.random() < GUARD_RULE.chance) {
      await battleLog(
        `${guardian.name} 一個箭步擋在 ${target.name} 身前，替他攔下了這一擊！`,
      );
      hit = guardian;
      rate = GUARD_RULE.damageRate;
    }
    await battleLog(applyAttack(enemy, hit, rate));
    if (hit.hp <= 0) await battleLog(ui.paint.red(`${hit.name} 倒下了……`));
  }
}

// 瘋魔：不分敵我，隨機攻擊場上任一戰鬥者。
async function confusedTurn(
  actor: Fighter,
  party: Character[],
  enemies: Enemy[],
): Promise<void> {
  const candidates = [...aliveOf(party), ...aliveOf(enemies)].filter(
    (f) => f.uid !== actor.uid,
  );
  if (candidates.length === 0) return;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  await battleLog(`${actor.name} 陷入瘋魔，不分敵我！`);
  await battleLog(applyAttack(actor, target));
  if (target.hp <= 0)
    await battleLog(ui.paint.dim(`${target.name} 被擊倒了。`));
}

function settleVictory(enemies: Enemy[]): BattleOutcome {
  let exp = 0;
  let gold = 0;
  const drops: { itemId: string; qty: number }[] = [];
  for (const e of enemies) {
    exp += e.expReward;
    gold += e.goldReward;
    for (const d of e.drops) {
      if (Math.random() < d.chance) {
        const min = d.min ?? 1;
        const max = d.max ?? 1;
        drops.push({
          itemId: d.itemId,
          qty: min + Math.floor(Math.random() * (max - min + 1)),
        });
      }
    }
  }
  return { victory: true, fled: false, exp, gold, drops };
}

export async function runBattle(
  party: Character[],
  enemies: Enemy[],
  items: Loadout[] = [],
  opts: BattleOptions = {},
): Promise<BattleOutcome> {
  // 進入戰鬥時清除上一場殘留的異常狀態與增益。
  for (const m of party) {
    m.status = {};
    m.buffs = [];
  }

  // 劇情：隊伍中有特定角色時，相關敵人會自動退避（如靈兒在隊時的仙靈島小妖）。
  const runaways = enemies.filter((e) => enemyFlees(e, party));
  if (runaways.length > 0) {
    const who = party.find((p) =>
      runaways.some((e) => (e.fleesFrom ?? []).includes(p.id)),
    );
    ui.blank();
    ui.narrate(
      `${runaways.map((e) => e.name).join("、")}見了${who?.name ?? "熟人"}，嚇得一哄而散，不敢造次。`,
    );
    await pause();
    const stayed = enemies.filter((e) => !runaways.includes(e));
    if (stayed.length === 0)
      return {
        victory: true,
        fled: false,
        enemiesFled: true,
        exp: 0,
        gold: 0,
        drops: [],
      };
    enemies = stayed;
  }

  ui.blank();
  ui.narrate(`${enemies.map((e) => e.name).join("、")} 出現在眼前！`);
  await pause();

  let round = 0;
  while (true) {
    round += 1;
    renderBattle(party, enemies, undefined, round);

    const order: Fighter[] = [...aliveOf(party), ...aliveOf(enemies)].sort(
      (a, b) => effectiveStat(b, "spd") - effectiveStat(a, "spd"),
    );

    // 第一階段：我方全員下達指令（依身法順序，無法行動者略過）。
    const pending = new Map<string, PendingAction>();
    for (const actor of order) {
      const ally = party.find((p) => p.uid === actor.uid && p.hp > 0);
      if (!ally) continue;
      if (
        hasStatus(ally, "sleep") ||
        hasStatus(ally, "paralyze") ||
        hasStatus(ally, "confuse")
      )
        continue;
      pending.set(
        ally.uid,
        await chooseAction(ally, party, enemies, items, opts),
      );
    }

    // 第二階段：我方與敵方依身法順序統一結算。
    for (const actor of order) {
      if (actor.hp <= 0) continue;

      // 回合開始：中毒扣血
      if (hasStatus(actor, "poison")) {
        const dmg = Math.max(1, Math.floor(actor.maxHp * 0.05));
        actor.hp = Math.max(0, actor.hp - dmg);
        await battleLog(
          ui.paint.magenta(`${actor.name} 毒發，損失 ${dmg} 點生命。`),
        );
        if (actor.hp <= 0)
          await battleLog(ui.paint.dim(`${actor.name} 被擊倒了。`));
      }

      if (actor.hp > 0) {
        const ally = party.find((p) => p.uid === actor.uid && p.hp > 0);
        if (hasStatus(actor, "sleep") || hasStatus(actor, "paralyze")) {
          const s: StatusType = hasStatus(actor, "sleep")
            ? "sleep"
            : "paralyze";
          await battleLog(`${actor.name} 處於${statusLabel(s)}，無法行動。`);
        } else if (hasStatus(actor, "confuse")) {
          await confusedTurn(actor, party, enemies);
        } else if (ally) {
          const act = pending.get(ally.uid);
          if (act) {
            const result = await resolveAction(
              ally,
              act,
              party,
              enemies,
              items,
            );
            if (result === "flee")
              return { victory: false, fled: true, exp: 0, gold: 0, drops: [] };
          }
        } else {
          await enemyTurn(actor as Enemy, party);
        }
      }

      // 回合結束：狀態與增益倒數
      tickTimers(actor);

      if (aliveOf(enemies).length === 0) return settleVictory(enemies);
      if (aliveOf(party).length === 0)
        return { victory: false, fled: false, exp: 0, gold: 0, drops: [] };
    }

    // 回合結束：待玩家看完本回合流程，按 Enter 再進入下一回合。
    await pause(`── 第 ${round} 回合結束 ──  按 Enter 進入下一回合`);
  }
}
