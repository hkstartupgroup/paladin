import { GameScene } from "../../models/types";

export const linjiaWestRoom: GameScene = {
  id: "linjia-west-room",
  name: "林家西廂房",
  enterStory: "s2-west",
  exits: [{ to: "linjia-hall", label: "回大廳" }],
  interactables: [
    {
      id: "sz-west-dresser",
      name: "梳妝台",
      kind: "object",
      text: ["梳妝台的屜子裡，留著一枚精巧的髮飾。"],
      items: [{ itemId: "hairpin", qty: 1 }],
    },
  ],
};
