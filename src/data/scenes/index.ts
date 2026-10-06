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
};
