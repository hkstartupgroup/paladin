import { GameScene } from "../../models/types";

export const guestRoom1: GameScene = {
  id: "guest-room-1",
  name: "餘杭客棧·第一間客房",
  exits: [{ to: "inn-corridor", label: "回走廊" }],
  interactables: [
    {
      id: "room1-planter",
      name: "窗邊的花盆",
      kind: "object",
      text: ["窗邊花盆的泥土鬆動，翻出一枚帶殼的蠱卵。"],
      items: [{ itemId: "gu-egg", qty: 1 }],
    },
  ],
};
