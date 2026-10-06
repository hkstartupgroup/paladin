import { GameScene } from "../../models/types";

export const suzhouInn: GameScene = {
  id: "suzhou-inn",
  name: "蘇州·悅來客棧",
  enterStory: "s2-inn",
  exits: [
    {
      to: "suzhou-street",
      label: "走出客棧，往蘇州城內",
      requires: ["sz.inn"],
    },
  ],
  interactables: [
    {
      id: "sz-inn-rescue",
      name: "被圍毆的書生",
      kind: "npc",
      story: "s2-inn-fight",
      requires: ["sz.inn.arrive"],
      hideWhen: ["sz.inn"],
    },
    {
      id: "sz-inn-bed",
      name: "客棧的床榻",
      kind: "object",
      restCost: 50,
      repeatable: true,
    },
    {
      id: "sz-inn-wine",
      name: "桌上的酒菜",
      kind: "object",
      text: ["桌上留著一壺尚未開封的酒。"],
      items: [{ itemId: "wine", qty: 1 }],
    },
  ],
};
