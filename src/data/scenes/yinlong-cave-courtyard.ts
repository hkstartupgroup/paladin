import { GameScene } from "../../models/types";

export const yinlongCaveCourtyard: GameScene = {
  id: "yinlong-cave-courtyard",
  name: "隱龍窟中庭",
  enterStory: "s2-courtyard",
  exits: [
    {
      to: "yinlong-cave-hall",
      label: "往洞窟內殿",
      requires: ["sz.courtyard"],
    },
    { to: "yinlong-cave-inner", label: "退回窟內" },
  ],
  interactables: [
    {
      id: "yl-courtyard-chest",
      name: "中庭的舊箱",
      kind: "object",
      text: ["中庭角落一只舊木箱，裡頭擱著些金創藥。"],
      items: [{ itemId: "herb", qty: 2 }],
    },
  ],
};
