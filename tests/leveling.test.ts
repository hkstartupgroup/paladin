import { test } from "node:test";
import assert from "node:assert/strict";

import { CHARACTER_TEMPLATES, createCharacter } from "../src/data/characters";
import { SKILLS } from "../src/data/skills";
import { AREAS, ENEMIES } from "../src/data/enemies";
import { ITEMS } from "../src/data/items";
import { SHOPS } from "../src/data/shops";
import { CHAPTER_01 } from "../src/data/chapters/chapter01";
import { SCENES, START_SCENE } from "../src/data/scenes";
import {
  canEquip,
  expToNext,
  gainExp,
  recomputeStats,
} from "../src/systems/leveling";
import {
  rollExplore,
  availableInteractables,
  availableExits,
  visibleExits,
} from "../src/systems/explore";
import { GameScene, GameState, Loadout } from "../src/models/types";
import {
  physicalDamage,
  skillDamage,
  isConsumable,
  effectiveStat,
  applyStatus,
  tickTimers,
  spawnEnemy,
  enemyFlees,
  willingGuardian,
} from "../src/systems/combat";
import { addItem, consumeItem } from "../src/systems/inventory";
import { openTreasure } from "../src/systems/treasure";
import { buyItem, sellItem, sellPrice } from "../src/systems/shop";
import { restParty } from "../src/systems/rest";
import { currentObjective } from "../src/systems/objectives";

test("expToNext 隨等級遞增", () => {
  assert.ok(expToNext(2) > expToNext(1));
  assert.ok(expToNext(10) > expToNext(9));
});

test("獲得經驗可正確升級並成長屬性", () => {
  const c = createCharacter("li-xiaoyao");
  const hp0 = c.maxHp;
  const atk0 = c.atk;
  const logs = gainExp(c, expToNext(1));
  assert.equal(c.level, 2);
  assert.equal(logs.length, 1);
  assert.ok(c.maxHp > hp0);
  assert.ok(c.atk > atk0);
});

test("升級依原作 learnset 習得武功（萬劍訣 Lv13、天劍 Lv23）", () => {
  const c = createCharacter("li-xiaoyao");
  assert.ok(c.skills.includes("qi-heal"), "氣療術為自帶");
  while (c.level < 13) gainExp(c, expToNext(c.level));
  assert.equal(c.level, 13);
  assert.ok(c.skills.includes("myriad-swords"), "Lv13 習得萬劍訣");
  assert.ok(!c.skills.includes("heaven-sword"), "Lv13 尚未習得天劍");
  while (c.level < 23) gainExp(c, expToNext(c.level));
  assert.ok(c.skills.includes("heaven-sword"), "Lv23 習得天劍");
});

test("物理傷害至少為 1 且受防禦影響", () => {
  assert.ok(physicalDamage(5, 999, 0) >= 1);
  assert.ok(physicalDamage(100, 0, 0) > physicalDamage(100, 100, 0));
});

test("法術傷害依 power 放大", () => {
  const c = createCharacter("li-xiaoyao");
  const weak = skillDamage(100, c, c, "none", 0);
  const strong = skillDamage(300, c, c, "none", 0);
  assert.ok(strong > weak);
});

test("李逍遙開場自帶氣療術，御劍術須由劇情傳授", () => {
  const c = createCharacter("li-xiaoyao");
  assert.deepEqual(c.skills, ["qi-heal"]);
  assert.ok(!c.skills.includes("sword-qi"), "御劍術不在開場技能中");
});

test("角色招式、敵人招式與練武區敵人皆存在於資料表", () => {
  for (const t of Object.values(CHARACTER_TEMPLATES)) {
    for (const s of t.baseSkills) assert.ok(SKILLS[s], `缺少技能：${s}`);
    for (const l of t.learnset)
      assert.ok(SKILLS[l.skill], `缺少技能：${l.skill}`);
  }
  for (const e of Object.values(ENEMIES)) {
    for (const s of e.skills) assert.ok(SKILLS[s], `缺少敵人招式：${s}`);
  }
  for (const a of Object.values(AREAS)) {
    for (const group of a.encounters) {
      for (const id of group) assert.ok(ENEMIES[id], `缺少敵人：${id}`);
    }
  }
});

test("趙靈兒角色資料與全技能齊備", () => {
  const zhao = CHARACTER_TEMPLATES["zhao-linger"];
  assert.ok(zhao, "趙靈兒角色模板存在");
  assert.equal(zhao.name, "趙靈兒");
  assert.ok(zhao.baseSkills.length >= 10, "初始咒法齊備");
  assert.ok(zhao.learnset.length >= 9, "升級技能齊備");

  // 李逍遙與趙靈兒的關鍵技能皆須存在
  for (const id of [
    // 李逍遙
    "sword-qi",
    "tianshi-talisman",
    "myriad-swords",
    "heaven-sword",
    "sword-god",
    "xiaoyao-sword",
    "wine-god",
    "mountain-god",
    "thunder-god",
    "ling-hu",
    "qi-heal",
    "ning-shen",
    "ice-heart",
    "tian-gang",
    "zhen-yuan",
    "zui-xian",
    "xian-feng",
    "yuan-ling",
    "fei-long",
    "jin-chan",
    // 趙靈兒
    "guan-yin",
    "jing-yi",
    "jin-gang",
    "hui-meng",
    "huan-hun",
    "wu-qi",
    "feng-zhou",
    "lei-zhou",
    "bing-zhou",
    "yan-zhou",
    "tu-zhou",
    "xuan-feng",
    "xuan-bing",
    "fei-yan",
    "five-thunder",
    "san-mei",
    "kuang-lei",
    "lian-yu",
    "wu-shen",
    "meng-she",
    "feng-juan",
    "feng-xue",
    "di-lie",
    "tian-lei",
    "tai-shan",
  ])
    assert.ok(SKILLS[id], `缺少技能：${id}`);

  // 技能種類涵蓋攻擊／治療／復活／增益／解咒／偷竊／脫逃
  const kinds = new Set(Object.values(SKILLS).map((s) => s.kind));
  for (const k of [
    "attack",
    "heal",
    "revive",
    "buff",
    "cure",
    "steal",
    "escape",
  ])
    assert.ok(kinds.has(k as never), `缺少技能種類：${k}`);

  // 冰心訣解除昏睡／定身／瘋魔／咒封；淨衣咒解中毒
  assert.deepEqual(SKILLS["ice-heart"].cures, [
    "sleep",
    "paralyze",
    "confuse",
    "seal",
  ]);
  assert.deepEqual(SKILLS["jing-yi"].cures, ["poison"]);
});

test("增益：effectiveStat 計入倍率，基礎數值不變", () => {
  const c = createCharacter("li-xiaoyao");
  const base = c.spd;
  c.buffs.push({ stat: "spd", rate: 0.5, turns: 2 });
  assert.equal(effectiveStat(c, "spd"), Math.round(base * 1.5));
  assert.equal(c.spd, base, "基礎數值不因增益而改動");
});

test("異常狀態：施加與回合倒數", () => {
  const c = createCharacter("li-xiaoyao");
  applyStatus(c, "poison", 2);
  applyStatus(c, "seal", 1);
  assert.equal(c.status.poison, 2);
  tickTimers(c);
  assert.equal(c.status.poison, 1);
  assert.equal(c.status.seal, undefined, "狀態歸零即解除");
  tickTimers(c);
  assert.equal(c.status.poison, undefined);
});

test("第一章劇情節點結構完整（next／選項／敵人／技能／物品皆存在）", () => {
  const ch = CHAPTER_01;
  const ids = new Set(Object.keys(ch.nodes));
  for (const node of Object.values(ch.nodes)) {
    if (node.next)
      assert.ok(ids.has(node.next), `${node.id} 的 next 不存在：${node.next}`);
    for (const c of node.choices ?? [])
      assert.ok(ids.has(c.next), `${node.id} 的選項目標不存在：${c.next}`);
    for (const e of node.battle ?? [])
      assert.ok(ENEMIES[e], `${node.id} 的敵人不存在：${e}`);
    for (const s of node.learnSkills ?? [])
      assert.ok(SKILLS[s], `${node.id} 的技能不存在：${s}`);
    for (const p of node.joinParty ?? [])
      assert.ok(CHARACTER_TEMPLATES[p], `${node.id} 的入隊角色不存在：${p}`);
    for (const it of node.rewards?.items ?? [])
      assert.ok(ITEMS[it.itemId], `${node.id} 的物品不存在：${it.itemId}`);
  }
});

test("第一章台詞依 ch01.md 全文（關鍵節點與角色名）", () => {
  const nodes = CHAPTER_01.nodes;

  // 原著船伕為「張四哥」，不得再出現誤植的「張五哥」。
  for (const node of Object.values(nodes))
    for (const line of node.text)
      assert.ok(!line.includes("張五哥"), `${node.id} 出現誤植的張五哥`);

  const has = (id: string, frag: string): void => {
    const node = nodes[id];
    assert.ok(node, `缺少節點：${id}`);
    assert.ok(
      node.text.some((l) => l.includes(frag)),
      `${id} 應包含台詞片段：${frag}`,
    );
  };

  has("s-hall-miao", "真是遇到財神爺了");
  has("s-kitchen", "看起來很好吃的樣子");
  has("s-island-zhangsi", "張四哥");
  has("s-linger", "你跟我來");
  has("s-moon-palace", "我叫趙靈兒");
  has("s-moon-palace", "恩師靈月之墓");
  has("s-aunt-cure", "忘憂散");
  has("s-shrine", "唯我酒劍仙");
});

test("場景結構完整（起始場景、出口與互動指向皆存在）", () => {
  assert.ok(SCENES[START_SCENE], `起始場景不存在：${START_SCENE}`);
  for (const scene of Object.values(SCENES)) {
    if (scene.enterStory)
      assert.ok(
        CHAPTER_01.nodes[scene.enterStory],
        `${scene.id} 的 enterStory 不存在：${scene.enterStory}`,
      );
    for (const ex of scene.exits)
      assert.ok(SCENES[ex.to], `${scene.id} 的出口指向不存在：${ex.to}`);
    const seen = new Set<string>();
    for (const ia of scene.interactables) {
      assert.ok(!seen.has(ia.id), `${scene.id} 的互動 id 重複：${ia.id}`);
      seen.add(ia.id);
      if (ia.story)
        assert.ok(
          CHAPTER_01.nodes[ia.story],
          `${scene.id}/${ia.id} 的 story 不存在：${ia.story}`,
        );
      if (ia.area)
        assert.ok(
          AREAS[ia.area],
          `${scene.id}/${ia.id} 的 area 不存在：${ia.area}`,
        );
      if (ia.shop)
        assert.ok(
          SHOPS[ia.shop],
          `${scene.id}/${ia.id} 的 shop 不存在：${ia.shop}`,
        );
      for (const e of ia.battle ?? [])
        assert.ok(ENEMIES[e], `${scene.id}/${ia.id} 的敵人不存在：${e}`);
      for (const it of ia.items ?? [])
        assert.ok(
          ITEMS[it.itemId],
          `${scene.id}/${ia.id} 的物品不存在：${it.itemId}`,
        );
    }
  }
});

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test("野外探索：遇敵／寶箱／空手三種結果", () => {
  const area = AREAS["shili-po"];
  assert.ok(area.encounters.length > 0, "十里坡缺少遭遇表");
  assert.ok((area.loot?.length ?? 0) > 0, "十里坡缺少寶箱表");

  const battle = rollExplore(area, seq([0, 0]));
  assert.equal(battle.kind, "battle");
  if (battle.kind === "battle")
    assert.deepEqual(battle.enemies, area.encounters[0]);

  const chest = rollExplore(area, seq([0.7, 0.1, 0.1, 0.5]));
  assert.equal(chest.kind, "chest");
  if (chest.kind === "chest") {
    assert.ok(
      chest.gold >= area.chestGold![0] && chest.gold <= area.chestGold![1],
    );
    assert.ok(chest.items.length > 0);
  }

  assert.equal(rollExplore(area, () => 0.95).kind, "nothing");
});

test("互動可見性：requires／hideWhen／一次性與可重複", () => {
  const scene = SCENES["inn-hall"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-hall",
    flags: {},
  };
  const ids = (): string[] =>
    availableInteractables(scene, state).map((i) => i.id);

  assert.deepEqual(ids(), ["aunt-greet", "counter", "wine-jar"]);

  state.flags["hall.greet"] = true;
  assert.deepEqual(ids().sort(), [
    "aunt-greet",
    "counter",
    "miao-pay",
    "wine-jar",
  ]);

  state.flags["hall.paid"] = true;
  assert.deepEqual(
    ids().sort(),
    ["aunt-chase", "counter", "miao-idle", "miao-pay", "wine-jar"],
    "李大娘不應同時出現兩筆",
  );

  state.flags["ia:miao-pay"] = true;
  assert.ok(!ids().includes("miao-pay"), "一次性互動完成後應隱藏");

  state.flags["ia:aunt-chase"] = true;
  assert.ok(ids().includes("aunt-chase"), "可重複互動完成後仍應顯示");

  state.flags["ia:counter"] = true;
  assert.ok(!ids().includes("counter"), "一次性寶物取走後應隱藏");
});

test("醉道士：未拿酒前可重複對話，拿酒後改為給酒", () => {
  const scene = SCENES["inn-hall"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-hall",
    flags: { "chase.drunk": true },
  };
  const ids = (): string[] =>
    availableInteractables(scene, state).map((i) => i.id);

  assert.ok(ids().includes("drunk-talk"));
  state.flags["ia:drunk-talk"] = true;
  assert.ok(ids().includes("drunk-talk"), "尚未拿到酒時應仍可對話");

  state.flags["has.wine"] = true;
  assert.ok(!ids().includes("drunk-talk"), "拿到酒之後應改為給酒");
  assert.ok(ids().includes("drunk-wine"));
});

test("十里坡：仙靈島歸來前封閉，但仍顯示出口以提示", () => {
  const market = SCENES["market"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "market",
    flags: {},
  };

  assert.ok(
    !availableExits(market, state)
      .map((e) => e.to)
      .includes("shili-po"),
    "歸來前不應能前往十里坡",
  );
  assert.ok(
    visibleExits(market, state)
      .map((e) => e.to)
      .includes("shili-po"),
    "歸來前仍應顯示出口以便提示封閉",
  );
  const locked = visibleExits(market, state).find((e) => e.to === "shili-po");
  assert.ok((locked?.lockedText?.length ?? 0) > 0, "封閉出口應有提示文字");

  state.flags["island.returned"] = true;
  assert.ok(
    availableExits(market, state)
      .map((e) => e.to)
      .includes("shili-po"),
    "歸來後應可前往十里坡",
  );
});

test("渡口市集：村民對話完仍留在場景並有次要對白", () => {
  const scene = SCENES["market"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "market",
    flags: { "m.fish": true },
  };
  const ids = (): string[] =>
    availableInteractables(scene, state).map((i) => i.id);

  for (const id of ["fish-seller", "shui", "zhang"]) {
    state.flags[`ia:${id}`] = true;
    assert.ok(ids().includes(id), `${id} 對話完後仍應留在場景`);
    const ia = scene.interactables.find((i) => i.id === id);
    assert.ok(
      ia?.repeatable === true && (ia.repeatText?.length ?? 0) > 0,
      `${id} 應設定次要對白`,
    );
  }
});

test("渡口市集：NPC 依進度分階段，且不重複出現", () => {
  const scene = SCENES["market"];
  const namesAt = (flags: string[]): string[] => {
    const f: Record<string, boolean> = {};
    for (const x of flags) f[x] = true;
    return availableInteractables(scene, {
      party: [],
      gold: 0,
      items: [],
      sceneId: "market",
      flags: f,
    }).map((i) => i.name);
  };

  assert.deepEqual(namesAt(["m.fish"]), ["魚嫂", "丁香蘭", "水生叔", "張四哥"]);

  const sick = namesAt(["m.fish", "aunt.sick"]);
  assert.ok(!sick.includes("丁香蘭"), "丁香蘭通報後應離開市集");
  assert.deepEqual(sick, ["魚嫂", "水生叔", "張四哥"]);

  const sail = namesAt(["m.fish", "aunt.sick", "sail"]);
  assert.equal(
    sail.filter((n) => n === "張四哥").length,
    1,
    "取得破天鎚後市集不應同時出現兩位張四哥",
  );
});

test("李大娘：嬸嬸病倒後離開廚房", () => {
  const kitchen = SCENES["inn-kitchen"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-kitchen",
    flags: { "drunk.deal": true },
  };
  const names = (): string[] =>
    availableInteractables(kitchen, state).map((i) => i.name);

  assert.ok(names().includes("李大娘"), "買蝦任務期間李大娘應在廚房");
  state.flags["aunt.sick"] = true;
  assert.ok(!names().includes("李大娘"), "嬸嬸病倒後李大娘不應再出現在廚房");
});

test("苗人頭領：嬸嬸病倒後仍在客棧，得知仙靈島後改為贈鎚", () => {
  const hall = SCENES["inn-hall"];
  const idsAt = (flags: string[]): string[] => {
    const f: Record<string, boolean> = {};
    for (const x of flags) f[x] = true;
    return availableInteractables(hall, {
      party: [],
      gold: 0,
      items: [],
      sceneId: "inn-hall",
      flags: f,
    }).map((i) => i.id);
  };

  const sick = idsAt(["hall.greet", "hall.paid", "aunt.sick"]);
  assert.ok(sick.includes("miao-idle"), "嬸嬸病倒後苗人頭領仍應在客棧");

  const island = idsAt(["hall.greet", "hall.paid", "aunt.sick", "go.island"]);
  assert.ok(!island.includes("miao-idle"), "得知仙靈島後不再閒聊");
  assert.ok(island.includes("miao-island"), "得知仙靈島後應可向苗人頭領求鎚");
});

test("李大娘房：李大娘與王小虎可重複對話", () => {
  const room = SCENES["aunt-room"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "aunt-room",
    flags: { "doctor.done": true },
  };
  const ids = (): string[] =>
    availableInteractables(room, state).map((i) => i.id);

  assert.ok(ids().includes("aunt-bed"), "李大娘應在房中可互動");
  assert.ok(ids().includes("xiaohu"), "王小虎應可互動");
  for (const id of ["aunt-bed", "xiaohu"]) {
    state.flags[`ia:${id}`] = true;
    assert.ok(ids().includes(id), `${id} 對話完仍應可再互動`);
    const ia = room.interactables.find((i) => i.id === id);
    assert.ok(
      ia?.repeatable === true && (ia.repeatText?.length ?? 0) > 0,
      `${id} 應有次要對白`,
    );
  }
});

test("第二間客房：苗人嘍囉對話完仍留在房內", () => {
  const room = SCENES["guest-room"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "guest-room",
    flags: { "take.dish": true },
  };
  const ids = (): string[] =>
    availableInteractables(room, state).map((i) => i.id);

  assert.ok(ids().includes("miao-serve"), "受命端菜後房內應有苗人嘍囉");
  state.flags["ia:miao-serve"] = true;
  assert.ok(ids().includes("miao-serve"), "端完酒菜後苗人嘍囉仍應在房內");
  const ia = room.interactables.find((i) => i.id === "miao-serve");
  assert.ok(
    ia?.repeatable === true && (ia.repeatText?.length ?? 0) > 0,
    "苗人嘍囉應有次要對白",
  );
});

test("端菜流程：須實際拿起酒菜才會開啟第二間客房", () => {
  const corridor = SCENES["inn-corridor"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-kitchen",
    flags: { "kitchen.ordered": true },
  };

  assert.ok(
    availableInteractables(SCENES["inn-kitchen"], state).some(
      (i) => i.id === "dish",
    ),
    "受嬸嬸之命後，桌上的酒菜才可拿取",
  );
  assert.ok(
    !availableExits(corridor, state).some((e) => e.to === "guest-room"),
    "尚未拿起酒菜，不得進第二間客房",
  );
  assert.ok(
    !availableInteractables(SCENES["guest-room"], state).some(
      (i) => i.id === "miao-serve",
    ),
    "尚未拿起酒菜，房內不應有苗人嘍囉",
  );

  state.flags["take.dish"] = true;
  assert.ok(
    availableExits(corridor, state).some((e) => e.to === "guest-room"),
    "拿起酒菜後可進第二間客房",
  );
  assert.ok(
    availableInteractables(SCENES["guest-room"], state).some(
      (i) => i.id === "miao-serve",
    ),
    "拿起酒菜後房內有苗人嘍囉",
  );
});

test("仙靈島篇：出航、破陣、遇靈兒、回村的旗標鏈", () => {
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "",
    flags: {},
  };
  const tos = (id: string): string[] =>
    availableExits(SCENES[id], state).map((e) => e.to);

  assert.ok(!tos("market").includes("island-shore"), "尚未出航不應能登島");
  state.flags["to.island"] = true;
  assert.ok(tos("market").includes("island-shore"), "答應出海後可登船");

  assert.ok(!tos("lotus-pond").includes("peach-forest"), "未破陣不得往桃樹林");
  for (let i = 1; i <= 6; i++) state.flags[`statue.${i}`] = true;
  state.flags["lotus.open"] = true;
  assert.ok(tos("lotus-pond").includes("peach-forest"), "破陣後可往桃樹林");

  assert.ok(
    !tos("moon-palace-out").includes("moon-palace"),
    "未遇靈兒不得入水月宮",
  );
  state.flags["met.linger"] = true;
  assert.ok(
    tos("moon-palace-out").includes("moon-palace"),
    "遇見靈兒後可入水月宮",
  );

  assert.ok(!tos("island-shore").includes("market"), "未逃出不得回村");
  state.flags["island.returned"] = true;
  assert.ok(tos("island-shore").includes("market"), "歸來後可搭船回盛漁村");
  assert.ok(!tos("market").includes("island-shore"), "歸來後不再顯示登島出口");
  assert.ok(tos("market").includes("shili-po"), "歸來後十里坡開放");
});

test("第一章完結：失憶夜赴山神廟習御劍術", () => {
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "shan-shen-miao",
    flags: {},
  };
  const ids = (): string[] =>
    availableInteractables(SCENES["shan-shen-miao"], state).map((i) => i.id);

  assert.ok(!ids().includes("drunk-shrine"), "失憶前山神廟不遇酒劍仙");
  state.flags["amnesia"] = true;
  assert.ok(ids().includes("drunk-shrine"), "失憶後夜赴山神廟遇酒劍仙");
  assert.deepEqual(CHAPTER_01.nodes["s-shrine"].learnSkills, ["sword-qi"]);
  assert.notEqual(
    CHAPTER_01.nodes["s-shrine"].end,
    true,
    "山神廟傳授御劍術後，第一章尚有後半段",
  );
  assert.equal(
    CHAPTER_01.nodes["s-miaojiang-depart"].end,
    true,
    "啟程苗疆後本章結束",
  );
});

test("第一章後半段：趙靈兒被擄、拜月教圍攻、苗人頭領 Boss、啟程苗疆", () => {
  const mk = (flags: string[]): GameState => {
    const f: Record<string, boolean> = {};
    for (const x of flags) f[x] = true;
    return { party: [], gold: 0, items: [], sceneId: "", flags: f };
  };
  const idsOf = (sceneId: string, flags: string[]): string[] =>
    availableInteractables(SCENES[sceneId], mk(flags)).map((i) => i.id);
  const tosOf = (sceneId: string, flags: string[]): string[] =>
    availableExits(SCENES[sceneId], mk(flags)).map((e) => e.to);

  // 趙靈兒被擄
  assert.ok(
    idsOf("inn-hall", ["learned.sword"]).includes("aunt-dawn"),
    "習得御劍術後回客棧，李大娘交代晨間之事",
  );
  assert.ok(
    idsOf("inn-room", ["inn.dawn"]).includes("linger-captured"),
    "客房中可見被捆的趙靈兒",
  );
  const captured = CHAPTER_01.nodes["s-linger-captured"];
  assert.deepEqual(captured.battle, ["miao-thug", "miao-thug"]);
  assert.deepEqual(
    captured.joinParty,
    ["zhao-linger"],
    "房間戰依原作由逍遙與靈兒合力，靈兒於此時入隊",
  );
  assert.equal(captured.next, "s-linger-free");

  // 重返仙靈島
  assert.ok(
    idsOf("market", ["linger.joined"]).includes("zhang-sail2"),
    "答應借船後可找張四哥重返仙靈島",
  );
  assert.ok(
    tosOf("market", ["to.island2"]).includes("island-shore"),
    "可再登船前往仙靈島",
  );
  assert.ok(
    idsOf("moon-palace", ["to.island2"]).includes("granny-death"),
    "水月宮可見垂危的姥姥",
  );

  // 拜月教圍攻與 Boss 戰
  assert.ok(
    idsOf("inn-hall", ["island2.return"]).includes("baiyue-attack"),
    "歸來後客棧遇拜月教",
  );
  const boss = CHAPTER_01.nodes["s-baiyue-boss"];
  assert.deepEqual(
    boss.battle,
    ["miao-thug", "miao-thug", "miao-boss"],
    "客棧之戰為苗人頭領與兩名苗人嘍囉",
  );
  assert.equal(boss.boss, true, "苗人頭領為 Boss 戰");
  assert.ok(ENEMIES["miao-boss"] && ENEMIES["miao-thug"], "苗人敵人存在");
  assert.equal(
    CHAPTER_01.nodes["s-aunt-fight"].setFlags?.includes("baiyue.defeated"),
    true,
    "李大娘出手後擊退拜月教",
  );

  // 啟程苗疆
  assert.ok(
    idsOf("market", ["to.miaojiang"]).includes("fang-boss"),
    "決定啟程後可找方老闆搭船",
  );
  assert.equal(CHAPTER_01.nodes["s-miaojiang-depart"].end, true);
});

test("李大娘：歸來後餵紫金丹痊癒並失憶", () => {
  const room = SCENES["aunt-room"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "aunt-room",
    flags: {},
  };
  const ids = (): string[] =>
    availableInteractables(room, state).map((i) => i.id);

  assert.ok(!ids().includes("aunt-cure"), "尚未求藥歸來不能餵藥");
  state.flags["island.returned"] = true;
  assert.ok(ids().includes("aunt-cure"), "歸來後可餵藥");
  state.flags["aunt.cured"] = true;
  assert.ok(
    !ids().includes("aunt-cure") && !ids().includes("aunt-bed"),
    "痊癒後不再顯示病榻對話",
  );
  assert.ok(ids().includes("aunt-awake"), "痊癒後改為清醒對話");
});

test("荷花池：敲碎六石像後現出陣眼", () => {
  const pond = SCENES["lotus-pond"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "lotus-pond",
    flags: { sail: true },
  };
  const ids = (): string[] =>
    availableInteractables(pond, state).map((i) => i.id);

  for (let i = 1; i <= 6; i++)
    assert.ok(ids().includes(`statue-${i}`), `石像${i}應可敲碎`);
  assert.ok(!ids().includes("array-eye"), "未敲完不得現陣眼");

  for (let i = 1; i <= 6; i++) {
    state.flags[`ia:statue-${i}`] = true;
    state.flags[`statue.${i}`] = true;
  }
  assert.ok(ids().includes("array-eye"), "六石像盡碎後現出陣眼");
  assert.ok(!ids().includes("statue-1"), "敲碎的石像應消失");
});

test("李大娘房：任一階段都不會同時出現兩筆李大娘", () => {
  const room = SCENES["aunt-room"];
  const namesAt = (flags: string[]): string[] => {
    const f: Record<string, boolean> = {};
    for (const x of flags) f[x] = true;
    return availableInteractables(room, {
      party: [],
      gold: 0,
      items: [],
      sceneId: "aunt-room",
      flags: f,
    }).map((i) => i.name);
  };

  for (const flags of [
    [],
    ["island.returned"],
    ["island.returned", "aunt.cured"],
  ]) {
    const count = namesAt(flags).filter((n) => n === "李大娘").length;
    assert.equal(count, 1, `flags=[${flags.join(",")}] 應只有一位李大娘`);
  }
});

test("物品增減：addItem 累加、consumeItem 歸零即移除", () => {
  const items: Loadout[] = [];
  addItem(items, "herb", 2);
  addItem(items, "herb", 3);
  assert.deepEqual(items, [{ itemId: "herb", qty: 5 }]);

  consumeItem(items, items[0]);
  assert.equal(items[0].qty, 4);

  items[0].qty = 1;
  consumeItem(items, items[0]);
  assert.equal(items.length, 0, "最後一個用畢應自清單移除");
});

test("戰鬥道具：藥品與暗器可用，裝備與材料不可使用", () => {
  assert.equal(isConsumable("herb"), true, "金創藥（heal）可用");
  assert.equal(isConsumable("qi-pill"), true, "靈芝草（mana）可用");
  assert.equal(isConsumable("soul-pill"), true, "還魂丹（revive）可用");
  assert.equal(isConsumable("plum-dart"), true, "梅花鏢（throw）可投擲");
  assert.equal(isConsumable("cap"), false, "皮帽（equip）不可用");
  assert.equal(isConsumable("hammer"), false, "破天鎚（material）不可用");
});

test("梅花鏢為暗器（一次性投擲道具）", () => {
  const dart = ITEMS["plum-dart"];
  assert.equal(dart.kind, "throw", "梅花鏢應為暗器");
  assert.equal(dart.value, 90, "梅花鏢固定傷害 90");
  assert.equal(dart.slot, undefined, "暗器不佔裝備欄");
  assert.equal(dart.bonus, undefined, "暗器不提供裝備加成");
});

test("道具數值依原作（恢復類功效與兼補）", () => {
  const mana = (id: string): number => {
    assert.equal(ITEMS[id].kind, "mana", `${id} 應為恢復真氣`);
    return ITEMS[id].value;
  };
  assert.equal(mana("mouse-fruit"), 36, "鼠兒果 真氣+36");
  assert.equal(mana("dragon-grass"), 110, "龍涎草 真氣+110");
  assert.equal(mana("snow-lotus"), 400, "雪蓮子 真氣+400");
  assert.equal(mana("qi-pill"), 50, "還神丹 真氣+50");

  assert.equal(ITEMS["herb"].kind, "heal");
  assert.equal(ITEMS["herb"].value, 200, "金創藥 體力+200");
  assert.equal(ITEMS["note-charm"].kind, "heal", "觀音符應恢復體力");
  assert.equal(ITEMS["note-charm"].value, 150);
  assert.equal(ITEMS["march-pill"].value, 100, "行軍丹 體力+100");

  // 原作「體力真氣+X」類道具，兼補真氣。
  assert.equal(ITEMS["fruit"].value, 20);
  assert.equal(ITEMS["fruit"].mp, 20);
  assert.equal(ITEMS["wine"].value, 15);
  assert.equal(ITEMS["wine"].mp, 15);

  // 解毒類目前無中毒系統，暫為材料。
  assert.equal(ITEMS["realgar-wine"].kind, "material");
  assert.equal(ITEMS["salt"].kind, "material");
});

test("當前目標：依主線旗標逐條推進，全完成後顯示收尾提示", () => {
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "",
    flags: {},
  };
  assert.equal(currentObjective(state), "下樓到大廳，幫忙招呼上門的客人。");

  state.flags["hall.greet"] = true;
  assert.equal(currentObjective(state), "招呼苗人客倌，聽他們的吩咐。");

  for (const f of [
    "hall.paid",
    "chase.drunk",
    "take.dish",
    "has.wine",
    "drunk.deal",
    "to.market",
    "aunt.sick",
    "doctor.done",
    "go.island",
    "sail",
    "to.island",
    "met.linger",
    "got.medicine",
    "island.returned",
    "aunt.cured",
    "learned.sword",
    "inn.dawn",
    "linger.joined",
    "to.island2",
    "granny.dead",
    "island2.return",
    "baiyue.defeated",
    "to.miaojiang",
    "chapter1.done",
  ])
    state.flags[f] = true;
  assert.equal(currentObjective(state), "第一章已完成，敬請期待後續章節。");
});

test("客棧出口依劇情旗標逐步解鎖", () => {
  const hall = SCENES["inn-hall"];
  const corridor = SCENES["inn-corridor"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-hall",
    flags: {},
  };
  const tos = (s: GameScene): string[] =>
    availableExits(s, state).map((e) => e.to);

  assert.deepEqual(
    tos(hall).sort(),
    ["inn-corridor", "inn-shed"],
    "開場時不應能離開客棧",
  );

  state.flags["chase.drunk"] = true;
  assert.ok(tos(hall).includes("inn-kitchen"), "奉嬸嬸之命後才可進廚房");

  assert.ok(
    !tos(corridor).includes("guest-room"),
    "未受命端菜前不開第二間客房",
  );
  state.flags["take.dish"] = true;
  assert.ok(tos(corridor).includes("guest-room"), "受命端菜後即可進第二間客房");
  assert.ok(
    availableInteractables(SCENES["guest-room"], state)
      .map((i) => i.id)
      .includes("miao-serve"),
    "受命端菜後客房內應有苗人可互動",
  );

  state.flags["to.market"] = true;
  assert.ok(tos(hall).includes("market"), "受命買蝦後才可出客棧");

  state.flags["aunt.sick"] = true;
  assert.ok(tos(hall).includes("aunt-room"));
});

test("裝備資料完整（slot 與 bonus 必填）", () => {
  for (const item of Object.values(ITEMS)) {
    if (item.kind !== "equip") continue;
    assert.ok(item.slot, `${item.id} 缺少 slot`);
    assert.ok(
      item.bonus && Object.keys(item.bonus).length > 0,
      `${item.id} 缺少 bonus`,
    );
  }
});

test("裝備加成：穿上提升屬性，卸下即還原", () => {
  const c = createCharacter("li-xiaoyao");
  const baseAtk = c.atk;
  const baseDef = c.def;
  const baseSpd = c.spd;

  c.equipment.weapon = "short-blade"; // 攻擊+6、身法-5
  c.equipment.head = "cap"; // 防禦+4
  recomputeStats(c);
  assert.equal(c.atk, baseAtk + 6);
  assert.equal(c.def, baseDef + 4);
  assert.equal(c.spd, baseSpd - 5);

  delete c.equipment.weapon;
  delete c.equipment.head;
  recomputeStats(c);
  assert.equal(c.atk, baseAtk);
  assert.equal(c.def, baseDef);
  assert.equal(c.spd, baseSpd);
});

test("裝備對象限制：canEquip 依原作限制可裝備者", () => {
  const li = createCharacter("li-xiaoyao");
  const zhao = createCharacter("zhao-linger");

  // 繡花鞋限女角，逍遙不可穿
  assert.equal(canEquip(li, ITEMS["embroidered-shoes"]), false);
  assert.equal(canEquip(zhao, ITEMS["embroidered-shoes"]), true);

  // 生鏽鐵劍為逍遙專用
  assert.equal(canEquip(li, ITEMS["rusty-sword"]), true);
  assert.equal(canEquip(zhao, ITEMS["rusty-sword"]), false);

  // 女性飾品（髮飾、玉鐲、青絲巾）僅限女角
  for (const id of ["hairpin", "jade-bracelet", "silk-scarf"]) {
    assert.equal(canEquip(zhao, ITEMS[id]), true, `${id} 靈兒可裝備`);
    assert.equal(canEquip(li, ITEMS[id]), false, `${id} 逍遙不可裝備`);
  }

  // 仙女劍為靈兒專用
  assert.equal(canEquip(zhao, ITEMS["fairy-sword"]), true);
  assert.equal(canEquip(li, ITEMS["fairy-sword"]), false);

  // 未設限制者（如藤甲、護肩）不限對象
  for (const id of ["rattan-armor", "shoulder-guard"]) {
    assert.equal(canEquip(li, ITEMS[id]), true, `${id} 逍遙可裝備`);
    assert.equal(canEquip(zhao, ITEMS[id]), true, `${id} 靈兒可裝備`);
  }
});

test("商店資料完整（商品存在、有定價且不重複）", () => {
  for (const shop of Object.values(SHOPS)) {
    assert.ok(shop.greeting.length > 0, `${shop.id} 缺少招呼語`);
    assert.ok(shop.stock.length > 0, `${shop.id} 缺少商品`);
    const seen = new Set<string>();
    for (const id of shop.stock) {
      assert.ok(ITEMS[id], `${shop.id} 的商品不存在：${id}`);
      assert.ok(ITEMS[id].price > 0, `${shop.id} 的商品無定價：${id}`);
      assert.ok(!seen.has(id), `${shop.id} 商品重複：${id}`);
      seen.add(id);
    }
  }
});

test("商店買賣：購買扣款入袋，出售依原價 75% 換錢", () => {
  const state: GameState = {
    party: [],
    gold: 1000,
    items: [],
    sceneId: "market",
    flags: {},
  };

  // 買入短刀（200 文）
  assert.equal(buyItem(state, "short-blade"), true);
  assert.equal(state.gold, 800);
  assert.deepEqual(state.items, [{ itemId: "short-blade", qty: 1 }]);

  // 金錢不足則不成立
  assert.equal(buyItem(state, "iron-boots"), false, "買不起鐵履應失敗");
  assert.equal(state.gold, 800);

  // 賣出短刀：原價 200，收購價 150
  assert.equal(sellPrice(ITEMS["short-blade"].price), 150);
  assert.equal(sellItem(state, state.items[0]), true);
  assert.equal(state.gold, 950);
  assert.equal(state.items.length, 0);

  // 無定價的劇情道具不可出售
  addItem(state.items, "hammer", 1);
  assert.equal(sellItem(state, state.items[0]), false, "破天鎚不可出售");
  assert.equal(state.gold, 950);
});

test("盛漁村渡口市集：設有鐵匠鋪、木匠鋪與洪大夫藥鋪", () => {
  const market = SCENES["market"];
  assert.deepEqual(
    market.interactables
      .filter((i) => i.shop)
      .map((i) => i.shop)
      .sort(),
    ["blacksmith", "carpenter", "doctor"],
  );

  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "market",
    flags: { "to.market": true },
  };
  const ids = availableInteractables(market, state).map((i) => i.id);
  for (const id of ["blacksmith-shop", "carpenter-shop", "doctor-shop"])
    assert.ok(ids.includes(id), `${id} 應可互動`);
});

test("客棧投宿：免費／付費皆回滿生命與真氣，已滿或錢不足則不成立", () => {
  const wounded = (): GameState => {
    const c = createCharacter("li-xiaoyao");
    c.hp = 1;
    c.mp = 0;
    return { party: [c], gold: 100, items: [], sceneId: "inn-room", flags: {} };
  };

  // 精神飽滿時不成立，也不扣款
  const full: GameState = {
    party: [createCharacter("li-xiaoyao")],
    gold: 100,
    items: [],
    sceneId: "inn-room",
    flags: {},
  };
  assert.equal(restParty(full, 30), "full");
  assert.equal(full.gold, 100);

  // 免費（李逍遙自己的房間）
  const free = wounded();
  assert.equal(restParty(free, 0), "ok");
  assert.equal(free.party[0].hp, free.party[0].maxHp);
  assert.equal(free.party[0].mp, free.party[0].maxMp);
  assert.equal(free.gold, 100, "免費休息不扣款");

  // 付費投宿
  const paid = wounded();
  assert.equal(restParty(paid, 30), "ok");
  assert.equal(paid.gold, 70);
  assert.equal(paid.party[0].hp, paid.party[0].maxHp);

  // 盤纏不足
  const poor = wounded();
  poor.gold = 10;
  assert.equal(restParty(poor, 30), "poor");
  assert.equal(poor.gold, 10, "錢不足不扣款");
  assert.equal(poor.party[0].hp, 1, "錢不足不回血");
});

test("餘杭客棧李逍遙房：設有免費床榻可休息", () => {
  const room = SCENES["inn-room"];
  const bed = room.interactables.find((i) => i.id === "own-bed");
  assert.ok(bed, "李逍遙房應有床榻");
  assert.equal(bed.restCost, 0, "自己的房間休息免費");

  const state: GameState = {
    party: [createCharacter("li-xiaoyao")],
    gold: 0,
    items: [],
    sceneId: "inn-room",
    flags: {},
  };
  assert.ok(
    availableInteractables(room, state).some((i) => i.id === "own-bed"),
    "床榻應可互動",
  );
});

test("李逍遙房讓給苗人後：走廊房門封閉，須從柴房密道進出", () => {
  const corridor = SCENES["inn-corridor"];
  const shed = SCENES["inn-shed"];
  const state: GameState = {
    party: [],
    gold: 0,
    items: [],
    sceneId: "inn-corridor",
    flags: {},
  };

  // 尚未讓房：走廊可進自己房間，柴房尚無密道
  assert.ok(
    availableExits(corridor, state).some((e) => e.to === "inn-room"),
    "尚未讓房時，走廊可進自己房間",
  );
  assert.ok(
    !availableExits(shed, state).some((e) => e.to === "inn-room"),
    "尚未讓房時，柴房密道未開",
  );

  state.flags["inn.dawn"] = true;
  assert.ok(
    !availableExits(corridor, state).some((e) => e.to === "inn-room"),
    "讓房給苗人後，走廊房門應封閉",
  );
  const door = visibleExits(corridor, state).find((e) => e.to === "inn-room");
  assert.ok(
    door && (door.lockedText?.length ?? 0) > 0,
    "封閉的房門仍應顯示並提示",
  );
  assert.ok(
    availableExits(shed, state).some((e) => e.to === "inn-room"),
    "讓房後可從柴房密道溜進自己房間",
  );

  // 擊退房中苗人嘍囉（趙靈兒獲救）後，走廊房門不再有守衛，恢復可通行。
  state.flags["linger.joined"] = true;
  assert.ok(
    availableExits(corridor, state).some((e) => e.to === "inn-room"),
    "擊退苗人後，走廊房門應解封",
  );
});

test("趙靈兒入隊自帶初始裝備（仙女劍／布袍／青絲巾／草鞋）", () => {
  const zhao = createCharacter("zhao-linger");
  assert.deepEqual(zhao.equipment, {
    weapon: "fairy-sword",
    armor: "cloth-robe",
    head: "silk-scarf",
    boots: "straw-shoes",
  });

  for (const [slot, id] of Object.entries(zhao.equipment)) {
    const item = ITEMS[id as string];
    assert.ok(item, `缺少裝備：${id}`);
    assert.equal(item.slot, slot, `${id} 的部位應為 ${slot}`);
  }

  recomputeStats(zhao);
  assert.equal(zhao.atk, zhao.base.atk + 8, "仙女劍 武術+8");
  assert.equal(
    zhao.def,
    zhao.base.def + 5 + 3 + 2 + 1,
    "仙女劍+布袍+青絲巾+草鞋的防禦加成",
  );

  // 李逍遙開場仍為空裝（裝備靠撿／買）
  assert.deepEqual(createCharacter("li-xiaoyao").equipment, {});
});

test("苗刀為阿奴專用的寶物：不可裝備、可於商店變賣", () => {
  const blade = ITEMS["miao-blade"];
  assert.equal(blade.kind, "material", "苗刀為阿奴專用，李逍遙不可裝備");
  assert.equal(blade.slot, undefined, "苗刀不佔裝備欄");
  assert.equal(blade.bonus, undefined, "苗刀不提供裝備加成");
  assert.equal(blade.price, 5000, "苗刀售價依原作");
  assert.equal(sellPrice(blade.price), 3750, "變賣可得原價 75%");
});

test("嬸嬸的包袱：可開啟，內含原作物品與手卷（學會冰心訣、飛龍探雲手）", () => {
  // 資料完整性：寶物內容指向存在的道具與技能
  for (const item of Object.values(ITEMS)) {
    if (item.kind !== "treasure") continue;
    for (const it of item.contains?.items ?? [])
      assert.ok(ITEMS[it.itemId], `${item.id} 內容物不存在：${it.itemId}`);
    for (const s of item.contains?.skills ?? [])
      assert.ok(SKILLS[s], `${item.id} 內容技能不存在：${s}`);
  }

  // 劇情節點確實發放包袱
  assert.deepEqual(
    CHAPTER_01.nodes["s-next-day"].rewards?.items,
    [{ itemId: "bundle", qty: 1 }],
    "s-next-day 應發放包袱",
  );

  const state: GameState = {
    party: [createCharacter("li-xiaoyao")],
    gold: 100,
    items: [{ itemId: "bundle", qty: 1 }],
    sceneId: "",
    flags: {},
  };

  const res = openTreasure(state, state.items[0]);
  assert.ok(res, "包袱可開啟");
  assert.equal(res!.gold, 500, "內有 500 文");
  assert.equal(state.gold, 600);
  assert.ok(
    !state.items.some((i) => i.itemId === "bundle"),
    "包袱開啟後即消耗",
  );
  const ids = state.items.map((i) => i.itemId);
  for (const id of [
    "scroll",
    "herb",
    "qi-pill",
    "embroidered-shoes",
    "jade-bracelet",
    "rusty-sword",
  ])
    assert.ok(ids.includes(id), `包袱應有 ${id}`);

  const scroll = state.items.find((i) => i.itemId === "scroll")!;
  const res2 = openTreasure(state, scroll);
  assert.deepEqual(
    res2?.skills,
    ["ice-heart", "fei-long"],
    "手卷可學冰心訣與飛龍探雲手",
  );

  // 非寶物不可開啟
  assert.equal(openTreasure(state, { itemId: "herb", qty: 1 }), null);
});

test("彩蛋：李逍遙替女角擋格（除林月如），靈兒不替人擋格", () => {
  assert.equal(CHARACTER_TEMPLATES["li-xiaoyao"].gender, "male");
  assert.equal(CHARACTER_TEMPLATES["zhao-linger"].gender, "female");
  assert.deepEqual(CHARACTER_TEMPLATES["li-xiaoyao"].guard, {
    females: true,
    except: ["lin-yueru"],
  });

  const li = createCharacter("li-xiaoyao");
  const zhao = createCharacter("zhao-linger");
  assert.equal(willingGuardian(zhao, [li, zhao]), li, "李逍遙會替靈兒擋格");
  assert.equal(willingGuardian(li, [li, zhao]), null, "靈兒不會替李逍遙擋格");
  assert.equal(willingGuardian(li, []), null, "場上無人可擋");
});

test("劇情：靈兒在隊時，仙靈島小妖自動退避", () => {
  assert.deepEqual(ENEMIES["leaf-sprite"].fleesFrom, ["zhao-linger"]);
  assert.deepEqual(ENEMIES["leaf-fairy"].fleesFrom, ["zhao-linger"]);
  assert.equal(ENEMIES["miao-thug"].fleesFrom, undefined, "苗人不受此機制影響");

  const withLinger = [
    createCharacter("li-xiaoyao"),
    createCharacter("zhao-linger"),
  ];
  const alone = [createCharacter("li-xiaoyao")];

  assert.equal(enemyFlees(spawnEnemy("leaf-sprite"), withLinger), true);
  assert.equal(enemyFlees(spawnEnemy("leaf-fairy"), withLinger), true);
  assert.equal(enemyFlees(spawnEnemy("leaf-sprite"), alone), false);
  assert.equal(
    enemyFlees(spawnEnemy("miao-thug"), withLinger),
    false,
    "苗人不會因靈兒在隊而退避",
  );
});

test("敵人依原作校準：綠葉妖精習得風咒，岩徑略高於十里坡中段", () => {
  assert.deepEqual(
    ENEMIES["leaf-fairy"].skills,
    ["feng-zhou"],
    "綠葉妖精應會原作的風咒",
  );
  assert.ok(SKILLS["feng-zhou"], "風咒技能存在");
  assert.equal(ENEMIES["leaf-sprite"].hp, 40, "綠葉小妖 HP 依原作");
  assert.equal(ENEMIES["leaf-fairy"].hp, 50, "綠葉妖精 HP 依原作");

  const minIslandHp = Math.min(
    ENEMIES["leaf-sprite"].hp,
    ENEMIES["leaf-fairy"].hp,
  );
  const shiliHp = ["slime", "lantern", "bee", "furball", "pupa", "wine-jar"]
    .map((id) => ENEMIES[id].hp)
    .sort((a, b) => a - b);
  const shiliMid = shiliHp[2];
  assert.ok(
    minIslandHp > shiliMid,
    `岩徑應略高於十里坡中段（${minIslandHp} > ${shiliMid}）`,
  );
});
