import { GameScene } from "../../models/types";

export const suzhouStreet: GameScene = {
  id: "suzhou-street",
  name: "蘇州城內",
  exits: [
    { to: "suzhou-inn", label: "回悅來客棧" },
    { to: "linjia-arena", label: "往林家堡·比武招親" },
  ],
  interactables: [
    {
      id: "sz-fortune",
      name: "算命仙",
      kind: "npc",
      story: "s2-fortune",
      repeatable: true,
      repeatText: ["算命仙：鐵口直斷，不靈免錢～二位要算命嗎？"],
    },
    {
      id: "sz-street-snack",
      name: "街邊的糖葫蘆攤",
      kind: "object",
      text: ["攤上插著一串串糖葫蘆，李逍遙順手買了一串。"],
      items: [{ itemId: "candied-fruit", qty: 1 }],
    },
    {
      id: "sz-doctor-shop",
      name: "回春堂藥鋪",
      kind: "object",
      shop: "suzhou-doctor",
      repeatable: true,
    },
    {
      id: "sz-blacksmith-shop",
      name: "蘇州鐵鋪",
      kind: "object",
      shop: "suzhou-blacksmith",
      repeatable: true,
    },
    {
      id: "sz-draper-shop",
      name: "蘇州布莊",
      kind: "object",
      shop: "suzhou-draper",
      repeatable: true,
    },
  ],
};
