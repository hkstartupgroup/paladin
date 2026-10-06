import { GameScene } from "../../models/types";

export const moonPalaceOut: GameScene = {
  id: "moon-palace-out",
  name: "仙靈島·水月宮外",
  exits: [
    { to: "peach-forest", label: "回桃樹林" },
    { to: "moon-palace", label: "走進水月宮", requires: ["met.linger"] },
  ],
  interactables: [
    {
      id: "linger-meet",
      name: "池邊的衣衫",
      kind: "object",
      story: "s-linger",
      requires: ["lotus.open"],
      hideWhen: ["met.linger"],
    },
    {
      id: "palace-herb",
      name: "階前的藥圃",
      kind: "object",
      text: ["藥圃裡餘著一株止血草。"],
      items: [{ itemId: "herb", qty: 1 }],
    },
    {
      id: "palace-blade",
      name: "草叢裡的苗刀",
      kind: "object",
      text: ["草叢裡落著一把苗刀。"],
      items: [{ itemId: "miao-blade", qty: 1 }],
    },
  ],
};
