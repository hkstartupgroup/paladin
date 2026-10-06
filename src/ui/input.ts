import * as readline from "node:readline";
import * as readlinePromises from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { paint } from "./display";

let rl: readlinePromises.Interface | null = null;
let keypressReady = false;

function iface(): readlinePromises.Interface {
  if (!rl)
    rl = readlinePromises.createInterface({ input: stdin, output: stdout });
  return rl;
}

function ensureKeypress(): void {
  if (keypressReady) return;
  readline.emitKeypressEvents(stdin);
  keypressReady = true;
}

export function closeInput(): void {
  if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
  if (rl) {
    rl.close();
    rl = null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 讀取單一按鍵（僅於等待期間進入 raw 模式，其餘時間維持一般輸出）。
async function readKey(): Promise<readline.Key> {
  ensureKeypress();
  const wasRaw = stdin.isRaw === true;
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
  try {
    return await new Promise<readline.Key>((resolve) => {
      const onKey = (_str: string | undefined, key: readline.Key) => {
        stdin.removeListener("keypress", onKey);
        resolve(key);
      };
      stdin.on("keypress", onKey);
    });
  } finally {
    if (stdin.isTTY) stdin.setRawMode(wasRaw);
  }
}

function isEnter(key: readline.Key): boolean {
  return (
    key.name === "return" ||
    key.name === "enter" ||
    key.sequence === "\r" ||
    key.sequence === "\n"
  );
}

// 非 TTY（管線輸入）時退回逐行輸入。
async function ask(question: string): Promise<string> {
  const ans = await iface().question(`${question} `);
  return ans.trim();
}

export async function pause(promptText = "按 Enter 繼續…"): Promise<void> {
  if (!stdin.isTTY) {
    await iface().question(paint.dim(`  ${promptText}`));
    return;
  }
  stdout.write(paint.dim(`  ${promptText}`));
  while (true) {
    const key = await readKey();
    if (key.ctrl && key.name === "c") {
      stdout.write("\n");
      process.exit(0);
    }
    if (isEnter(key) || key.name === "space") break;
  }
  stdout.write("\n");
}

export interface PickOption<T> {
  label: string;
  value: T;
  disabled?: boolean;
}

const HINT = "數字 + Enter，Esc 取消";

// 選擇選項；按 Esc 取消並回傳 null。
export async function pick<T>(
  titleText: string,
  options: PickOption<T>[],
): Promise<T | null> {
  console.log(paint.bold(`  ${titleText}`));
  options.forEach((o, i) => {
    const label = o.disabled ? paint.dim(o.label) : o.label;
    console.log(`   ${paint.cyan(String(i + 1))}. ${label}`);
  });

  if (!stdin.isTTY) {
    while (true) {
      const raw = await ask("  選擇>");
      const n = Number(raw);
      if (raw === "\u001b") return null;
      if (
        Number.isInteger(n) &&
        n >= 1 &&
        n <= options.length &&
        !options[n - 1].disabled
      ) {
        return options[n - 1].value;
      }
      console.log(paint.red("  請輸入有效選項。"));
    }
  }

  let buf = "";
  const render = (): void => {
    stdout.write(
      `\r\u001b[K  ${paint.dim(`選擇（${HINT}）>`)} ${paint.cyan(buf)}`,
    );
  };
  render();
  while (true) {
    const key = await readKey();
    if (key.ctrl && key.name === "c") {
      stdout.write("\n");
      process.exit(0);
    }
    if (key.name === "escape") {
      stdout.write("\n");
      return null;
    }
    if (key.name === "backspace") {
      buf = buf.slice(0, -1);
      render();
      continue;
    }
    if (isEnter(key)) {
      const n = Number(buf);
      if (
        Number.isInteger(n) &&
        n >= 1 &&
        n <= options.length &&
        !options[n - 1].disabled
      ) {
        stdout.write("\n");
        return options[n - 1].value;
      }
      stdout.write(`\r\u001b[K  ${paint.red(`請輸入有效選項（Esc 取消）`)}\n`);
      buf = "";
      render();
      continue;
    }
    if (key.sequence && /^[0-9]$/.test(key.sequence)) {
      buf += key.sequence;
      render();
    }
  }
}
