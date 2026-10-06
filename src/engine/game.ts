import {
  EQUIP_SLOTS,
  GAME_SUBTITLE,
  GAME_TITLE,
  SUZHOU_RESPAWN_SCENE,
} from "../config/constants";
import {
  Character,
  EquipStats,
  EquipSlot,
  GameState,
  Interactable,
  Item,
  Loadout,
  SceneExit,
  Shop,
  Skill,
  StoryNode,
} from "../models/types";
import { createCharacter } from "../data/characters";
import { STORY_NODES } from "../data/chapters";
import { SCENES, START_SCENE } from "../data/scenes";
import { AREAS } from "../data/enemies";
import { SKILLS } from "../data/skills";
import { ITEMS } from "../data/items";
import { SHOPS } from "../data/shops";
import {
  BattleOutcome,
  healAmount,
  runBattle,
  spawnEnemy,
} from "../systems/combat";
import {
  canEquip,
  expToNext,
  gainExp,
  recomputeStats,
} from "../systems/leveling";
import { addItem, consumeItem } from "../systems/inventory";
import { buyItem, sellItem, sellPrice } from "../systems/shop";
import { restParty } from "../systems/rest";
import { openTreasure } from "../systems/treasure";
import { currentObjective } from "../systems/objectives";
import { playText, StoryRunner } from "../systems/story";
import {
  availableInteractables,
  ExploreResult,
  hasEntered,
  hasFlags,
  isDone,
  markDone,
  markEntered,
  rollExplore,
  visibleExits,
} from "../systems/explore";
import * as ui from "../ui/display";
import { pause, pick, PickOption } from "../ui/input";
import { hasSave, loadGame, saveGame } from "./save";

export interface GameOptions {
  testMode?: boolean;
  startSceneId?: string;
}

export class Game {
  private state!: GameState;

  constructor(private readonly options: GameOptions = {}) {}

  async start(): Promise<void> {
    ui.clear();
    if (this.options.startSceneId) {
      this.newGame();
    } else {
      this.showTitle();
      while (true) {
        const choice = await pick("　主選單", [
          { label: "新遊戲", value: "new" },
          { label: "讀取存檔", value: "load", disabled: !hasSave() },
          { label: "離開", value: "quit" },
        ]);
        if (choice === "quit") return;
        if (choice === "new") {
          this.newGame();
          break;
        }
        const loaded = loadGame();
        if (loaded) {
          this.state = loaded;
          ui.info("讀取存檔成功。");
          await pause();
          break;
        }
        ui.info("讀取失敗。");
        await pause();
      }
    }
    await this.enterScene(this.state.sceneId);
    await this.mainMenu();
  }

  private async mainMenu(): Promise<void> {
    while (true) {
      const scene = SCENES[this.state.sceneId];
      ui.clear();
      this.showStatusBar();
      const menuTitle = this.options.testMode
        ? `${GAME_TITLE}　主選單　[scene: ${scene.id}]`
        : `${GAME_TITLE}　主選單`;
      const choice = await pick(menuTitle, [
        { label: "探索", value: "explore" },
        { label: `移動（現在地點：${scene.name}）`, value: "move" },
        { label: "仙術", value: "magic" },
        { label: "道具", value: "item" },
        { label: "隊伍狀態", value: "status" },
        { label: "存檔", value: "save" },
        {
          label: `測試模式：${this.options.testMode ? "開" : "關"}`,
          value: "test-mode",
        },
        { label: "離開遊戲", value: "quit" },
      ]);
      if (!choice) continue;
      switch (choice) {
        case "move":
          await this.move();
          break;
        case "explore":
          await this.explore();
          break;
        case "magic":
          await this.magic();
          break;
        case "item":
          await this.useItem();
          break;
        case "status":
          await this.showStatus();
          break;
        case "save":
          saveGame(this.state);
          await pause("存檔完成，按 Enter 繼續…");
          break;
        case "test-mode":
          this.options.testMode = !this.options.testMode;
          break;
        case "quit":
          return;
      }
    }
  }

  private showTitle(): void {
    ui.blank();
    ui.rule("═");
    console.log(ui.paint.bold(ui.paint.magenta(`　　${GAME_TITLE}`)));
    console.log(ui.paint.dim(`　　${GAME_SUBTITLE}`));
    ui.rule("═");
    ui.blank();
    ui.narrate(
      "一念御劍，一世情長。",
      "以升級練武與劇情體驗為核心的純文字仙俠 RPG。",
    );
    ui.blank();
  }

  private showStatusBar(): void {
    const m = this.leader();
    ui.rule();
    ui.info(
      `${ui.paint.bold(m.name)}　Lv.${m.level}　生命 ${m.hp}/${m.maxHp}　真氣 ${m.mp}/${m.maxMp}　金錢 ${this.state.gold}`,
    );
    ui.info(`${ui.paint.yellow("當前目標：")}${currentObjective(this.state)}`);
    ui.rule();
  }

  private async enterScene(id: string): Promise<void> {
    const scene = SCENES[id];
    if (!scene) throw new Error(`未知場景：${id}`);
    this.state.sceneId = id;
    if (scene.enterStory && !hasEntered(this.state, id)) {
      markEntered(this.state, id);
      await this.runStory(scene.enterStory);
    }
  }

  private async move(): Promise<void> {
    const scene = SCENES[this.state.sceneId];
    const exits = visibleExits(scene, this.state);
    if (exits.length === 0) {
      ui.blank();
      ui.info("這裡沒有可去之處。");
      await pause();
      return;
    }
    const to = await pick(`　從「${scene.name}」前往何處？`, [
      ...exits.map((e) => ({ label: e.label, value: e })),
      { label: "取消", value: null as SceneExit | null },
    ]);
    if (!to) return;
    if (
      !hasFlags(this.state, to.requires) ||
      (to.lockedWhen && hasFlags(this.state, to.lockedWhen))
    ) {
      await playText(to.lockedText!);
      return;
    }
    await this.enterScene(to.to);
  }

  private async explore(): Promise<void> {
    const scene = SCENES[this.state.sceneId];
    const list = availableInteractables(scene, this.state);
    if (list.length === 0) {
      ui.blank();
      ui.info("這裡沒有什麼可以互動的。");
      await pause();
      return;
    }
    const chosen = await pick("　探索（選擇要互動的對象）", [
      ...list.map((i) => ({
        label: i.shop
          ? `${i.name}（可買賣）`
          : i.kind === "object"
            ? `${i.name}（物品）`
            : i.name,
        value: i,
      })),
    ]);
    if (!chosen) return;
    await this.interact(chosen);
  }

  private async interact(ia: Interactable): Promise<void> {
    if (ia.shop) {
      await this.openShop(ia.shop);
      return;
    }
    if (ia.restCost !== undefined) {
      await this.rest(ia);
      return;
    }
    const alreadyDone = isDone(this.state, ia.id);
    let rewarded = false;
    if (alreadyDone && ia.repeatText) {
      await playText(ia.repeatText);
    } else if (ia.story) {
      const completed = await this.runStory(ia.story);
      // 劇情因戰鬥失敗中斷時，不標記互動完成，讓玩家可重試。
      if (!completed) return;
    } else if (ia.text && ia.text.length > 0) {
      await playText(ia.text);
    }
    if (ia.battle && ia.battle.length > 0) {
      const won = await this.battle(ia.battle, ia.boss === true);
      if (!won) return;
    } else if (ia.area) {
      const area = AREAS[ia.area];
      if (!area) {
        ui.blank();
        ui.info("這裡沒什麼好探索的。");
        await pause();
      } else if (!(await this.handleExplore(rollExplore(area)))) {
        return;
      }
    }
    if (!alreadyDone) {
      if (ia.gold) {
        this.state.gold += ia.gold;
        ui.info(`　獲得金錢 ${ia.gold} 文。`);
        rewarded = true;
      }
      if (ia.items) {
        for (const it of ia.items) {
          addItem(this.state.items, it.itemId, it.qty);
          ui.info(`　獲得物品：${ITEMS[it.itemId].name} ×${it.qty}`);
        }
        rewarded = true;
      }
    }
    if (ia.setFlags) for (const f of ia.setFlags) this.state.flags[f] = true;
    markDone(this.state, ia.id);
    if (rewarded) await pause();
  }

  private async magic(): Promise<void> {
    // 列出全隊每人的仙術與效果；惟補血仙術可於戰鬥外施展，其餘僅限戰鬥中使用。
    type Entry = { caster: Character; skill: Skill };
    const options: PickOption<Entry>[] = [];
    let hasFieldSkill = false; // 是否有「可於戰鬥外使用」的補血仙術
    for (const m of this.state.party) {
      for (const id of m.skills) {
        const s = SKILLS[id];
        if (!s) continue;
        const field = s.kind === "heal";
        if (field) hasFieldSkill = true;
        const usable = field && s.mpCost <= m.mp;
        options.push({
          label: `${m.name}｜${s.name}（真氣 ${s.mpCost}）— ${s.desc}${
            field && !usable ? "　真氣不足" : ""
          }`,
          value: { caster: m, skill: s },
          disabled: !usable,
        });
      }
    }
    if (!options.some((o) => !o.disabled)) {
      ui.blank();
      ui.info(
        options.length === 0
          ? "隊伍尚未習得任何仙術。"
          : hasFieldSkill
            ? "真氣不足，無法施展仙術（休息或服藥可恢復真氣）。"
            : "尚未習得可在戰鬥外使用的仙術（僅補血仙術可於戰鬥外施展）。",
      );
      await pause();
      return;
    }
    const chosen = await pick("　施展仙術", options);
    if (!chosen) return;
    const { caster, skill } = chosen;
    let targets: Character[];
    if (skill.target === "all-allies") {
      targets = this.state.party.filter((p) => p.hp > 0);
    } else {
      const target = await this.choosePartyTarget();
      if (!target) return;
      targets = [target];
    }
    caster.mp -= skill.mpCost;
    const amount = healAmount(caster.mag, skill.power);
    ui.blank();
    for (const target of targets) {
      const healed = Math.min(amount, target.maxHp - target.hp);
      target.hp += healed;
      ui.info(
        `${caster.name} 施展「${skill.name}」，${target.name} 恢復了 ${healed} 點生命。`,
      );
    }
    await pause();
  }

  private async useItem(): Promise<void> {
    const available = this.state.items.filter((e) => e.qty > 0);
    if (available.length === 0) {
      ui.blank();
      ui.info("身上沒有可用之物。");
      await pause();
      return;
    }
    const opts: { label: string; value: Loadout | null }[] = available.map(
      (e) => {
        const item = ITEMS[e.itemId];
        const note =
          item.kind === "equip"
            ? "裝備（於「隊伍狀態」穿戴）"
            : item.kind === "material"
              ? "材料"
              : item.kind === "throw"
                ? "暗器（戰鬥中投擲）"
                : item.desc;
        return { label: `${item.name} ×${e.qty} — ${note}`, value: e };
      },
    );
    const entry = await pick("　道具", opts);
    if (!entry) return;
    const item = ITEMS[entry.itemId];
    if (item.kind === "treasure") {
      await this.useTreasure(entry);
      return;
    }
    if (
      item.kind === "equip" ||
      item.kind === "material" ||
      item.kind === "throw"
    ) {
      ui.blank();
      ui.info(
        item.kind === "equip"
          ? `「${item.name}」是裝備，請至「隊伍狀態」穿戴。`
          : item.kind === "material"
            ? `「${item.name}」目前無法直接使用，可於商店變賣。`
            : `「${item.name}」是暗器，只能在戰鬥中投擲。`,
      );
      await pause();
      return;
    }
    if (item.kind === "revive") {
      const downed = this.state.party.filter((p) => p.hp <= 0);
      if (downed.length === 0) {
        ui.blank();
        ui.info("沒有需要復活的同伴。");
        await pause();
        return;
      }
      const target = await pick(
        "　復活誰？",
        downed.map((p) => ({ label: p.name, value: p })),
      );
      if (!target) return;
      target.hp = Math.max(1, Math.floor((target.maxHp * item.value) / 100));
      ui.blank();
      ui.info(`${target.name} 復活了！`);
    } else {
      const target = await this.choosePartyTarget();
      if (!target) return;
      if (item.kind === "heal") {
        const hpGain = Math.min(item.value, target.maxHp - target.hp);
        const mpGain = item.mp
          ? Math.min(item.mp, target.maxMp - target.mp)
          : 0;
        if (hpGain <= 0 && mpGain <= 0) {
          ui.blank();
          ui.info("生命與真氣已滿，無需使用。");
          await pause();
          return;
        }
        target.hp += hpGain;
        target.mp += mpGain;
        ui.blank();
        ui.info(`${target.name} 恢復了 ${ui.recoverText(hpGain, mpGain)}。`);
      } else {
        if (target.mp >= target.maxMp) {
          ui.blank();
          ui.info("真氣已滿，無需使用。");
          await pause();
          return;
        }
        const healed = Math.min(item.value, target.maxMp - target.mp);
        target.mp += healed;
        ui.blank();
        ui.info(`${target.name} 恢復了 ${healed} 點真氣。`);
      }
    }
    consumeItem(this.state.items, entry);
    await pause();
  }

  private async useTreasure(entry: Loadout): Promise<void> {
    const res = openTreasure(this.state, entry);
    ui.blank();
    if (!res) {
      ui.info("這個東西打不開。");
      await pause();
      return;
    }
    ui.narrate("打開一看——");
    if (res.gold > 0) ui.info(`　獲得金錢 ${res.gold} 文。`);
    for (const it of res.items)
      ui.info(`　獲得物品：${ITEMS[it.itemId].name} ×${it.qty}`);
    if (res.skills.length > 0) {
      ui.blank();
      this.learnSkills(res.skills);
    }
    await pause();
  }

  private async choosePartyTarget(): Promise<Character | null> {
    const alive = this.state.party.filter((p) => p.hp > 0);
    if (alive.length === 0) return null;
    if (alive.length === 1) return alive[0];
    return pick("　選擇對象", [
      ...alive.map((p) => ({
        label: `${p.name}（HP ${p.hp}/${p.maxHp}）`,
        value: p,
      })),
    ]);
  }

  private async showStatus(): Promise<void> {
    ui.clear();
    ui.title("隊伍狀態");
    for (const m of this.state.party) {
      ui.blank();
      ui.info(ui.paint.bold(`${m.name}　Lv.${m.level}`));
      ui.info(`生命 ${m.hp}/${m.maxHp}　真氣 ${m.mp}/${m.maxMp}`);
      ui.info(`攻擊 ${m.atk}　防禦 ${m.def}　身法 ${m.spd}　靈力 ${m.mag}`);
      ui.info(`經驗 ${m.exp}/${expToNext(m.level)}`);
      ui.info(
        `武功：${m.skills.map((s) => SKILLS[s].name).join("、") || "無"}`,
      );
      ui.info(`裝備：${this.equipSummary(m)}`);
    }
    ui.blank();
    ui.info(`金錢：${this.state.gold} 文`);
    ui.info(
      `物品：${this.state.items.map((i) => `${ITEMS[i.itemId].name}×${i.qty}`).join("、") || "無"}`,
    );
    ui.blank();
    const choice = await pick("　是否更換裝備？", [
      { label: "更換裝備", value: "equip" },
    ]);
    if (choice === "equip") await this.equipMenu();
  }

  private equipSummary(m: Character): string {
    return EQUIP_SLOTS.map((s) => {
      const id = m.equipment[s.id];
      return `${s.name}：${
        id ? `${ITEMS[id].name}（${this.bonusText(ITEMS[id].bonus)}）` : "無"
      }`;
    }).join("　");
  }

  private async equipMenu(): Promise<void> {
    while (true) {
      const member = await pick("　要為誰更換裝備？", [
        ...this.state.party.map((m) => ({
          label: `${m.name}　Lv.${m.level}`,
          value: m,
        })),
      ]);
      if (!member) return;
      await this.equipSlotMenu(member);
    }
  }

  private async equipSlotMenu(m: Character): Promise<void> {
    while (true) {
      const slot = await pick(`　${m.name}：選擇部位`, [
        ...EQUIP_SLOTS.map((s) => {
          const id = m.equipment[s.id];
          return {
            label: `${s.name}：${
              id
                ? `${ITEMS[id].name}（${this.bonusText(ITEMS[id].bonus)}）`
                : "無"
            }`,
            value: s.id as EquipSlot,
          };
        }),
      ]);
      if (!slot) return;
      await this.chooseEquip(m, slot);
    }
  }

  private async chooseEquip(m: Character, slot: EquipSlot): Promise<void> {
    const slotName = EQUIP_SLOTS.find((s) => s.id === slot)?.name ?? slot;
    const equipped = m.equipment[slot];
    const candidates = this.state.items.filter(
      (e) =>
        e.qty > 0 &&
        ITEMS[e.itemId].kind === "equip" &&
        ITEMS[e.itemId].slot === slot &&
        canEquip(m, ITEMS[e.itemId]),
    );
    if (!equipped && candidates.length === 0) {
      ui.blank();
      ui.info(`沒有可裝備於「${slotName}」的物品。`);
      await pause();
      return;
    }
    const options: { label: string; value: Loadout | "off" | null }[] = [];
    if (equipped)
      options.push({
        label: `卸下（目前：${ITEMS[equipped].name}　${this.bonusText(ITEMS[equipped].bonus)}）`,
        value: "off",
      });
    for (const e of candidates) {
      options.push({
        label: `${ITEMS[e.itemId].name}（${this.bonusText(ITEMS[e.itemId].bonus)}）×${e.qty}`,
        value: e,
      });
    }
    const choice = await pick(`　${m.name}｜${slotName}`, options);
    if (!choice) return;

    if (equipped) {
      addItem(this.state.items, equipped, 1);
      delete m.equipment[slot];
    }
    if (choice === "off") {
      ui.blank();
      ui.info(`　${m.name} 卸下了「${ITEMS[equipped!].name}」。`);
    } else {
      const entry = choice;
      consumeItem(this.state.items, entry);
      m.equipment[slot] = entry.itemId;
      ui.blank();
      ui.info(`　${m.name} 裝備了「${ITEMS[entry.itemId].name}」。`);
    }
    recomputeStats(m);
    ui.info(`　攻擊 ${m.atk}　防禦 ${m.def}　身法 ${m.spd}　靈力 ${m.mag}`);
    await pause();
  }

  private bonusText(b?: EquipStats): string {
    if (!b) return "無加成";
    const labels: Record<keyof EquipStats, string> = {
      hp: "生命",
      mp: "真氣",
      atk: "攻擊",
      def: "防禦",
      spd: "身法",
      mag: "靈力",
    };
    return (Object.entries(b) as [keyof EquipStats, number][])
      .map(([k, v]) => `${labels[k]}${v >= 0 ? "+" : ""}${v}`)
      .join("、");
  }

  private itemNote(item: Item): string {
    return item.kind === "equip" ? this.bonusText(item.bonus) : item.desc;
  }

  private async openShop(shopId: string): Promise<void> {
    const shop = SHOPS[shopId];
    if (!shop) return;
    await playText(shop.greeting);
    while (true) {
      ui.blank();
      ui.info(`　【${shop.name}】　持有金錢：${this.state.gold} 文`);
      const choice = await pick<"buy" | "sell" | null>("　您要買賣什麼？", [
        { label: "買東西", value: "buy" },
        { label: "賣東西", value: "sell" },
        { label: "離開", value: null },
      ]);
      if (!choice) return;
      if (choice === "buy") await this.shopBuy(shop);
      else await this.shopSell(shop);
    }
  }

  private async shopBuy(shop: Shop): Promise<void> {
    const options: PickOption<string | null>[] = shop.stock.map((id) => {
      const item = ITEMS[id];
      return {
        label: `${item.name}　${item.price} 文　${this.itemNote(item)}`,
        value: id,
        disabled: this.state.gold < item.price,
      };
    });
    options.push({ label: "取消", value: null });
    const id = await pick(
      `　${shop.name}　選購商品（金錢 ${this.state.gold} 文）`,
      options,
    );
    if (!id) return;
    const item = ITEMS[id];
    buyItem(this.state, id);
    ui.blank();
    ui.info(`　買下了「${item.name}」，付了 ${item.price} 文。`);
    await pause();
  }

  private async shopSell(shop: Shop): Promise<void> {
    const sellable = this.state.items.filter(
      (e) => e.qty > 0 && ITEMS[e.itemId].price > 0,
    );
    if (sellable.length === 0) {
      ui.blank();
      ui.info("　身上沒有可以賣的東西。");
      await pause();
      return;
    }
    const options: PickOption<Loadout | null>[] = sellable.map((e) => ({
      label: `${ITEMS[e.itemId].name} ×${e.qty}　售 ${sellPrice(ITEMS[e.itemId].price)} 文`,
      value: e,
    }));
    options.push({ label: "取消", value: null });
    const entry = await pick(
      `　${shop.name}　出售物品（金錢 ${this.state.gold} 文）`,
      options,
    );
    if (!entry) return;
    const item = ITEMS[entry.itemId];
    const gain = sellPrice(item.price);
    sellItem(this.state, entry);
    ui.blank();
    ui.info(`　賣出了「${item.name}」，得 ${gain} 文。`);
    await pause();
  }

  private async rest(ia: Interactable): Promise<void> {
    const cost = ia.restCost ?? 0;
    const result = restParty(this.state, cost);
    ui.blank();
    if (result === "full") {
      ui.info("　大夥兒精神飽滿，不必休息。");
    } else if (result === "poor") {
      ui.info(`　投宿一晚需 ${cost} 文，你的盤纏不夠。`);
    } else {
      ui.narrate(
        cost > 0
          ? "一夜好眠，醒來時天已大亮。"
          : "李逍遙往自己的床上一躺，不一會兒便沉沉入睡。",
      );
      if (cost > 0) ui.info(`　付了 ${cost} 文。`);
      ui.info("　全隊的生命與真氣已完全恢復。");
    }
    await pause();
  }

  private async runStory(startId: string): Promise<boolean> {
    const runner = new StoryRunner(STORY_NODES, {
      battle: (ids, boss) => this.battle(ids, boss),
      reward: (node) => this.applyRewards(node),
      learn: (ids) => this.learnSkills(ids),
      setFlags: (ids) => this.setFlags(ids),
      join: (ids) => this.joinParty(ids),
    });
    return runner.run(startId);
  }

  private setFlags(flags: string[]): void {
    for (const f of flags) this.state.flags[f] = true;
  }

  private async handleExplore(res: ExploreResult): Promise<boolean> {
    if (res.kind === "battle") {
      if (res.enemies.length === 0) {
        ui.blank();
        ui.narrate("四周靜悄悄的，什麼也沒有。");
        await pause();
        return true;
      }
      return this.battle(res.enemies, false);
    }
    if (res.kind === "chest") {
      ui.blank();
      ui.narrate("你在草叢深處發現了一只舊木箱！");
      if (res.gold > 0) {
        this.state.gold += res.gold;
        ui.info(`　獲得金錢 ${res.gold} 文。`);
      }
      for (const it of res.items) {
        addItem(this.state.items, it.itemId, it.qty);
        ui.info(`　獲得物品：${ITEMS[it.itemId].name} ×${it.qty}`);
      }
      await pause();
      return true;
    }
    ui.blank();
    ui.narrate("四下搜尋了一番，卻一無所獲。");
    await pause();
    return true;
  }

  private async battle(enemyIds: string[], boss = false): Promise<boolean> {
    const enemies = enemyIds.map(spawnEnemy);
    const outcome = await runBattle(
      this.state.party,
      enemies,
      this.state.items,
      { boss },
    );
    if (outcome.enemiesFled) return true;
    if (outcome.fled) {
      ui.blank();
      ui.narrate("李逍遙抽身退開，脫離了戰鬥。");
      await pause();
      return false;
    }
    if (!outcome.victory) {
      const inSuzhou = this.state.flags["chapter1.done"] === true;
      ui.blank();
      ui.narrate(
        "眼前一黑，李逍遙倒了下去……",
        inSuzhou
          ? "再醒來時，已被同伴送回悅來客棧的客房。"
          : "再醒來時，已躺回餘杭客棧的床榻之上。",
      );
      for (const m of this.state.party) {
        m.hp = m.maxHp;
        m.mp = m.maxMp;
      }
      this.state.sceneId = inSuzhou ? SUZHOU_RESPAWN_SCENE : START_SCENE;
      await pause();
      return false;
    }
    this.reportVictory(outcome);
    await pause();
    return true;
  }

  private reportVictory(o: BattleOutcome): void {
    ui.blank();
    ui.rule("═");
    ui.info(ui.paint.green("　戰鬥勝利！"));
    ui.rule("═");
    ui.info(`　獲得經驗 ${o.exp}，金錢 ${o.gold} 文。`);
    this.state.gold += o.gold;
    for (const d of o.drops) {
      addItem(this.state.items, d.itemId, d.qty);
      ui.info(`　獲得物品：${ITEMS[d.itemId].name} ×${d.qty}`);
    }
    ui.blank();
    this.grantExp(o.exp);
  }

  private applyRewards(node: StoryNode): void {
    const r = node.rewards;
    if (!r) return;
    ui.blank();
    if (r.gold) {
      this.state.gold += r.gold;
      ui.info(`　獲得金錢 ${r.gold} 文。`);
    }
    if (r.items) {
      for (const it of r.items) {
        addItem(this.state.items, it.itemId, it.qty);
        ui.info(`　獲得物品：${ITEMS[it.itemId].name} ×${it.qty}`);
      }
    }
    if (r.exp) this.grantExp(r.exp);
  }

  private grantExp(amount: number): void {
    for (const m of this.state.party) {
      if (m.hp <= 0) continue;
      const logs = gainExp(m, amount);
      for (const lg of logs) {
        ui.info(ui.paint.green(`${m.name} 提升至 Lv.${lg.level}！`));
        for (const sid of lg.skills)
          ui.info(ui.paint.cyan(`　習得新武功「${SKILLS[sid].name}」！`));
      }
    }
  }

  private learnSkills(skillIds: string[]): void {
    const leader = this.leader();
    ui.blank();
    for (const id of skillIds) {
      if (leader.skills.includes(id)) continue;
      leader.skills.push(id);
      ui.info(ui.paint.cyan(`　${leader.name} 領悟了「${SKILLS[id].name}」！`));
    }
  }

  private joinParty(memberIds: string[]): void {
    const leader = this.leader();
    ui.blank();
    for (const id of memberIds) {
      if (this.state.party.some((m) => m.id === id)) continue;
      const member = createCharacter(id);
      // 新夥伴等級比照領隊，並依 learnset 補齊應習得的武功。
      while (member.level < leader.level)
        gainExp(member, expToNext(member.level));
      recomputeStats(member); // 計入入隊自帶裝備的加成
      member.exp = leader.exp;
      member.hp = member.maxHp;
      member.mp = member.maxMp;
      this.state.party.push(member);
      ui.info(ui.paint.cyan(`　${member.name} 加入了隊伍！`));
    }
  }

  private newGame(): void {
    this.state = {
      party: [createCharacter("li-xiaoyao")],
      gold: 0,
      items: [
        { itemId: "herb", qty: 3 },
        { itemId: "qi-pill", qty: 1 },
      ],
      sceneId: this.options.startSceneId ?? START_SCENE,
      flags: {},
    };
  }

  private leader(): Character {
    return this.state.party[0];
  }
}
