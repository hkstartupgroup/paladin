import { GameScene } from "../../models/types";

export const suzhouOutskirts: GameScene = {
  id: "suzhou-outskirts",
  name: "蘇州城外",
  enterStory: "s2-arrive",
  exits: [
    {
      to: "suzhou-inn",
      label: "進蘇州城，到悅來客棧歇腳",
      requires: ["sz.outskirts"],
    },
  ],
  interactables: [
    {
      id: "sz-save",
      name: "被圍住的大小姐",
      kind: "npc",
      story: "s2-outskirts-fight",
      requires: ["sz.arrive"],
      hideWhen: ["sz.outskirts"],
    },
    {
      id: "sz-outskirts-grass",
      name: "路旁的草叢",
      kind: "object",
      text: ["草叢裡絆著一只布囊，打開一看，裡頭有些散碎銅錢。"],
      gold: 20,
    },
  ],
};
