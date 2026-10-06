import { GameScene } from "../../models/types";

export const yinlongCave: GameScene = {
  id: "yinlong-cave",
  name: "隱龍窟",
  enterStory: "s2-cave",
  exits: [
    {
      to: "yinlong-cave-inner",
      label: "往洞窟深處",
      requires: ["sz.cave"],
    },
    { to: "linjia-backhill", label: "退出隱龍窟" },
  ],
  interactables: [
    {
      id: "yl-explore",
      name: "四下探索",
      kind: "object",
      area: "yinlong-cave",
      repeatable: true,
    },
    {
      id: "yl-cave-wall",
      name: "岩壁縫隙",
      kind: "object",
      text: ["岩壁的縫隙間，長著一株龍涎草。"],
      items: [{ itemId: "dragon-grass", qty: 1 }],
    },
  ],
};
