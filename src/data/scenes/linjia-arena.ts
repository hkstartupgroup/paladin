import { GameScene } from "../../models/types";

export const linjiaArena: GameScene = {
  id: "linjia-arena",
  name: "林家堡·比武招親",
  enterStory: "s2-arena-intro",
  exits: [
    {
      to: "linjia-hall",
      label: "隨林天南入林家大廳",
      requires: ["sz.arena"],
    },
  ],
  interactables: [
    {
      id: "sz-duel",
      name: "上台與林月如比試",
      kind: "npc",
      story: "s2-duel",
      requires: ["sz.arena.intro"],
      hideWhen: ["sz.arena"],
    },
    {
      id: "sz-arena-stand",
      name: "擂台邊的藥攤",
      kind: "object",
      text: ["擂台邊的藥攤上落著一包金創藥。"],
      items: [{ itemId: "herb", qty: 1 }],
    },
  ],
};
