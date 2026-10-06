import { GameScene } from "../../models/types";

export const linjiaBackhill: GameScene = {
  id: "linjia-backhill",
  name: "林家後山",
  enterStory: "s2-backhill",
  exits: [
    {
      to: "yinlong-cave",
      label: "隨林月如往隱龍窟",
      requires: ["sz.yueru.join"],
    },
    { to: "linjia-hall", label: "回林家大廳" },
  ],
  interactables: [
    {
      id: "sz-hill-track",
      name: "山徑旁的碎石",
      kind: "object",
      text: ["碎石堆裡埋著一小包行軍丹。"],
      items: [{ itemId: "march-pill", qty: 1 }],
    },
  ],
};
