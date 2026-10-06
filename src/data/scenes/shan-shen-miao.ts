import { GameScene } from "../../models/types";

export const shanShenMiao: GameScene = {
  id: "shan-shen-miao",
  name: "十里坡·山神廟",
  exits: [{ to: "shili-po", label: "出廟回十里坡" }],
  interactables: [
    {
      id: "drunk-shrine",
      name: "醉道士",
      kind: "npc",
      story: "s-shrine",
      requires: ["amnesia"],
    },
    {
      id: "shrine-egg",
      name: "神像前的供品",
      kind: "object",
      text: ["供台上擺著一枚雞蛋。"],
      items: [{ itemId: "egg", qty: 1 }],
    },
    {
      id: "shrine-meat",
      name: "廟角的燒肉",
      kind: "object",
      text: ["廟角擱著一盤燒肉。"],
      items: [{ itemId: "roast-meat", qty: 1 }],
    },
  ],
};
