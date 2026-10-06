import { GameScene } from "../../models/types";

export const auntRoom: GameScene = {
  id: "aunt-room",
  name: "餘杭客棧·李大娘房",
  exits: [{ to: "inn-hall", label: "回大廳" }],
  interactables: [
    {
      id: "aunt-bed",
      name: "李大娘",
      kind: "npc",
      story: "s-aunt-bed",
      hideWhen: ["island.returned"],
      repeatable: true,
      repeatText: ["李逍遙：嬸嬸，妳一定要撐著，我這就去想辦法救妳。"],
    },
    {
      id: "aunt-cure",
      name: "李大娘",
      kind: "npc",
      story: "s-aunt-cure",
      requires: ["island.returned"],
      hideWhen: ["aunt.cured"],
    },
    {
      id: "aunt-awake",
      name: "李大娘",
      kind: "npc",
      story: "s-aunt-awake",
      requires: ["aunt.cured"],
      repeatable: true,
      repeatText: ["李大娘：傻孩子，嬸嬸沒事了，你快去歇著吧。"],
    },
    { id: "doctor", name: "洪大夫", kind: "npc", story: "s-aunt-doctor" },
    {
      id: "xiaohu",
      name: "王小虎",
      kind: "npc",
      story: "s-aunt-xiaohu",
      requires: ["doctor.done"],
      repeatable: true,
      repeatText: ["王小虎：逍遙哥哥，你放心去仙靈島，李大娘我來照顧！"],
    },
    {
      id: "aunt-cupboard",
      name: "嬸嬸的櫃子",
      kind: "object",
      text: ["櫃子裡收著一疊銅錢。"],
      gold: 50,
    },
    {
      id: "aunt-table",
      name: "桌上的果盤",
      kind: "object",
      text: ["桌上擺著一盤時令水果。"],
      items: [{ itemId: "fruit", qty: 1 }],
    },
  ],
};
