export const LEVEL_RULE = {
  baseExp: 80,
  growth: 1.32,
  growthPerLevel: { hp: 18, mp: 6, atk: 3, def: 2, spd: 2, mag: 3 },
};

export const COMBAT_RULE = {
  variance: 0.12,
  critRate: 0.1,
  critMultiplier: 1.6,
  fleeRate: 0.55,
};

// 野外探索（練功）結果權重：遇敵 / 寶箱，其餘為空手
export const EXPLORE_RULE = {
  battleChance: 0.6,
  chestChance: 0.25,
};

// 商店：出售價為原價的 75%（依《新仙劍》當鋪規則）。
export const SHOP_RULE = {
  sellRate: 0.75,
};

// 擋格彩蛋：同伴替隊友攔下敵方普通攻擊的機率，與攔下後承受的傷害比例。
export const GUARD_RULE = {
  chance: 0.3,
  damageRate: 0.5,
};
