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
};
