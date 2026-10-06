import { GameScene } from "../../models/types";

import { innRoom } from "./inn-room";
import { innCorridor } from "./inn-corridor";
import { guestRoom1 } from "./guest-room-1";
import { guestRoom } from "./guest-room";
import { innHall } from "./inn-hall";
import { innKitchen } from "./inn-kitchen";
import { innShed } from "./inn-shed";
import { market } from "./market";
import { shiliPo } from "./shili-po";
import { shanShenMiao } from "./shan-shen-miao";
import { auntRoom } from "./aunt-room";
import { islandShore } from "./island-shore";
import { islandRock } from "./island-rock";
import { lotusPond } from "./lotus-pond";
import { peachForest } from "./peach-forest";
import { moonPalaceOut } from "./moon-palace-out";
import { moonPalace } from "./moon-palace";
import { suzhouOutskirts } from "./suzhou-outskirts";
import { suzhouInn } from "./suzhou-inn";
import { suzhouStreet } from "./suzhou-street";
import { linjiaArena } from "./linjia-arena";
import { linjiaHall } from "./linjia-hall";
import { linjiaGarden } from "./linjia-garden";
import { linjiaWestRoom } from "./linjia-west-room";
import { linjiaBackhill } from "./linjia-backhill";
import { yinlongCave } from "./yinlong-cave";
import { yinlongCaveInner } from "./yinlong-cave-inner";
import { yinlongCaveCourtyard } from "./yinlong-cave-courtyard";
import { yinlongCaveHall } from "./yinlong-cave-hall";

export const START_SCENE = "inn-room";

export const SCENES: Record<string, GameScene> = {
  "inn-room": innRoom,
  "inn-corridor": innCorridor,
  "guest-room-1": guestRoom1,
  "guest-room": guestRoom,
  "inn-hall": innHall,
  "inn-kitchen": innKitchen,
  "inn-shed": innShed,
  market,
  "shili-po": shiliPo,
  "shan-shen-miao": shanShenMiao,
  "aunt-room": auntRoom,
  "island-shore": islandShore,
  "island-rock": islandRock,
  "lotus-pond": lotusPond,
  "peach-forest": peachForest,
  "moon-palace-out": moonPalaceOut,
  "moon-palace": moonPalace,
  "suzhou-outskirts": suzhouOutskirts,
  "suzhou-inn": suzhouInn,
  "suzhou-street": suzhouStreet,
  "linjia-arena": linjiaArena,
  "linjia-hall": linjiaHall,
  "linjia-garden": linjiaGarden,
  "linjia-west-room": linjiaWestRoom,
  "linjia-backhill": linjiaBackhill,
  "yinlong-cave": yinlongCave,
  "yinlong-cave-inner": yinlongCaveInner,
  "yinlong-cave-courtyard": yinlongCaveCourtyard,
  "yinlong-cave-hall": yinlongCaveHall,
};
