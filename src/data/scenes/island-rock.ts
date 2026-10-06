import { GameScene } from "../../models/types";

export const islandRock: GameScene = {
  id: "island-rock",
  name: "仙靈島·岩徑",
  exits: [
    { to: "island-shore", label: "回岸邊" },
    { to: "lotus-pond", label: "往荷花池" },
  ],
  interactables: [
    {
      id: "rock-grind",
      name: "四下探索（練功）",
      kind: "object",
      area: "island-rock",
      repeatable: true,
    },
  ],
};
