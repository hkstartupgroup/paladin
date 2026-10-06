import { Game } from "./engine/game";
import { SCENES } from "./data/scenes";
import { closeInput } from "./ui/input";

const args = process.argv.slice(2);
const startSceneId = args.find(
  (a) => !a.startsWith("-") && !a.includes("/") && !a.endsWith(".ts"),
);
const testMode =
  args.includes("--test") ||
  process.env.PALADIN_TEST === "1" ||
  process.env.PALADIN_TEST === "true";

if (startSceneId && !(startSceneId in SCENES)) {
  console.error(`未知場景：${startSceneId}`);
  console.error(`可用場景：${Object.keys(SCENES).join("、")}`);
  process.exit(1);
}

const game = new Game({ testMode, startSceneId });
game
  .start()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeInput());
