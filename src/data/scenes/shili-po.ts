import { GameScene } from "../../models/types";

export const shiliPo: GameScene = {
  id: "shili-po",
  name: "十里坡",
  exits: [
    { to: "market", label: "回盛漁村渡口" },
    { to: "shan-shen-miao", label: "往十里坡深處（山神廟）" },
  ],
  interactables: [
    {
      id: "shili-grind",
      name: "四下探索（練功）",
      kind: "object",
      area: "shili-po",
      repeatable: true,
    },
  ],
};
