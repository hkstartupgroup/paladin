import { GameScene } from "../../models/types";

export const yinlongCaveInner: GameScene = {
  id: "yinlong-cave-inner",
  name: "隱龍窟內",
  enterStory: "s2-cave-inner",
  exits: [
    {
      to: "yinlong-cave-courtyard",
      label: "往洞窟中庭",
      requires: ["sz.snake"],
    },
    { to: "yinlong-cave", label: "退回洞口" },
  ],
  interactables: [
    {
      id: "yl-snake",
      name: "蛇妖男",
      kind: "npc",
      story: "s2-snake-fight",
      requires: ["sz.cave-inner"],
      hideWhen: ["sz.snake"],
    },
    {
      id: "yl-inner-bones",
      name: "地上的白骨",
      kind: "object",
      text: ["一具白骨旁散落著幾枚梅花鏢，李逍遙揀了起來。"],
      items: [{ itemId: "plum-dart", qty: 1 }],
    },
  ],
};
