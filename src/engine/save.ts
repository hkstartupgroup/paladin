import * as fs from "node:fs";
import * as path from "node:path";

import { SAVE_DIR, SAVE_FILE } from "../config/constants";
import { GameState } from "../models/types";

function savePath(): string {
  return path.resolve(process.cwd(), SAVE_DIR, SAVE_FILE);
}

export function hasSave(): boolean {
  return fs.existsSync(savePath());
}

export function saveGame(state: GameState): void {
  fs.mkdirSync(path.dirname(savePath()), { recursive: true });
  fs.writeFileSync(savePath(), JSON.stringify(state, null, 2), "utf-8");
}

export function loadGame(): GameState | null {
  try {
    const raw = fs.readFileSync(savePath(), "utf-8");
    const state = JSON.parse(raw) as GameState;
    // 兼容未含裝備欄位的舊存檔
    for (const m of state.party) m.equipment ??= {};
    return state;
  } catch {
    return null;
  }
}
