import { GameScene } from "../../models/types";

export const innShed: GameScene = {
  id: "inn-shed",
  name: "餘杭客棧·柴房",
  exits: [
    { to: "inn-hall", label: "回大廳" },
    {
      to: "inn-room",
      label: "爬上柴堆的繩索，從密道溜進自己房間",
      requires: ["inn.dawn"],
    },
  ],
  interactables: [
    {
      id: "shed-jar",
      name: "罈子旁",
      kind: "object",
      text: ["柴堆旁的罈子邊，放著兩顆滷好的茶葉蛋。"],
      items: [{ itemId: "tea-egg", qty: 1 }],
    },
  ],
};
