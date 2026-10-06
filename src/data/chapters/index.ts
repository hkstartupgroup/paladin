import { Chapter, StoryNode } from "../../models/types";
import { CHAPTER_01 } from "./chapter01";
import { CHAPTER_02 } from "./chapter02";

// 全章劇情節點合併為單一註冊表（節點 id 全章唯一：第一章 s-*、第二章 s2-*）。
// 劇情引擎（src/systems/story.ts 的 StoryRunner）與各場景的 enterStory／互動皆查此表。
export const CHAPTERS: Chapter[] = [CHAPTER_01, CHAPTER_02];

export const STORY_NODES: Record<string, StoryNode> = {
  ...CHAPTER_01.nodes,
  ...CHAPTER_02.nodes,
};
