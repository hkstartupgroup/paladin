// 主線「當前目標」提示：依旗標順序推進，顯示第一條尚未完成的目標。
// done 內旗標全部成立時，代表該目標已完成，改顯示下一條。
export interface Objective {
  done: string[];
  text: string;
}

export const OBJECTIVES: Objective[] = [
  { done: ["hall.greet"], text: "下樓到大廳，幫忙招呼上門的客人。" },
  { done: ["hall.paid"], text: "招呼苗人客倌，聽他們的吩咐。" },
  { done: ["chase.drunk"], text: "與嬸嬸說話，把賴在門口的醉道士趕走。" },
  { done: ["take.dish"], text: "到廚房幫嬸嬸端酒菜，再送上二樓客房。" },
  { done: ["has.wine"], text: "把酒菜端進二樓的第二間客房。" },
  { done: ["drunk.deal"], text: "把懷裡的桂花酒，給門口的醉道士。" },
  { done: ["to.market"], text: "到廚房找嬸嬸，聽她還有什麼交代。" },
  { done: ["aunt.sick"], text: "到渡口市集，替嬸嬸買幾斤新鮮的蝦。" },
  { done: ["doctor.done"], text: "趕回客棧，探望病倒的嬸嬸。" },
  { done: ["go.island"], text: "向王小虎問起仙靈島求藥的門路。" },
  { done: ["sail"], text: "請苗人頭領指點上仙靈島之法。" },
  { done: ["to.island"], text: "到渡口市集找張四哥，請他載你出海。" },
  { done: ["met.linger"], text: "登上仙靈島，往島上深處尋求仙藥。" },
  { done: ["got.medicine"], text: "進入水月宮，向仙女求取救治嬸嬸的仙藥。" },
  { done: ["island.returned"], text: "逃出仙靈島，搭張四哥的船回盛漁村。" },
  { done: ["aunt.cured"], text: "回客棧，餵嬸嬸服下紫金丹。" },
  { done: ["learned.sword"], text: "夜赴十里坡山神廟，赴醉道士之約。" },
  { done: ["inn.dawn"], text: "回客棧，聽嬸嬸說些什麼。" },
  {
    done: ["linger.joined"],
    text: "從柴房的密道溜回自己房間，查看房裡麻布袋中的姑娘。",
  },
  { done: ["to.island2"], text: "到渡口市集找張四哥，載你重返仙靈島。" },
  { done: ["granny.dead"], text: "再登仙靈島，趕往水月宮。" },
  { done: ["island2.return"], text: "搭張四哥的船，回盛漁村。" },
  { done: ["baiyue.defeated"], text: "回客棧，面對拜月教一夥。" },
  { done: ["to.miaojiang"], text: "聽嬸嬸的安排。" },
  { done: ["chapter1.done"], text: "到渡口市集登上方老闆的船，啟程苗疆。" },

  // ── 第二章・姑蘇招親 ──
  { done: ["sz.outskirts"], text: "搭方老闆的船，前往蘇州。" },
  { done: ["sz.inn"], text: "進蘇州城，到悅來客棧落腳。" },
  { done: ["sz.arena"], text: "進城逛逛，再往林家堡瞧熱鬧。" },
  { done: ["sz.hall"], text: "隨林天南入林家大廳，說明白比武之事。" },
  { done: ["sz.bazi"], text: "到林家後院探視趙姑娘，再回大廳。" },
  { done: ["sz.linger.lost"], text: "西廂房鬧妖怪、趙姑娘失蹤——趕去查看！" },
  { done: ["sz.yueru.join"], text: "往林家後山，與林月如會合。" },
  { done: ["sz.cave"], text: "隨林月如前往隱龍窟尋人。" },
  { done: ["sz.snake"], text: "深入隱龍窟，查出趙姑娘的下落。" },
  { done: ["sz.courtyard"], text: "往洞窟更深處找去。" },
  { done: ["ch2.done"], text: "在內殿救出被抓的姑娘，擊敗狐妖女。" },
];

export const OBJECTIVE_ALL_DONE = "第二章已完成，敬請期待後續章節。";
