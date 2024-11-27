import NodeHaxball from "node-haxball";

const { Replay } = NodeHaxball();

import fs from "fs";
import { z } from "zod";
import { configSchema, toBinary, trainingDataSchema } from "./utils";

const rawConfigs = fs.readFileSync("./configs.json", "utf-8");
const configs = configSchema.parse(JSON.parse(rawConfigs));
const fileNames = fs.readdirSync("./data/recs");
const outputFilePath = "./data/trainingData.bin";

const data = fileNames.map((fileName) => {
  return new Promise<z.infer<typeof trainingDataSchema>>((resolve) => {
    const data: z.infer<typeof trainingDataSchema> = [];
    const file = fs.readFileSync("./data/recs/" + fileName);

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

if (fs.existsSync(outputFilePath)) {
  fs.unlinkSync(outputFilePath);
}

const outputStream = fs.createWriteStream(outputFilePath, { flags: "w" });
let i = 0;

for (const d of data) {
  try {
    i++;

    const inputData = (await d).filter(
      (data) => data.players.length === configs.playerLength
    );

    if (inputData.length === 0) {
      console.log("Empty, skipping");
      continue;
    }

    if (
      inputData.sort((a, b) => b.tick - a.tick)[0].tick <
      configs.minTicksToPrepare
    ) {
      console.log("Not enough ticks, skipping");
      continue;
    }

    const buffer = toBinary(inputData);

    if (buffer.length === 0) {
      console.log("Empty buffer, skipping");
      continue;
    }

    const size = Buffer.alloc(4);
    size.writeUint32LE(buffer.length);

    outputStream.write(size);
    outputStream.write(buffer);

    console.log(
      `Wrote ${i} of ${data.length} (${((i / data.length) * 100).toFixed(2)}%)`
    );
  } catch (e) {
    console.error(e);
  }
}

outputStream.end();
