import { GameScene } from "../../models/types";

export const peachForest: GameScene = {
  id: "peach-forest",
  name: "仙靈島·桃樹林",
  exits: [
    { to: "lotus-pond", label: "回荷花池" },
    { to: "moon-palace-out", label: "往水月宮外" },
  ],
  interactables: [
    {
      id: "peach-fruit",
      name: "桃樹上的果子",
      kind: "object",
      text: ["樹上結著幾枚鼠兒果，李逍遙摘了下來。"],
      items: [{ itemId: "mouse-fruit", qty: 2 }],
    },
  ],
};
