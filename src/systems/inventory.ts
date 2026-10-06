import { Loadout } from "../models/types";

// 取得物品（同品項則累加），回傳受影響的欄位。
export function addItem(items: Loadout[], itemId: string, qty: number): void {
  const found = items.find((i) => i.itemId === itemId);
  if (found) found.qty += qty;
  else items.push({ itemId, qty });
}

// 消耗一個物品；數量歸零時自清單移除。
export function consumeItem(items: Loadout[], entry: Loadout): void {
  entry.qty -= 1;
  if (entry.qty <= 0) {
    const idx = items.indexOf(entry);
    if (idx >= 0) items.splice(idx, 1);
  }
}
