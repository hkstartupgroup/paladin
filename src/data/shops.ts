import { Shop } from "../models/types";

// 商店資料。位置依《新仙劍》盛漁村渡口市集：鐵匠鋪（曾大伯）、木匠鋪（林木匠）、洪大夫藥鋪。
// 販售品項依原作攻略，售價一律取自 ITEMS 的 price（詳見 README「原著考據來源」）。
export const SHOPS: Record<string, Shop> = {
  blacksmith: {
    id: "blacksmith",
    name: "曾大伯的鐵匠鋪",
    greeting: [
      "曾大伯：小夥子，要買兵器還是防具？我這爐裡打出來的，可都是實打實的好貨。",
    ],
    stock: [
      "short-blade",
      "shoulder-guard",
      "cloak",
      "iron-boots",
      "wrist-guard",
      "iron-wrist-guard",
    ],
  },
  carpenter: {
    id: "carpenter",
    name: "林木匠的木匠鋪",
    greeting: [
      "林木匠：逍遙啊，來看看？木劍、藤甲、草鞋……都是現成的，價錢好商量。",
    ],
    stock: [
      "wooden-sword",
      "rattan-armor",
      "straw-shoes",
      "wooden-shoes",
      "cap",
      "hairpin",
    ],
  },
  doctor: {
    id: "doctor",
    name: "洪大夫藥鋪",
    greeting: ["洪大夫：要抓藥嗎？止血草、還神丹、還魂香，我這藥鋪都有。"],
    stock: ["styptic-herb", "qi-pill", "soul-pill"],
  },

  // ── 第二章・蘇州城內店鋪 ──
  "suzhou-doctor": {
    id: "suzhou-doctor",
    name: "蘇州回春堂藥鋪",
    greeting: [
      "藥鋪掌櫃：客官可是要買傷藥？蘇州城裡就數咱家的藥材最齊全。",
    ],
    stock: ["styptic-herb", "herb", "qi-pill", "soul-pill", "note-charm"],
  },
  "suzhou-blacksmith": {
    id: "suzhou-blacksmith",
    name: "蘇州鐵鋪",
    greeting: ["鐵匠：要打兵器還是護具？蘇州城裡的刀劍，我打的稱得上數一數二。"],
    stock: [
      "short-blade",
      "shoulder-guard",
      "cloak",
      "iron-boots",
      "wrist-guard",
      "iron-wrist-guard",
    ],
  },
  "suzhou-draper": {
    id: "suzhou-draper",
    name: "蘇州布莊",
    greeting: ["布莊掌櫃：瞧瞧布料鞋帽？咱這布靴輕便耐走，走遠路最合用。"],
    stock: ["cloth-boots", "straw-shoes", "hairpin", "jade-pendant", "silk-scarf"],
  },
};
