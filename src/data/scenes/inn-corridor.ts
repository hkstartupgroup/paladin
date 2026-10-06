import { GameScene } from "../../models/types";

export const innCorridor: GameScene = {
  id: "inn-corridor",
  name: "餘杭客棧·二樓走廊",
  exits: [
    {
      to: "inn-room",
      label: "回李逍遙的房間",
      lockedWhen: ["inn.dawn", "!linger.joined"],
      lockedText: [
        "李逍遙的房門外守著兩名苗人，一臉凶相，怎麼也不肯讓他進去。",
        "（房間被客倌佔了…也許能從柴房的密道溜回去。）",
      ],
    },
    { to: "guest-room-1", label: "進第一間客房" },
    { to: "guest-room", label: "進第二間客房", requires: ["take.dish"] },
    { to: "inn-hall", label: "下樓到大廳" },
  ],
  interactables: [
    {
      id: "hall-planter",
      name: "走廊邊的花盆",
      kind: "object",
      text: ["花盆邊的縫隙裡掉著一小串銅錢。"],
      gold: 15,
    },
  ],
};
