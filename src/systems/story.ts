import { StoryNode } from "../models/types";
import * as ui from "../ui/display";
import { pick, pause } from "../ui/input";

export interface StoryHooks {
  battle(enemyIds: string[], boss?: boolean): Promise<boolean>;
  reward(node: StoryNode): void;
  learn(skillIds: string[]): void;
  setFlags(flags: string[]): void;
  join(memberIds: string[]): void;
}

const SPEAKER = /^([^\s：]{1,8})：(.+)$/;

export function renderLine(line: string): void {
  const m = line.match(SPEAKER);
  if (m) ui.say(m[1], m[2]);
  else ui.narrate(line);
}

export async function playText(lines: string[]): Promise<void> {
  ui.blank();
  for (const line of lines) renderLine(line);
  await pause();
}

export class StoryRunner {
  constructor(
    private readonly nodes: Record<string, StoryNode>,
    private readonly hooks: StoryHooks,
  ) {}

  async run(startId: string): Promise<void> {
    let nodeId: string | undefined = startId;
    while (nodeId) {
      const node: StoryNode = this.nodes[nodeId];
      if (!node) throw new Error(`劇情節點不存在：${nodeId}`);

      await playText(node.text);

      if (node.setFlags && node.setFlags.length > 0)
        this.hooks.setFlags(node.setFlags);
      if (node.rewards) this.hooks.reward(node);
      if (node.learnSkills && node.learnSkills.length > 0)
        this.hooks.learn(node.learnSkills);
      if (node.joinParty && node.joinParty.length > 0)
        this.hooks.join(node.joinParty);

      if (node.battle && node.battle.length > 0) {
        ui.blank();
        const won = await this.hooks.battle(node.battle, node.boss);
        if (!won) return;
      }

      if (node.end) {
        ui.blank();
        ui.narrate("（本章結束 · 後續章節敬請期待）");
        await pause();
        return;
      }

      if (node.choices && node.choices.length > 0) {
        const options = node.choices.map((c) => ({
          label: c.label,
          value: c.next,
        }));
        let next: string | null = null;
        while (next === null) next = await pick("　抉擇", options);
        nodeId = next;
      } else {
        nodeId = node.next;
      }
    }
  }
}
