import { GameScene } from "../../models/types";

export const moonPalace: GameScene = {
  id: "moon-palace",
  name: "仙靈島·水月宮",
  exits: [{ to: "moon-palace-out", label: "走出水月宮" }],
  interactables: [
    {
      id: "linger",
      name: "趙靈兒",
      kind: "npc",
      story: "s-moon-palace",
      requires: ["met.linger"],
    },
    {
      id: "granny-death",
      name: "姥姥",
      kind: "npc",
      story: "s-granny-death",
      requires: ["to.island2"],
      hideWhen: ["granny.dead"],
    },
    {
      id: "palace-charm",
      name: "供桌上的觀音符",
      kind: "object",
      text: ["供桌上擱著一張觀音符。"],
      items: [{ itemId: "note-charm", qty: 1 }],
    },
    {
      id: "palace-pill",
      name: "丹房的行軍丹",
      kind: "object",
      text: ["丹房裡收著一枚行軍丹。"],
      items: [{ itemId: "march-pill", qty: 1 }],
    },
    {
      id: "palace-sweet",
      name: "几上的糖葫蘆",
      kind: "object",
      text: ["几上擺著一串糖葫蘆。"],
      items: [{ itemId: "candied-fruit", qty: 1 }],
    },
  ],
};
