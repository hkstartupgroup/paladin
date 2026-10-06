import { Fighter } from "../models/types";
import { RULE_WIDTH } from "../config/constants";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

export const paint = {
  bold: (s: string) => `${ANSI.bold}${s}${ANSI.reset}`,
  dim: (s: string) => `${ANSI.dim}${s}${ANSI.reset}`,
  red: (s: string) => `${ANSI.red}${s}${ANSI.reset}`,
  green: (s: string) => `${ANSI.green}${s}${ANSI.reset}`,
  yellow: (s: string) => `${ANSI.yellow}${s}${ANSI.reset}`,
  magenta: (s: string) => `${ANSI.magenta}${s}${ANSI.reset}`,
  cyan: (s: string) => `${ANSI.cyan}${s}${ANSI.reset}`,
};

export function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const wide =
      (c >= 0x1100 && c <= 0x115f) ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe4f) ||
      (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

export function padDisplay(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - strWidth(s)));
}

export function clear(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

export function rule(char = "─"): void {
  console.log(paint.dim(char.repeat(RULE_WIDTH)));
}

export function blank(): void {
  console.log();
}

export function title(text: string): void {
  blank();
  rule("═");
  console.log(paint.bold(paint.cyan(`  ${text}`)));
  rule("═");
  blank();
}

export function narrate(...lines: string[]): void {
  for (const l of lines) console.log(paint.dim(`  ${l}`));
}

export function say(speaker: string, text: string): void {
  console.log(`${paint.yellow(`【${speaker}】`)} ${text}`);
}

export function info(text: string): void {
  console.log(`  ${text}`);
}

// 恢復量文字，例如「20 點生命與 20 點真氣」。
export function recoverText(hp: number, mp: number): string {
  const parts: string[] = [];
  if (hp > 0) parts.push(`${hp} 點生命`);
  if (mp > 0) parts.push(`${mp} 點真氣`);
  return parts.join("與");
}

function bar(
  cur: number,
  max: number,
  width: number,
  full: string,
  empty: string,
): string {
  const ratio = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  const n = Math.round(ratio * width);
  return full.repeat(n) + empty.repeat(width - n);
}

export function fighterLine(
  f: Fighter,
  active = false,
  down = false,
  suffix = "",
): string {
  const marker = active ? paint.cyan("▶") : " ";
  const name = padDisplay(f.name, 10);
  const hpb = bar(f.hp, f.maxHp, 8, "█", "░");
  const ratio = f.maxHp > 0 ? f.hp / f.maxHp : 0;
  const hpCol =
    ratio > 0.5
      ? paint.green(hpb)
      : ratio > 0.25
        ? paint.yellow(hpb)
        : paint.red(hpb);
  const tail = down ? paint.dim("（倒下）") : suffix ? paint.dim(suffix) : "";
  return `  ${marker} ${name} HP ${hpCol} ${String(f.hp).padStart(4)}/${String(f.maxHp).padStart(4)}  真氣 ${String(f.mp).padStart(3)}/${String(f.maxMp).padStart(3)} ${tail}`;
}
