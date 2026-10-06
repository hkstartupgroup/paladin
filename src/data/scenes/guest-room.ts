import { GameScene } from "../../models/types";

export const guestRoom: GameScene = {
  id: "guest-room",
  name: "餘杭客棧·第二間客房",
  exits: [{ to: "inn-corridor", label: "回走廊" }],
  interactables: [
    {
      id: "miao-serve",
      name: "苗人嘍囉",
      kind: "npc",
      story: "s-serve-wine",
      requires: ["take.dish"],
      repeatable: true,
      repeatText: [
        "苗人嘍囉甲：東西擱著就好，別在這兒礙手礙腳。",
        "苗人嘍囉乙：沒你的事了，出去吧。",
      ],
    },
    {
      id: "guest-bed",
      name: "客房的床鋪",
      kind: "object",
      text: ["床鋪整理得齊整，枕下壓著幾枚梅花鏢。"],
      items: [{ itemId: "plum-dart", qty: 1 }],
    },
  ],
};
