import { EXPLORE_RULE } from "../config/balance";
import { Area } from "../data/enemies";
import { GameScene, GameState, Interactable, SceneExit } from "../models/types";

const DONE_PREFIX = "ia:";
const ENTER_PREFIX = "enter:";

export function hasFlags(state: GameState, flags?: string[]): boolean {
  if (!flags || flags.length === 0) return true;
  return flags.every((f) => state.flags[f] === true);
}

export function isDone(state: GameState, id: string): boolean {
  return state.flags[DONE_PREFIX + id] === true;
}

export function markDone(state: GameState, id: string): void {
  state.flags[DONE_PREFIX + id] = true;
}

export function hasEntered(state: GameState, sceneId: string): boolean {
  return state.flags[ENTER_PREFIX + sceneId] === true;
}

export function markEntered(state: GameState, sceneId: string): void {
  state.flags[ENTER_PREFIX + sceneId] = true;
}

export function availableExits(
  scene: GameScene,
  state: GameState,
): SceneExit[] {
  return scene.exits.filter(
    (e) =>
      hasFlags(state, e.requires) &&
      !(e.lockedWhen && hasFlags(state, e.lockedWhen)) &&
      !(e.hideWhen && hasFlags(state, e.hideWhen)),
  );
}

export function visibleExits(scene: GameScene, state: GameState): SceneExit[] {
  return scene.exits.filter(
    (e) =>
      (hasFlags(state, e.requires) || (e.lockedText?.length ?? 0) > 0) &&
      !(e.hideWhen && hasFlags(state, e.hideWhen)),
  );
}

export function availableInteractables(
  scene: GameScene,
  state: GameState,
): Interactable[] {
  return scene.interactables.filter(
    (i) =>
      hasFlags(state, i.requires) &&
      !(i.hideWhen && hasFlags(state, i.hideWhen)) &&
      (i.repeatable === true || !isDone(state, i.id)),
  );
}

export type ExploreResult =
  | { kind: "battle"; enemies: string[] }
  | { kind: "chest"; gold: number; items: { itemId: string; qty: number }[] }
  | { kind: "nothing" };

export function rollExplore(
  area: Area,
  rng: () => number = Math.random,
): ExploreResult {
  const roll = rng();
  if (roll < EXPLORE_RULE.battleChance) {
    const group = area.encounters[Math.floor(rng() * area.encounters.length)];
    return { kind: "battle", enemies: group ? [...group] : [] };
  }
  if (roll < EXPLORE_RULE.battleChance + EXPLORE_RULE.chestChance) {
    const items: { itemId: string; qty: number }[] = [];
    for (const l of area.loot ?? []) {
      if (rng() < l.chance) {
        const min = l.min ?? 1;
        const max = l.max ?? 1;
        items.push({
          itemId: l.itemId,
          qty: min + Math.floor(rng() * (max - min + 1)),
        });
      }
    }
    const [lo, hi] = area.chestGold ?? [0, 0];
    const gold = lo + Math.floor(rng() * (hi - lo + 1));
    return { kind: "chest", gold, items };
  }
  return { kind: "nothing" };
}
