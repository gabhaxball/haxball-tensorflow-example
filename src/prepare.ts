import NodeHaxball from "node-haxball";

const { Replay } = NodeHaxball();

import fs from "fs";
import { z } from "zod";
import { trainingDataSchema } from "./schemas";

const fileNames = fs.readdirSync("./data/recs");
const files = fileNames.map((fileName) =>
  fs.readFileSync("./data/recs/" + fileName)
);

const data = files.map((file) => {
  return new Promise((resolve) => {
    const data: z.infer<typeof trainingDataSchema>[number] = [];

    const replayReader = Replay.read(
      file,
      {
        onGameTick: () => {
          const playerData = replayReader.state.players
            .filter((player) => player.team.id !== 0 && player.disc)
            .map((player) => {
              return {
                id: player.id,
                team: player.team.id,
                input: player.input,
                position: player.disc!.pos,
                velocity: player.disc!.speed,
              };
            });

          const ball = replayReader.gameState?.physicsState.discs[0];

          if (!ball) {
            return;
          }

          const ballData = {
            position: ball?.pos,
            velocity: ball?.speed,
          };

          if (!ballData.position || !ballData.velocity) {
            return;
          }

          data.push({
            tick: replayReader.getCurrentFrameNo(),
            players: playerData,
            ball: ballData,
          });
        },
      },
      {}
    );

    replayReader.onEnd = () => {
      replayReader.destroy();
      resolve(data);

      return {};
    };

    replayReader.setSpeed(Infinity);
  });
});

Promise.all(data)
  .then((data) => {
    fs.writeFileSync("./data/trainingData.json", JSON.stringify(data, null, 2));
    process.exit(0);
  })
  .catch((err) => console.error(err));
