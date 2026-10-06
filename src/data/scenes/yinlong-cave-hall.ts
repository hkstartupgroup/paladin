import { GameScene } from "../../models/types";

export const yinlongCaveHall: GameScene = {
  id: "yinlong-cave-hall",
  name: "隱龍窟內殿",
  enterStory: "s2-fox-intro",
  exits: [{ to: "yinlong-cave-courtyard", label: "退回中庭" }],
  interactables: [
    {
      id: "yl-fox",
      name: "狐妖女",
      kind: "npc",
      story: "s2-fox-fight",
      requires: ["sz.fox-intro"],
      hideWhen: ["ch2.done"],
    },
  ],
};
