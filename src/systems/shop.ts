import { SHOP_RULE } from "../config/balance";
import { ITEMS } from "../data/items";
import { GameState, Loadout } from "../models/types";
import { addItem, consumeItem } from "./inventory";

// 商店收購價：原價的 75%（依《新仙劍》當鋪規則）。
export function sellPrice(price: number): number {
  return Math.floor(price * SHOP_RULE.sellRate);
}

// 購買一件商品；金錢不足或非賣品則不成立。
export function buyItem(state: GameState, itemId: string): boolean {
  const item = ITEMS[itemId];
  if (!item || item.price <= 0 || state.gold < item.price) return false;
  state.gold -= item.price;
  addItem(state.items, itemId, 1);
  return true;
}

// 出售一件物品；價格為 0 者（如劇情道具）不可出售。
export function sellItem(state: GameState, entry: Loadout): boolean {
  const item = ITEMS[entry.itemId];
  if (!item || item.price <= 0 || entry.qty <= 0) return false;
  state.gold += sellPrice(item.price);
  consumeItem(state.items, entry);
  return true;
}
