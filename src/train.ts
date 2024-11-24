import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import "@tensorflow/tfjs-node";
import { trainingDataSchema, configSchema } from "./schemas";

const rawData = fs.readFileSync("./data/trainingData.json", "utf-8");
const rawConfigs = fs.readFileSync("./configs.json", "utf-8");

const matchesData = trainingDataSchema.parse(JSON.parse(rawData));
const configs = configSchema.parse(JSON.parse(rawConfigs));

// Flatten all matches into a single array of game states
const trainingDataRaw = matchesData.flat();

// Filter to ensure consistent number of players across all game states
const trainingData = trainingDataRaw.filter(
  (data) => data.players.length === configs.playerLength
);

const normalize = (data: number[]) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  return data.map((value) => (max === min ? 0 : (value - min) / (max - min)));
};

const data = trainingData.flatMap((data) => {
  return data.players.map((currentPlayer, playerIndex) => {
    // Get all players except the current one
    const otherPlayers = [
      ...data.players.slice(0, playerIndex),
      ...data.players.slice(playerIndex + 1),
    ];

    // Create input features
    const input = [
      data.ball.position.x,
      data.ball.position.y,
      data.ball.velocity.x,
      data.ball.velocity.y,
      ...otherPlayers.flatMap((player) => [
        player.position.x,
        player.position.y,
        player.velocity.x,
        player.velocity.y,
      ]),
    ];

    // Create output (the current player's input)
    const output = [currentPlayer.input];

    return { input, output };
  });
});

const inputs = data.map((d) => d.input).map(normalize);
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
