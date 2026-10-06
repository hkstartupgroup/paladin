import { GameScene } from "../../models/types";

export const linjiaHall: GameScene = {
  id: "linjia-hall",
  name: "林家大廳",
  enterStory: "s2-hall1",
  exits: [
    { to: "linjia-garden", label: "往林家後院" },
    {
      to: "linjia-west-room",
      label: "往西廂房",
      requires: ["sz.haunt"],
    },
    {
      to: "linjia-backhill",
      label: "往林家後山",
      requires: ["sz.linger.lost"],
    },
  ],
  interactables: [
    {
      id: "sz-bazi",
      name: "秋菊",
      kind: "npc",
      story: "s2-bazi",
      requires: ["sz.hall"],
      hideWhen: ["sz.bazi"],
    },
    {
      id: "sz-hall-corner",
      name: "廳角的几案",
      kind: "object",
      text: ["几案上擺著一只還神丹，想是待客之用。"],
      items: [{ itemId: "qi-pill", qty: 1 }],
    },
    {
      id: "sz-hall-rest",
      name: "東廂房的床榻",
      kind: "object",
      restCost: 50,
      repeatable: true,
    },
  ],
};
