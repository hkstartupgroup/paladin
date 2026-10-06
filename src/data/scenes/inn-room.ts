import { GameScene } from "../../models/types";

export const innRoom: GameScene = {
  id: "inn-room",
  name: "餘杭客棧·李逍遙房",
  enterStory: "s-intro",
  exits: [{ to: "inn-corridor", label: "開門到走廊" }],
  interactables: [
    {
      id: "flower-stand",
      name: "床前的花架",
      kind: "object",
      text: ["床前的花架上擱著一頂舊皮帽，李逍遙順手收了起來。"],
      items: [{ itemId: "cap", qty: 1 }],
    },
    {
      id: "bookcase",
      name: "房角的書櫥",
      kind: "object",
      text: [
        "書櫥裡塞滿了李逍遙削的木刀木劍，書本倒沒翻過幾頁。",
        "櫥底還藏著一雙結實的木鞋。",
      ],
      items: [{ itemId: "wooden-shoes", qty: 1 }],
    },
    {
      id: "own-bed",
      name: "自己的床榻",
      kind: "object",
      restCost: 0,
      repeatable: true,
    },
    {
      id: "secret",
      name: "床邊的密道",
      kind: "object",
      story: "s-secret",
      repeatable: true,
      repeatText: ["李逍遙看了看床邊的密道——這條暗道直通樓下的柴房。"],
    },
    {
      id: "linger-captured",
      name: "麻布袋裡的姑娘",
      kind: "npc",
      story: "s-linger-captured",
      requires: ["inn.dawn"],
      hideWhen: ["linger.joined"],
    },
  ],
};
