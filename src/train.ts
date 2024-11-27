import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import "@tensorflow/tfjs-node";
import {
  addTeams,
  fromBinary,
  normalize,
  trainingDataSchema,
  zip,
} from "./utils";
import { z } from "zod";
import { setFlagsFromString } from "v8";
import { runInNewContext } from "vm";

setFlagsFromString("--expose_gc");

const gc = runInNewContext("gc");

const filePath = "./data/trainingData.bin";
const sizeFile = fs.statSync(filePath).size;

const processBinaryChunks = (
  filePath: string,
  onData: (buf: Buffer) => void,
  onEnd: () => void,
  onError: (err: any) => void
) => {
  let buffer = Buffer.alloc(0);

  const stream = fs.createReadStream(filePath);

  stream.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk as Buffer]);

    while (buffer.length >= 4) {
      const messageSize = buffer.readUInt32LE(0);

      if (buffer.length >= 4 + messageSize) {
        const message = buffer.slice(4, 4 + messageSize);
        buffer = buffer.slice(4 + messageSize);
        onData(message);
      } else {
        break;
      }
    }
  });

  stream.on("end", () => {
    if (buffer.length > 0) {
      console.warn("Unprocessed data remaining in buffer:", buffer);
    }
    onEnd();
  });

  stream.on("error", onError);
};

function processChunk(data: z.infer<typeof trainingDataSchema>[number]) {
  return data.players.map((currentPlayer, playerIndex) => {
    const otherPlayers = [
      ...data.players.slice(0, playerIndex),
      ...data.players.slice(playerIndex + 1),
    ];

    const positions = normalize([
      data.ball.position.x,
      data.ball.position.y,
      currentPlayer.position.x,
      currentPlayer.position.y,
      ...otherPlayers.flatMap((player) => [
        player.position.x,
        player.position.y,
      ]),
    ]);

    const velocities = normalize([
      data.ball.velocity.x,
      data.ball.velocity.y,
      currentPlayer.velocity.x,
      currentPlayer.velocity.y,
      ...otherPlayers.flatMap((player) => [
        player.velocity.x,
        player.velocity.y,
      ]),
    ]);

    const teams = [
      currentPlayer.team,
      ...otherPlayers.map((player) => player.team),
    ];

    const input = addTeams(zip(positions, velocities).flat(), teams);
    const output = [currentPlayer.input];

    return { input, output };
  });
}

let sizeSum = 0;

const inputs: number[][] = [];
const outputs: number[][] = [];

processBinaryChunks(
  filePath,
  (message) => {
    sizeSum += message.length;

    console.log(
      `Processing binary message: ${message.length} bytes (${(
        (sizeSum / sizeFile) *
        100
      ).toFixed(2)}%)`
    );

    const data = fromBinary(message);

    data.forEach((d) => {
      const processedData = processChunk(d);

      inputs.push(...processedData.map((d) => d.input));
      outputs.push(...processedData.map((d) => d.output));
    });

    gc();
  },
  async () => {
    console.log(inputs.length, outputs.length);
    console.log("Creating model...");

    // Create and configure the model
    const model = tf.sequential();

    model.add(
      tf.layers.dense({
        inputShape: [inputs[0].length],
        units: 64,
        activation: "relu",
      })
    );

    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(),
      loss: "meanSquaredError",
    });

    // Convert to tensors and train
    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(outputs);

    await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(
              4
            )}, val_loss = ${logs?.val_loss.toFixed(4)}`
          );
        },
      },
    });

    await model.save("file://./data/output");
    console.log("Finished processing binary file.");
  },
  (err) => {
    console.error("Error reading binary file:", err);
  }
);
