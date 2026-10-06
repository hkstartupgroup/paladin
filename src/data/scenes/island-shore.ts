import { GameScene } from "../../models/types";

export const islandShore: GameScene = {
  id: "island-shore",
  name: "仙靈島·岸邊",
  exits: [
    { to: "island-rock", label: "往島上岩徑" },
    { to: "market", label: "搭船回盛漁村", requires: ["island.returned"] },
  ],
  interactables: [
    {
      id: "zhang-si",
      name: "張四哥",
      kind: "npc",
      story: "s-island-zhangsi",
      hideWhen: ["island.escape"],
      repeatable: true,
      repeatText: ["張四哥：我在岸邊看船，你自個兒小心些。"],
    },
    {
      id: "zhang-si-return",
      name: "張四哥",
      kind: "npc",
      story: "s-island-return",
      requires: ["island.escape"],
      hideWhen: ["island.returned"],
      repeatable: true,
      repeatText: ["張四哥：快上船吧，風浪要變大了！"],
    },
    {
      id: "zhang-si-2",
      name: "張四哥",
      kind: "npc",
      story: "s-island2-return",
      requires: ["granny.dead"],
      hideWhen: ["island2.return"],
    },
    {
      id: "shore-salt",
      name: "岸邊的礁石",
      kind: "object",
      text: ["礁石縫裡結著一小撮鹽巴。"],
      items: [{ itemId: "salt", qty: 1 }],
    },
    {
      id: "shore-grass",
      name: "岸邊的草叢",
      kind: "object",
      text: ["草叢間長著一株龍涎草。"],
      items: [{ itemId: "dragon-grass", qty: 1 }],
    },
  ],
};
