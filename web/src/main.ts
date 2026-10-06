/* 仙劍奇俠傳 · 終端文字版 — 網頁版引擎
   流程與 DOM 呈現置於此，遊戲規則與資料共用 src/ 的 systems 與 data。 */
import { D } from "./data";
import { createCharacter } from "../../src/data/characters";
import {
  expToNext,
  recomputeStats,
  gainExp,
  canEquip,
} from "../../src/systems/leveling";
import {
  visibleExits,
  availableInteractables,
  rollExplore,
  isDone,
  markDone,
  hasEntered,
  markEntered,
} from "../../src/systems/explore";
import { addItem, consumeItem } from "../../src/systems/inventory";
import { sellPrice, buyItem, sellItem } from "../../src/systems/shop";
import { restParty } from "../../src/systems/rest";
import { openTreasure } from "../../src/systems/treasure";
import { currentObjective } from "../../src/systems/objectives";
import {
  effectiveStat,
  applyStatus,
  tickTimers,
  spawnEnemy,
  isConsumable,
  willingGuardian,
  healAmount,
  physicalDamage,
  skillDamage,
  rollCrit,
  enemyFlees,
} from "../../src/systems/combat-core";

var SAVE_KEY = "paladin.save.v1";

var state = null;
var logEl, actionsEl, barEl;
var pending = null;

// ───────────────────────── 基本工具 ─────────────────────────
function scene() {
  return D.SCENES[state.sceneId];
}
function has(flags) {
  return (
    !flags ||
    flags.length === 0 ||
    flags.every(function (f) {
      return f.charAt(0) === "!"
        ? state.flags[f.slice(1)] !== true
        : state.flags[f] === true;
    })
  );
}
function alive(list) {
  return list.filter(function (u) {
    return u.hp > 0;
  });
}
// 恢復量文字，例如「20 點生命與 20 點真氣」。
function recoverText(hp, mp) {
  var parts = [];
  if (hp > 0) parts.push(hp + " 點生命");
  if (mp > 0) parts.push(mp + " 點真氣");
  return parts.join("與");
}
// ── 異常狀態與增益 ──
var STATUS_LABEL = {
  poison: "中毒",
  sleep: "昏睡",
  paralyze: "定身",
  confuse: "瘋魔",
  seal: "咒封",
};
function statusLabel(s) {
  return STATUS_LABEL[s] || s;
}
function statusText(f) {
  var names = Object.keys(f.status || {})
    .filter(function (s) {
      return f.status[s] > 0;
    })
    .map(statusLabel);
  if ((f.buffs || []).length > 0) names.push("增益");
  return names.length ? "〔" + names.join("、") + "〕" : "";
}
function hasStatus(f, s) {
  return ((f.status || {})[s] || 0) > 0;
}

// ───────────────────────── 角色與成長 ─────────────────────────
function grantExp(amount) {
  state.party.forEach(function (m) {
    if (m.hp <= 0) return;
    gainExp(m, amount).forEach(function (lg) {
      logLine(m.name + " 提升至 Lv." + lg.level + "！", "info");
      lg.skills.forEach(function (sid) {
        logLine("　習得新武功「" + D.SKILLS[sid].name + "」！", "info");
      });
    });
  });
}
function learnSkills(ids) {
  var leader = state.party[0];
  ids.forEach(function (id) {
    if (leader.skills.indexOf(id) >= 0) return;
    leader.skills.push(id);
    logLine(
      "　" + leader.name + " 領悟了「" + D.SKILLS[id].name + "」！",
      "info",
    );
  });
}

// ───────────────────────── 場景與互動 ─────────────────────────

// ───────────────────────── UI ─────────────────────────
function scrollBottom() {
  requestAnimationFrame(function () {
    logEl.scrollTop = logEl.scrollHeight;
  });
}
function logLine(text, cls) {
  var div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  var m = /^([^\s：]{1,8})：(.+)$/.exec(text);
  if (m) {
    var sp = document.createElement("span");
    sp.className = "sp";
    sp.textContent = "【" + m[1] + "】";
    div.appendChild(sp);
    div.appendChild(document.createTextNode(" " + m[2]));
  } else {
    div.textContent = text;
  }
  logEl.appendChild(div);
  while (logEl.childNodes.length > 500) logEl.removeChild(logEl.firstChild);
  scrollBottom();
}
function logLines(lines) {
  lines.forEach(function (l) {
    var spoken = /^([^\s：]{1,8})：(.+)$/.test(l);
    logLine(l, spoken ? null : "dim");
  });
}
function renderStatus() {
  var m = state.party[0];
  barEl.querySelector(".status").textContent =
    m.name +
    "　Lv." +
    m.level +
    "　生命 " +
    m.hp +
    "/" +
    m.maxHp +
    "　真氣 " +
    m.mp +
    "/" +
    m.maxMp +
    "　金錢 " +
    state.gold;
  barEl.querySelector(".place").textContent = "現在地點：" + scene().name;
  barEl.querySelector(".objective").textContent = currentObjective(state);
}
function choose(title, options): Promise<any> {
  return new Promise(function (resolve) {
    pending = { resolve: resolve };
    actionsEl.innerHTML = "";
    if (title) {
      var p = document.createElement("div");
      p.className = "prompt";
      p.textContent = title;
      actionsEl.appendChild(p);
    }
    var wrap = document.createElement("div");
    wrap.className = "btns";
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.textContent = o.label;
      if (o.disabled) b.disabled = true;
      b.addEventListener("click", function () {
        if (actionsEl.innerHTML === "") return;
        var r = pending;
        pending = null;
        actionsEl.innerHTML = "";
        scrollBottom();
        if (r) r.resolve(o.value);
      });
      wrap.appendChild(b);
    });
    actionsEl.appendChild(wrap);
    scrollBottom();
  });
}
function message(text) {
  return choose(text, [{ label: "繼續 ▸", value: true }]);
}
function playText(lines) {
  logLines(lines);
  return message("　");
}
function say(text) {
  logLine(text, "sys");
}

// ───────────────────────── 劇情 ─────────────────────────
function applyRewards(node) {
  var r = node.rewards;
  if (!r) return;
  if (r.gold) {
    state.gold += r.gold;
    logLine("　獲得金錢 " + r.gold + " 文。", "info");
  }
  (r.items || []).forEach(function (it) {
    addItem(state.items, it.itemId, it.qty);
    logLine("　獲得物品：" + D.ITEMS[it.itemId].name + " ×" + it.qty, "info");
  });
  if (r.exp) grantExp(r.exp);
}
function joinParty(memberIds) {
  var leader = state.party[0];
  memberIds.forEach(function (id) {
    var exists = state.party.some(function (m) {
      return m.id === id;
    });
    if (exists) return;
    var member = createCharacter(id);
    // 新夥伴等級比照領隊，並依 learnset 補齊應習得的武功。
    while (member.level < leader.level)
      gainExp(member, expToNext(member.level));
    recomputeStats(member); // 計入入隊自帶裝備的加成
    member.exp = leader.exp;
    member.hp = member.maxHp;
    member.mp = member.maxMp;
    state.party.push(member);
    logLine("　" + member.name + " 加入了隊伍！", "sys");
  });
  renderStatus();
}
async function runStory(startId) {
  var id = startId;
  while (id) {
    var node = D.STORY[id];
    if (!node) throw new Error("劇情節點不存在：" + id);
    await playText(node.text);
    if (node.setFlags)
      node.setFlags.forEach(function (f) {
        state.flags[f] = true;
      });
    applyRewards(node);
    if (node.learnSkills) learnSkills(node.learnSkills);
    if (node.joinParty) joinParty(node.joinParty);
    renderStatus();
    if (node.battle && node.battle.length > 0) {
      var won = await battle(node.battle, node.boss === true);
      if (!won) return false;
    }
    if (node.end) {
      logLine("（本章結束 · 後續章節敬請期待）", "sys");
      await message("　");
      return true;
    }
    if (node.choices && node.choices.length > 0) {
      id = await choose(
        "　抉擇",
        node.choices.map(function (c) {
          return { label: c.label, value: c.next };
        }),
      );
    } else {
      id = node.next;
    }
  }
  return true;
}

// ───────────────────────── 戰鬥 ─────────────────────────
function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms);
  });
}
// 逐段顯示戰鬥過程，每段間隔 0.5 秒。
async function battleLog(text, cls) {
  logLine(text, cls);
  await sleep(500);
}
function battleLine() {
  state.party.forEach(function (p) {
    logLine(
      "　我方｜" +
        p.name +
        " HP " +
        Math.max(0, p.hp) +
        "/" +
        p.maxHp +
        " 真氣 " +
        p.mp +
        "/" +
        p.maxMp +
        (p.hp <= 0 ? "（倒下）" : "") +
        (p.hp > 0 && statusText(p) ? " " + statusText(p) : ""),
      "battle",
    );
  });
  battleEnemies.forEach(function (e) {
    logLine(
      "　敵方｜" +
        e.name +
        " HP " +
        Math.max(0, e.hp) +
        "/" +
        e.maxHp +
        (e.hp <= 0 ? "（倒下）" : "") +
        (e.hp > 0 && statusText(e) ? " " + statusText(e) : ""),
      "battle",
    );
  });
}
var battleEnemies = [];
async function chooseTarget(list, title) {
  var a = alive(list);
  if (a.length === 1) return a[0];
  var opts = a.map(function (e) {
    return {
      label: e.name + "（HP " + e.hp + "/" + e.maxHp + "）",
      value: e,
    };
  });
  opts.push({ label: "返回", value: null });
  return choose(title + "（可返回）", opts);
}
async function applyAttack(actor, target, damageRate = 1) {
  var rate = damageRate || 1;
  var res = rollCrit(
    physicalDamage(effectiveStat(actor, "atk"), effectiveStat(target, "def")),
  );
  var value = Math.max(1, Math.round(res.value * rate));
  target.hp = Math.max(0, target.hp - value);
  if (target.hp > 0 && target.status) delete target.status.sleep;
  await battleLog(
    actor.name +
      " 攻擊 " +
      target.name +
      "，造成 " +
      value +
      " 點傷害。" +
      (res.isCrit ? " 會心一擊！" : ""),
    "battle",
  );
}
// 擋格彩蛋的 willingGuardian 改由 combat-core 提供。
async function applySkill(actor, skill, targets) {
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i];
    if (skill.kind === "heal") {
      var healed = Math.min(
        healAmount(effectiveStat(actor, "mag"), skill.power),
        t.maxHp - t.hp,
      );
      t.hp += healed;
      await battleLog(t.name + " 恢復了 " + healed + " 點生命。", "info");
      continue;
    }
    if (skill.kind === "revive") {
      if (t.hp > 0) {
        await battleLog(t.name + " 並未倒下。", "dim");
        continue;
      }
      t.hp = Math.max(1, Math.floor(t.maxHp * 0.3));
      await battleLog(t.name + " 復活了！", "info");
      continue;
    }
    if (skill.kind === "buff") {
      (skill.buffs || []).forEach(function (b) {
        t.buffs.push({ stat: b.stat, rate: b.rate, turns: b.turns });
      });
      await battleLog(t.name + " 獲得「" + skill.name + "」的加持。", "info");
      continue;
    }
    if (skill.kind === "cure") {
      var cured = (skill.cures || []).filter(function (s) {
        return hasStatus(t, s);
      });
      cured.forEach(function (s) {
        delete t.status[s];
      });
      await battleLog(
        cured.length
          ? t.name + " 解除了" + cured.map(statusLabel).join("、") + "。"
          : t.name + " 沒有可解除的異常狀態。",
        "info",
      );
      continue;
    }
    // attack
    var res = rollCrit(skillDamage(skill.power, actor, t, skill.element));
    t.hp = Math.max(0, t.hp - res.value);
    if (t.hp > 0 && t.status) delete t.status.sleep;
    await battleLog(
      t.name +
        " 受到 " +
        res.value +
        " 點傷害。" +
        (res.isCrit ? " 會心一擊！" : ""),
      "battle",
    );
    if (skill.inflict && t.hp > 0 && Math.random() < skill.inflict.chance) {
      applyStatus(t, skill.inflict.status, skill.inflict.turns);
      await battleLog(
        t.name + " " + statusLabel(skill.inflict.status) + "了！",
        "warn",
      );
    }
  }
}
function randomAlive(list) {
  var a = alive(list);
  return a.length > 0 ? a[Math.floor(Math.random() * a.length)] : null;
}
// 第一階段：只選擇行動與目標，不立即結算。
async function chooseAction(actor, boss) {
  var sealed = hasStatus(actor, "seal");
  while (true) {
    var action = await choose("▶ " + actor.name + " 的行動", [
      { label: "攻擊", value: "attack" },
      { label: "武功", value: "skill", disabled: sealed },
      { label: "物品", value: "item" },
      { label: "逃跑", value: "flee", disabled: boss },
    ]);
    if (action === "attack") {
      var t = await chooseTarget(battleEnemies, "選擇攻擊目標");
      if (!t) continue;
      return { type: "attack", target: t };
    }
    if (action === "skill") {
      if (sealed) {
        logLine("咒封之下，無法施展仙術。", "dim");
        await message("　");
        continue;
      }
      var usable = actor.skills
        .map(function (id) {
          return D.SKILLS[id];
        })
        .filter(Boolean);
      if (usable.length === 0) {
        logLine("尚未習得任何武功。", "dim");
        await message("　");
        continue;
      }
      var skillOpts = usable.map(function (s) {
        return {
          label: s.name + "（真氣 " + s.mpCost + "）— " + s.desc,
          value: s,
          disabled: s.mpCost > actor.mp,
        };
      });
      skillOpts.push({ label: "返回", value: null });
      var skill = await choose("施展武功（可返回）", skillOpts);
      if (!skill) continue;
      if (skill.kind === "escape") return { type: "escape", skill: skill };
      if (skill.kind === "steal") {
        var st = await chooseTarget(battleEnemies, "選擇目標");
        if (!st) continue;
        return { type: "steal", skill: skill, target: st };
      }
      var targets = await resolveTargets(skill, actor);
      if (!targets || targets.length === 0) continue;
      return { type: "skill", skill: skill, targets: targets };
    }
    if (action === "item") {
      var entry = await chooseItem();
      if (!entry) continue;
      var item = D.ITEMS[entry.itemId];
      if (item.kind === "throw") {
        var dart = await chooseTarget(battleEnemies, "選擇目標");
        if (!dart) continue;
        return { type: "item", entry: entry, target: dart };
      }
      if (item.kind === "revive") {
        var downed = state.party.filter(function (p) {
          return p.hp <= 0;
        });
        if (downed.length === 0) {
          logLine("沒有需要復活的同伴。", "dim");
          await message("　");
          continue;
        }
        var reviveOpts = downed.map(function (p) {
          return { label: p.name, value: p };
        });
        reviveOpts.push({ label: "返回", value: null });
        var rt =
          downed.length === 1
            ? downed[0]
            : await choose("復活誰？（可返回）", reviveOpts);
        if (!rt) continue;
        return { type: "item", entry: entry, target: rt };
      }
      var t2 = await chooseTarget(state.party, "選擇對象");
      if (!t2) continue;
      if (item.kind === "heal") {
        var hpGain0 = Math.max(0, t2.maxHp - t2.hp);
        var mpGain0 = item.mp ? Math.max(0, t2.maxMp - t2.mp) : 0;
        if (hpGain0 <= 0 && mpGain0 <= 0) {
          logLine("生命與真氣已滿，無需使用。", "dim");
          await message("　");
          continue;
        }
      } else if (t2.mp >= t2.maxMp) {
        logLine("真氣已滿，無需使用。", "dim");
        await message("　");
        continue;
      }
      return { type: "item", entry: entry, target: t2 };
    }
    return { type: "flee" };
  }
}
// 第二階段：實際執行指令，回傳是否脫離戰鬥。
async function resolveAction(actor, action) {
  if (action.type === "attack") {
    var target = action.target;
    if (target.hp <= 0) target = randomAlive(battleEnemies) || target;
    if (target.hp <= 0) return "acted";
    await applyAttack(actor, target);
    if (target.hp <= 0) await battleLog(target.name + " 被擊倒了。", "dim");
    return "acted";
  }
  if (action.type === "escape") {
    actor.mp = Math.max(0, actor.mp - action.skill.mpCost);
    await battleLog(
      actor.name + " 施展「" + action.skill.name + "」，從容脫身！",
      "info",
    );
    return "flee";
  }
  if (action.type === "steal") {
    var std = action.target;
    if (std.hp <= 0) std = randomAlive(battleEnemies) || std;
    actor.mp = Math.max(0, actor.mp - action.skill.mpCost);
    await battleLog(actor.name + " 施展「" + action.skill.name + "」！", "sys");
    if (std.hp > 0 && std.drops && std.drops.length > 0) {
      var dd = std.drops[Math.floor(Math.random() * std.drops.length)];
      addItem(state.items, dd.itemId, 1);
      await battleLog(
        "　得手！竊得「" + D.ITEMS[dd.itemId].name + "」。",
        "info",
      );
    } else {
      await battleLog("　" + std.name + " 身上空無一物。", "dim");
    }
    return "acted";
  }
  if (action.type === "skill") {
    var skill = action.skill;
    var targets;
    if (skill.kind === "attack") {
      targets = action.targets.filter(function (t) {
        return t.hp > 0;
      });
      if (targets.length === 0) {
        var r = randomAlive(battleEnemies);
        targets = r ? [r] : [];
      }
    } else if (skill.kind === "revive") {
      targets = action.targets.filter(function (t) {
        return t.hp <= 0;
      });
    } else {
      targets = action.targets.filter(function (t) {
        return t.hp > 0;
      });
    }
    if (targets.length === 0) return "acted";
    actor.mp = Math.max(0, actor.mp - skill.mpCost);
    await battleLog(actor.name + " 施展「" + skill.name + "」！", "sys");
    await applySkill(actor, skill, targets);
    return "acted";
  }
  if (action.type === "flee") {
    if (Math.random() < D.COMBAT_RULE.fleeRate) {
      logLine("成功脫離戰鬥！", "info");
      return "flee";
    }
    await battleLog("逃跑失敗！", "warn");
    return "acted";
  }
  // item
  var item = D.ITEMS[action.entry.itemId];
  var it = action.target;
  consumeItem(state.items, action.entry);
  if (item.kind === "throw") {
    it.hp = Math.max(0, it.hp - item.value);
    await battleLog(
      actor.name +
        " 投出「" +
        item.name +
        "」，" +
        it.name +
        " 受到 " +
        item.value +
        " 點傷害。",
      "battle",
    );
    if (it.hp <= 0) await battleLog(it.name + " 被擊倒了。", "dim");
  } else if (item.kind === "revive") {
    if (it.hp > 0) {
      await battleLog(
        actor.name +
          " 使用「" +
          item.name +
          "」，但 " +
          it.name +
          " 並未倒下。",
        "dim",
      );
    } else {
      it.hp = Math.max(1, Math.floor((it.maxHp * item.value) / 100));
      await battleLog(
        actor.name + " 使用「" + item.name + "」，" + it.name + " 復活了！",
        "info",
      );
    }
  } else if (item.kind === "heal") {
    var hpGain = Math.min(item.value, Math.max(0, it.maxHp - it.hp));
    var mpGain = item.mp ? Math.min(item.mp, Math.max(0, it.maxMp - it.mp)) : 0;
    it.hp += hpGain;
    it.mp += mpGain;
    await battleLog(
      actor.name +
        " 使用「" +
        item.name +
        "」，" +
        it.name +
        " 恢復了 " +
        recoverText(hpGain, mpGain) +
        "。",
      "info",
    );
  } else {
    var mp = Math.min(item.value, Math.max(0, it.maxMp - it.mp));
    it.mp += mp;
    await battleLog(
      actor.name +
        " 使用「" +
        item.name +
        "」，" +
        it.name +
        " 恢復了 " +
        mp +
        " 點真氣。",
      "info",
    );
  }
  return "acted";
}
async function resolveTargets(skill, actor) {
  if (skill.kind === "revive") {
    var downed = state.party.filter(function (p) {
      return p.hp <= 0;
    });
    if (downed.length === 0) {
      logLine("沒有需要復活的同伴。", "dim");
      await message("　");
      return null;
    }
    if (downed.length === 1) return [downed[0]];
    var ropts = downed.map(function (p) {
      return { label: p.name, value: p };
    });
    ropts.push({ label: "返回", value: null });
    var rt = await choose("復活誰？（可返回）", ropts);
    return rt ? [rt] : null;
  }
  if (skill.target === "enemy") {
    var t = await chooseTarget(battleEnemies, "選擇目標");
    return t ? [t] : null;
  }
  if (skill.target === "all-enemies") return alive(battleEnemies);
  if (skill.target === "ally") {
    var a = await chooseTarget(state.party, "選擇對象");
    return a ? [a] : null;
  }
  if (skill.target === "all-allies") return alive(state.party);
  if (skill.target === "self") return [actor];
  return null;
}
// 戰鬥中可使用的道具種類（裝備／材料不列入）改由 combat-core 的 isConsumable 判定。
async function chooseItem() {
  var available = state.items.filter(function (e) {
    return e.qty > 0 && isConsumable(e.itemId);
  });
  if (available.length === 0) {
    logLine("沒有可在戰鬥中使用的道具。", "dim");
    await message("　");
    return null;
  }
  var opts = available.map(function (e) {
    return {
      label:
        D.ITEMS[e.itemId].name + " ×" + e.qty + " — " + D.ITEMS[e.itemId].desc,
      value: e,
    };
  });
  opts.push({ label: "返回", value: null });
  return choose("使用物品", opts);
}
async function enemyTurn(enemy) {
  var targets = alive(state.party);
  if (targets.length === 0) return;
  var target = targets[Math.floor(Math.random() * targets.length)];
  var usable = enemy.skills
    .map(function (id) {
      return D.SKILLS[id];
    })
    .filter(function (s) {
      return s && s.kind === "attack" && s.mpCost <= enemy.mp;
    });
  var useSkill =
    usable.length > 0 && Math.random() < (enemy.ai === "caster" ? 0.55 : 0.3);
  if (useSkill) {
    var skill = usable[Math.floor(Math.random() * usable.length)];
    enemy.mp -= skill.mpCost;
    await battleLog(enemy.name + " 施展「" + skill.name + "」！", "sys");
    await applySkill(enemy, skill, [target]);
    if (target.hp <= 0) await battleLog(target.name + " 倒下了……", "warn");
  } else {
    // 擋格彩蛋：同伴挺身替被攻擊者攔下這一擊。
    var guardian = willingGuardian(target, state.party);
    var hit = target;
    var rate = 1;
    if (guardian && Math.random() < D.GUARD_RULE.chance) {
      await battleLog(
        guardian.name +
          " 一個箭步擋在 " +
          target.name +
          " 身前，替他攔下了這一擊！",
        "info",
      );
      hit = guardian;
      rate = D.GUARD_RULE.damageRate;
    }
    await applyAttack(enemy, hit, rate);
    if (hit.hp <= 0) await battleLog(hit.name + " 倒下了……", "warn");
  }
}
// 瘋魔：不分敵我，隨機攻擊場上任一戰鬥者。
async function confusedTurn(actor) {
  var candidates = alive(state.party)
    .concat(alive(battleEnemies))
    .filter(function (f) {
      return f.uid !== actor.uid;
    });
  if (candidates.length === 0) return;
  var target = candidates[Math.floor(Math.random() * candidates.length)];
  await battleLog(actor.name + " 陷入瘋魔，不分敵我！", "warn");
  await applyAttack(actor, target);
  if (target.hp <= 0) await battleLog(target.name + " 被擊倒了。", "dim");
}
function settleVictory(enemies) {
  var exp = 0,
    gold = 0;
  logLine("　戰鬥勝利！", "info");
  enemies.forEach(function (e) {
    exp += e.expReward;
    gold += e.goldReward;
    e.drops.forEach(function (d) {
      if (Math.random() < d.chance) {
        var min = d.min || 1,
          max = d.max || 1;
        var qty = min + Math.floor(Math.random() * (max - min + 1));
        addItem(state.items, d.itemId, qty);
        logLine("　獲得物品：" + D.ITEMS[d.itemId].name + " ×" + qty, "info");
      }
    });
  });
  state.gold += gold;
  logLine("　獲得經驗 " + exp + "，金錢 " + gold + " 文。", "info");
  grantExp(exp);
}
async function battle(enemyIds, boss) {
  battleEnemies = enemyIds.map(spawnEnemy);
  // 進入戰鬥時清除上一場殘留的異常狀態與增益。
  state.party.forEach(function (m) {
    m.status = {};
    m.buffs = [];
  });
  // 劇情：隊伍中有特定角色時，相關敵人會自動退避（如靈兒在隊時的仙靈島小妖）。
  var runaways = battleEnemies.filter(function (e) {
    return enemyFlees(e, state.party);
  });
  if (runaways.length > 0) {
    var stayed = battleEnemies.filter(function (e) {
      return runaways.indexOf(e) < 0;
    });
    var who = state.party.filter(function (p) {
      return runaways.some(function (e) {
        return (e.fleesFrom || []).indexOf(p.id) >= 0;
      });
    })[0];
    logLine(
      "　" +
        runaways
          .map(function (e) {
            return e.name;
          })
          .join("、") +
        "見了" +
        (who ? who.name : "熟人") +
        "，嚇得一哄而散，不敢造次。",
      "info",
    );
    await message("　");
    if (stayed.length === 0) return true;
    battleEnemies = stayed;
  }
  logLine(
    "　" +
      battleEnemies
        .map(function (e) {
          return e.name;
        })
        .join("、") +
      " 出現在眼前！",
    "battle",
  );
  await message("　");
  var round = 0;
  while (true) {
    round += 1;
    logLine("── 第 " + round + " 回合 ──", "dim");
    battleLine();
    var order = alive(state.party)
      .concat(alive(battleEnemies))
      .sort(function (a, b) {
        return effectiveStat(b, "spd") - effectiveStat(a, "spd");
      });

    // 第一階段：我方全員下達指令（依身法順序，無法行動者略過）。
    var pending = {};
    for (var k = 0; k < order.length; k++) {
      var a0 = order[k];
      var ally0 = state.party.filter(function (p) {
        return p.uid === a0.uid && p.hp > 0;
      })[0];
      if (!ally0) continue;
      if (
        hasStatus(ally0, "sleep") ||
        hasStatus(ally0, "paralyze") ||
        hasStatus(ally0, "confuse")
      )
        continue;
      pending[ally0.uid] = await chooseAction(ally0, boss);
    }

    // 第二階段：我方與敵方依身法順序統一結算。
    for (var i = 0; i < order.length; i++) {
      var actor = order[i];
      if (actor.hp <= 0) continue;

      // 回合開始：中毒扣血
      if (hasStatus(actor, "poison")) {
        var dmg = Math.max(1, Math.floor(actor.maxHp * 0.05));
        actor.hp = Math.max(0, actor.hp - dmg);
        await battleLog(
          actor.name + " 毒發，損失 " + dmg + " 點生命。",
          "warn",
        );
        if (actor.hp <= 0) await battleLog(actor.name + " 被擊倒了。", "dim");
      }

      if (actor.hp > 0) {
        var isAlly =
          state.party.filter(function (p) {
            return p.uid === actor.uid && p.hp > 0;
          }).length > 0;
        if (hasStatus(actor, "sleep") || hasStatus(actor, "paralyze")) {
          await battleLog(
            actor.name +
              " 處於" +
              statusLabel(hasStatus(actor, "sleep") ? "sleep" : "paralyze") +
              "，無法行動。",
            "dim",
          );
        } else if (hasStatus(actor, "confuse")) {
          await confusedTurn(actor);
        } else if (isAlly) {
          var act = pending[actor.uid];
          if (act) {
            var result = await resolveAction(actor, act);
            if (result === "flee") {
              return false;
            }
          }
        } else {
          await enemyTurn(actor);
        }
      }

      // 回合結束：狀態與增益倒數
      tickTimers(actor);
      renderStatus();
      if (alive(battleEnemies).length === 0) {
        settleVictory(battleEnemies);
        await message("　");
        return true;
      }
      if (alive(state.party).length === 0) {
        var inSuzhou = state.flags["chapter1.done"] === true;
        logLine("眼前一黑，李逍遙倒了下去……", "warn");
        logLine(
          inSuzhou
            ? "再醒來時，已被同伴送回悅來客棧的客房。"
            : "再醒來時，已躺回餘杭客棧的床榻之上。",
          "dim",
        );
        state.party.forEach(function (m) {
          m.hp = m.maxHp;
          m.mp = m.maxMp;
        });
        state.sceneId = inSuzhou ? D.SUZHOU_RESPAWN_SCENE : D.START_SCENE;
        renderStatus();
        await message("　");
        return false;
      }
    }
    // 回合結束：待玩家看完本回合流程，按繼續再進入下一回合。
    await message("── 第 " + round + " 回合結束 ──　按繼續進入下一回合");
  }
}

// ───────────────────────── 探索互動 ─────────────────────────
async function interact(ia) {
  if (ia.shop) {
    await openShop(ia.shop);
    return;
  }
  if (ia.restCost !== undefined) {
    await rest(ia);
    return;
  }
  var alreadyDone = isDone(state, ia.id);
  var rewarded = false;
  if (alreadyDone && ia.repeatText) {
    await playText(ia.repeatText);
  } else if (ia.story) {
    var storyDone = await runStory(ia.story);
    // 劇情因戰鬥失敗中斷時，不標記互動完成，讓玩家可重試。
    if (!storyDone) return;
  } else if (ia.text && ia.text.length > 0) {
    await playText(ia.text);
  }
  if (ia.battle && ia.battle.length > 0) {
    var won = await battle(ia.battle, ia.boss === true);
    if (!won) return;
  } else if (ia.area) {
    var area = D.AREAS[ia.area];
    if (!area) {
      logLine("這裡沒什麼好探索的。", "dim");
      await message("　");
    } else {
      var res = rollExplore(area);
      if (res.kind === "battle") {
        if (res.enemies.length === 0) {
          logLine("四周靜悄悄的，什麼也沒有。", "dim");
          await message("　");
        } else {
          var ok = await battle(res.enemies, false);
          if (!ok) return;
        }
      } else if (res.kind === "chest") {
        logLine("你在草叢深處發現了一只舊木箱！", "sys");
        if (res.gold > 0) {
          state.gold += res.gold;
          logLine("　獲得金錢 " + res.gold + " 文。", "info");
        }
        res.items.forEach(function (it) {
          addItem(state.items, it.itemId, it.qty);
          logLine(
            "　獲得物品：" + D.ITEMS[it.itemId].name + " ×" + it.qty,
            "info",
          );
        });
        await message("　");
      } else {
        logLine("四下搜尋了一番，卻一無所獲。", "dim");
        await message("　");
      }
    }
  }
  if (!alreadyDone) {
    if (ia.gold) {
      state.gold += ia.gold;
      logLine("　獲得金錢 " + ia.gold + " 文。", "info");
      rewarded = true;
    }
    if (ia.items) {
      ia.items.forEach(function (it) {
        addItem(state.items, it.itemId, it.qty);
        logLine(
          "　獲得物品：" + D.ITEMS[it.itemId].name + " ×" + it.qty,
          "info",
        );
      });
      rewarded = true;
    }
  }
  if (ia.setFlags)
    ia.setFlags.forEach(function (f) {
      state.flags[f] = true;
    });
  markDone(state, ia.id);
  renderStatus();
  if (rewarded) await message("　");
}

// ───────────────────────── 商店 ─────────────────────────
var EQUIP_LABEL = {
  hp: "生命",
  mp: "真氣",
  atk: "攻擊",
  def: "防禦",
  spd: "身法",
  mag: "靈力",
};
function bonusText(b) {
  if (!b) return "無加成";
  return Object.keys(b)
    .map(function (k) {
      return (EQUIP_LABEL[k] || k) + (b[k] >= 0 ? "+" : "") + b[k];
    })
    .join("、");
}
function itemNote(item) {
  return item.kind === "equip" ? bonusText(item.bonus) : item.desc;
}
async function openShop(shopId) {
  var shop = D.SHOPS[shopId];
  if (!shop) return;
  await playText(shop.greeting);
  while (true) {
    logLine("　【" + shop.name + "】　持有金錢：" + state.gold + " 文", "sys");
    var choice = await choose("您要買賣什麼？", [
      { label: "買東西", value: "buy" },
      { label: "賣東西", value: "sell" },
      { label: "離開", value: null },
    ]);
    if (!choice) return;
    if (choice === "buy") await shopBuy(shop);
    else await shopSell(shop);
  }
}
async function shopBuy(shop) {
  var opts = shop.stock.map(function (id) {
    var item = D.ITEMS[id];
    return {
      label: item.name + "　" + item.price + " 文　" + itemNote(item),
      value: id,
      disabled: state.gold < item.price,
    };
  });
  opts.push({ label: "取消", value: null });
  var id = await choose(
    shop.name + "　選購商品（金錢 " + state.gold + " 文）",
    opts,
  );
  if (!id) return;
  var item = D.ITEMS[id];
  buyItem(state, id);
  logLine(
    "　買下了「" + item.name + "」，付了 " + item.price + " 文。",
    "info",
  );
  renderStatus();
  await message("　");
}
async function shopSell(shop) {
  var sellable = state.items.filter(function (e) {
    return e.qty > 0 && D.ITEMS[e.itemId].price > 0;
  });
  if (sellable.length === 0) {
    logLine("　身上沒有可以賣的東西。", "dim");
    await message("　");
    return;
  }
  var opts = sellable.map(function (e) {
    var it = D.ITEMS[e.itemId];
    return {
      label: it.name + " ×" + e.qty + "　售 " + sellPrice(it.price) + " 文",
      value: e,
    };
  });
  opts.push({ label: "取消", value: null });
  var entry = await choose(
    shop.name + "　出售物品（金錢 " + state.gold + " 文）",
    opts,
  );
  if (!entry) return;
  var item = D.ITEMS[entry.itemId];
  var gain = sellPrice(item.price);
  sellItem(state, entry);
  logLine("　賣出了「" + item.name + "」，得 " + gain + " 文。", "info");
  renderStatus();
  await message("　");
}

// ───────────────────────── 客棧投宿休息 ─────────────────────────
async function rest(ia) {
  var cost = ia.restCost || 0;
  var result = restParty(state, cost);
  if (result === "full") {
    logLine("　大夥兒精神飽滿，不必休息。", "dim");
    await message("　");
    return;
  }
  if (result === "poor") {
    logLine("　投宿一晚需 " + cost + " 文，你的盤纏不夠。", "dim");
    await message("　");
    return;
  }
  logLine(
    cost > 0
      ? "一夜好眠，醒來時天已大亮。"
      : "李逍遙往自己的床上一躺，不一會兒便沉沉入睡。",
    "sys",
  );
  if (cost > 0) logLine("　付了 " + cost + " 文。", "info");
  logLine("　全隊的生命與真氣已完全恢復。", "info");
  renderStatus();
  await message("　");
}

async function doExplore() {
  var sc = scene();
  var list = availableInteractables(sc, state);
  if (list.length === 0) {
    logLine("這裡沒有什麼可以互動的。", "dim");
    await message("　");
    return;
  }
  var opts = list.map(function (i) {
    var label = i.shop
      ? i.name + "（可買賣）"
      : i.kind === "object"
        ? i.name + "（物品）"
        : i.name;
    return { label: label, value: i };
  });
  opts.push({ label: "取消", value: null });
  var chosen = await choose("探索（選擇要互動的對象）", opts);
  if (!chosen) return;
  await interact(chosen);
}

async function doMove() {
  var sc = scene();
  var exits = visibleExits(sc, state);
  if (exits.length === 0) {
    logLine("這裡沒有可去之處。", "dim");
    await message("　");
    return;
  }
  var opts = exits.map(function (e) {
    return { label: e.label, value: e };
  });
  opts.push({ label: "取消", value: null });
  var to = await choose("從「" + sc.name + "」前往何處？", opts);
  if (!to) return;
  if (!has(to.requires) || (to.lockedWhen && has(to.lockedWhen))) {
    await playText(to.lockedText || ["……"]);
    return;
  }
  await enterScene(to.to);
}

async function enterScene(id) {
  var sc = D.SCENES[id];
  if (!sc) throw new Error("未知場景：" + id);
  state.sceneId = id;
  renderStatus();
  if (sc.enterStory && !hasEntered(state, id)) {
    markEntered(state, id);
    await runStory(sc.enterStory);
  }
  renderStatus();
}

// ───────────────────────── 其他選單 ─────────────────────────
async function doMagic() {
  // 列出全隊每人的仙術與效果；惟補血仙術可於戰鬥外施展，其餘僅限戰鬥中使用。
  var opts = [];
  var hasFieldSkill = false;
  state.party.forEach(function (m) {
    m.skills.forEach(function (id) {
      var s = D.SKILLS[id];
      if (!s) return;
      var field = s.kind === "heal";
      if (field) hasFieldSkill = true;
      var usable = field && s.mpCost <= m.mp;
      opts.push({
        label:
          m.name +
          "｜" +
          s.name +
          "（真氣 " +
          s.mpCost +
          "）— " +
          s.desc +
          (field && !usable ? "　真氣不足" : ""),
        value: { caster: m, skill: s },
        disabled: !usable,
      });
    });
  });
  if (
    !opts.some(function (o) {
      return !o.disabled;
    })
  ) {
    logLine(
      opts.length === 0
        ? "隊伍尚未習得任何仙術。"
        : hasFieldSkill
          ? "真氣不足，無法施展仙術（休息或服藥可恢復真氣）。"
          : "尚未習得可在戰鬥外使用的仙術（僅補血仙術可於戰鬥外施展）。",
      "dim",
    );
    await message("　");
    return;
  }
  opts.push({ label: "取消", value: null });
  var chosen = await choose("施展仙術", opts);
  if (!chosen) return;
  var caster = chosen.caster;
  var skill = chosen.skill;
  var targets;
  if (skill.target === "all-allies") {
    targets = state.party.filter(function (p) {
      return p.hp > 0;
    });
  } else {
    var target = await chooseTarget(state.party, "　選擇對象");
    if (!target) return;
    targets = [target];
  }
  caster.mp -= skill.mpCost;
  targets.forEach(function (t) {
    var healed = Math.min(healAmount(caster.mag, skill.power), t.maxHp - t.hp);
    t.hp += healed;
    logLine(
      caster.name +
        " 施展「" +
        skill.name +
        "」，" +
        t.name +
        " 恢復了 " +
        healed +
        " 點生命。",
      "info",
    );
  });
  renderStatus();
  await message("　");
}

// 開啟寶物（包袱、手卷等）。
async function useTreasure(entry) {
  var res = openTreasure(state, entry);
  if (!res) return;
  logLine("打開一看——", "sys");
  if (res.gold > 0) logLine("　獲得金錢 " + res.gold + " 文。", "info");
  res.items.forEach(function (it) {
    logLine("　獲得物品：" + D.ITEMS[it.itemId].name + " ×" + it.qty, "info");
  });
  if (res.skills.length > 0) learnSkills(res.skills);
  renderStatus();
  await message("　");
}

async function doItem() {
  var available = state.items.filter(function (e) {
    return e.qty > 0;
  });
  if (available.length === 0) {
    logLine("身上沒有可用之物。", "dim");
    await message("　");
    return;
  }
  var opts = available.map(function (e) {
    var item = D.ITEMS[e.itemId];
    var note =
      item.kind === "equip"
        ? "裝備（於「隊伍狀態」穿戴）"
        : item.kind === "material"
          ? "材料"
          : item.kind === "throw"
            ? "暗器（戰鬥中投擲）"
            : item.desc;
    return { label: item.name + " ×" + e.qty + " — " + note, value: e };
  });
  opts.push({ label: "取消", value: null });
  var entry = await choose("道具", opts);
  if (!entry) return;
  var item = D.ITEMS[entry.itemId];
  if (item.kind === "treasure") {
    await useTreasure(entry);
    return;
  }
  if (
    item.kind === "equip" ||
    item.kind === "material" ||
    item.kind === "throw"
  ) {
    logLine(
      item.kind === "equip"
        ? "「" + item.name + "」是裝備，請至「隊伍狀態」穿戴。"
        : item.kind === "material"
          ? "「" + item.name + "」目前無法直接使用，可於商店變賣。"
          : "「" + item.name + "」是暗器，只能在戰鬥中投擲。",
      "dim",
    );
    await message("　");
    return;
  }
  var target = state.party[0];
  if (item.kind === "revive") {
    var downed = state.party.filter(function (p) {
      return p.hp <= 0;
    });
    if (downed.length === 0) {
      logLine("沒有需要復活的同伴。", "dim");
      await message("　");
      return;
    }
    var reviveOpts = downed.map(function (p) {
      return { label: p.name, value: p };
    });
    reviveOpts.push({ label: "取消", value: null });
    var revived =
      downed.length === 1 ? downed[0] : await choose("復活誰？", reviveOpts);
    if (!revived) return;
    revived.hp = Math.max(1, Math.floor((revived.maxHp * item.value) / 100));
    logLine(revived.name + " 復活了！", "info");
  } else if (item.kind === "heal") {
    var hpGain = Math.min(item.value, target.maxHp - target.hp);
    var mpGain = item.mp ? Math.min(item.mp, target.maxMp - target.mp) : 0;
    if (hpGain <= 0 && mpGain <= 0) {
      logLine("生命與真氣已滿，無需使用。", "dim");
      await message("　");
      return;
    }
    target.hp += hpGain;
    target.mp += mpGain;
    logLine(
      target.name + " 恢復了 " + recoverText(hpGain, mpGain) + "。",
      "info",
    );
  } else if (item.kind === "mana") {
    if (target.mp >= target.maxMp) {
      logLine("真氣已滿，無需使用。", "dim");
      await message("　");
      return;
    }
    var mp = Math.min(item.value, target.maxMp - target.mp);
    target.mp += mp;
    logLine(target.name + " 恢復了 " + mp + " 點真氣。", "info");
  }
  consumeItem(state.items, entry);
  renderStatus();
  await message("　");
}

async function doStatus() {
  var m = state.party[0];
  logLine("　" + m.name + "　Lv." + m.level, "sys");
  logLine(
    "　生命 " + m.hp + "/" + m.maxHp + "　真氣 " + m.mp + "/" + m.maxMp,
    null,
  );
  logLine(
    "　攻擊 " +
      m.atk +
      "　防禦 " +
      m.def +
      "　身法 " +
      m.spd +
      "　靈力 " +
      m.mag,
    null,
  );
  logLine("　經驗 " + m.exp + "/" + expToNext(m.level), null);
  logLine(
    "　武功：" +
      (m.skills
        .map(function (s) {
          return D.SKILLS[s].name;
        })
        .join("、") || "無"),
    null,
  );
  logLine(
    "　裝備：" +
      D.EQUIP_SLOTS.map(function (s) {
        var id = m.equipment[s.id];
        return (
          s.name +
          "：" +
          (id
            ? D.ITEMS[id].name + "（" + bonusText(D.ITEMS[id].bonus) + "）"
            : "無")
        );
      }).join("　"),
    null,
  );
  logLine("　金錢：" + state.gold + " 文", null);
  logLine(
    "　物品：" +
      (state.items
        .map(function (i) {
          return D.ITEMS[i.itemId].name + "×" + i.qty;
        })
        .join("、") || "無"),
    null,
  );

  var choice = await choose("是否更換裝備？", [
    { label: "更換裝備", value: true },
    { label: "返回", value: false },
  ]);
  if (choice) await doEquip(m);
}

async function doEquip(m) {
  while (true) {
    var slot = await choose(
      "選擇部位",
      D.EQUIP_SLOTS.map(function (s) {
        var id = m.equipment[s.id];
        return {
          label:
            s.name +
            "：" +
            (id
              ? D.ITEMS[id].name + "（" + bonusText(D.ITEMS[id].bonus) + "）"
              : "無"),
          value: s.id,
        };
      }).concat([{ label: "返回", value: null }]),
    );
    if (!slot) return;
    await chooseEquip(m, slot);
  }
}

// 該角色是否能裝備此物品（依原作的「裝備角色」限制）改由 leveling 的 canEquip 判定。
async function chooseEquip(m, slot) {
  var slotName =
    (
      D.EQUIP_SLOTS.filter(function (s) {
        return s.id === slot;
      })[0] || {}
    ).name || slot;
  var equipped = m.equipment[slot];
  var candidates = state.items.filter(function (e) {
    return (
      e.qty > 0 &&
      D.ITEMS[e.itemId].kind === "equip" &&
      D.ITEMS[e.itemId].slot === slot &&
      canEquip(m, D.ITEMS[e.itemId])
    );
  });
  if (!equipped && candidates.length === 0) {
    logLine("沒有可裝備於「" + slotName + "」的物品。", "dim");
    await message("　");
    return;
  }
  var options = [];
  if (equipped)
    options.push({
      label:
        "卸下（目前：" +
        D.ITEMS[equipped].name +
        "　" +
        bonusText(D.ITEMS[equipped].bonus) +
        "）",
      value: "off",
    });
  candidates.forEach(function (e) {
    options.push({
      label:
        D.ITEMS[e.itemId].name +
        "（" +
        bonusText(D.ITEMS[e.itemId].bonus) +
        "）×" +
        e.qty,
      value: e,
    });
  });
  options.push({ label: "取消", value: null });
  var choice = await choose(m.name + "｜" + slotName, options);
  if (!choice) return;
  if (equipped) {
    addItem(state.items, equipped, 1);
    delete m.equipment[slot];
  }
  if (choice === "off") {
    logLine(
      "　" + m.name + " 卸下了「" + D.ITEMS[equipped].name + "」。",
      null,
    );
  } else {
    consumeItem(state.items, choice);
    m.equipment[slot] = choice.itemId;
    logLine(
      "　" + m.name + " 裝備了「" + D.ITEMS[choice.itemId].name + "」。",
      null,
    );
  }
  recomputeStats(m);
  logLine(
    "　攻擊 " +
      m.atk +
      "　防禦 " +
      m.def +
      "　身法 " +
      m.spd +
      "　靈力 " +
      m.mag,
    null,
  );
  await message("　");
}

// ───────────────────────── 存讀檔 ─────────────────────────
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {}
}
function load() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function newGame(sceneId = null) {
  state = {
    party: [createCharacter("li-xiaoyao")],
    gold: 0,
    items: [
      { itemId: "herb", qty: 3 },
      { itemId: "qi-pill", qty: 1 },
    ],
    sceneId: sceneId || D.START_SCENE,
    flags: {},
  };
}

// ───────────────────────── 主流程 ─────────────────────────
async function mainMenu() {
  while (true) {
    renderStatus();
    var choice = await choose("主選單", [
      { label: "探索", value: "explore" },
      { label: "移動（" + scene().name + "）", value: "move" },
      { label: "仙術", value: "magic" },
      { label: "道具", value: "item" },
      { label: "隊伍狀態", value: "status" },
      { label: "存檔", value: "save" },
      { label: "回到標題", value: "title" },
    ]);
    if (choice === "explore") await doExplore();
    else if (choice === "move") await doMove();
    else if (choice === "magic") await doMagic();
    else if (choice === "item") await doItem();
    else if (choice === "status") await doStatus();
    else if (choice === "save") {
      save();
      logLine("　已儲存進度。", "info");
      await message("　");
    } else if (choice === "title") return;
  }
}

async function titleScreen() {
  logEl.innerHTML = "";
  var saved = load();
  logLine(D.GAME_TITLE, "sys");
  logLine(D.GAME_SUBTITLE, "dim");
  logLine("　一念御劍，一世情長。", "dim");
  var opts = [{ label: "新遊戲", value: "new" }];
  if (saved) opts.push({ label: "讀取存檔", value: "load" });
  var choice = await choose("　主選單", opts);
  if (choice === "load" && saved) {
    state = saved;
  } else newGame();
  await enterScene(state.sceneId);
  await mainMenu();
}

window.addEventListener("DOMContentLoaded", function () {
  logEl = document.getElementById("log");
  actionsEl = document.getElementById("actions");
  barEl = document.getElementById("bar");
  barEl.querySelector(".title").textContent = D.GAME_TITLE + " · 終端文字版";
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var b = actionsEl.querySelector("button:not([disabled])");
      if (b) b.click();
    }
  });
  titleScreen();
});
