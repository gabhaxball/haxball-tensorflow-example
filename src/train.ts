import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import "@tensorflow/tfjs-node";
import { trainingDataSchema, configSchema, zip, addTeams } from "./utils";

const rawData = fs.readFileSync("./data/trainingData.json", "utf-8");
const rawConfigs = fs.readFileSync("./configs.json", "utf-8");

const matchesData = trainingDataSchema.parse(JSON.parse(rawData));
const configs = configSchema.parse(JSON.parse(rawConfigs));

const trainingDataRaw = matchesData.flat();

const trainingData = trainingDataRaw.filter(
  (data) => data.players.length === configs.playerLength
);

function normalize(data: number[]) {
  if (!Array.isArray(data) || data.some(isNaN)) {
    throw new Error("Input must be an array of numbers");
  }

  const min = Math.min(...data);
  const max = Math.max(...data);

  if (min === max) {
    return data.map(() => 0.5);
  }

  return data.map((value) => (value - min) / (max - min));
}

const data = trainingData.flatMap((data) => {
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
});

const inputs = data.map((d) => d.input);
const outputs = data.map((d) => d.output);

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
