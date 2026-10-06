import { GameScene } from "../../models/types";

export const linjiaGarden: GameScene = {
  id: "linjia-garden",
  name: "林家後院",
  exits: [
    { to: "linjia-hall", label: "回大廳" },
    {
      to: "linjia-west-room",
      label: "順著小徑往西廂房",
      requires: ["sz.haunt"],
    },
  ],
  interactables: [
    {
      id: "sz-garden-linger",
      name: "銀杏",
      kind: "npc",
      story: "s2-garden",
      requires: ["sz.hall"],
      hideWhen: ["sz.haunt"],
    },
    {
      id: "sz-garden-yueru",
      name: "林月如",
      kind: "npc",
      story: "s2-yueru-garden",
      requires: ["sz.hall"],
      repeatable: true,
      repeatText: [
        "林月如：嘻～我們家的花園很漂亮吧？在蘇州城就屬我家的庭院最大呢！",
      ],
    },
    {
      id: "sz-garden-flower",
      name: "花叢深處",
      kind: "object",
      text: ["花叢下掩著一只瑩潤的玉珮，李逍遙順手收了起來。"],
      items: [{ itemId: "jade-pendant", qty: 1 }],
    },
  ],
};
