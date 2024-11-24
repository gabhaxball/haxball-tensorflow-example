import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-node";
import { addTeams, zip } from "../src/utils";

export class AIPlayer {
  private model: tf.LayersModel | null = null;

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel("file://./data/output/model.json");
      console.log("Model loaded successfully");
    } catch (error) {
      console.error("Error loading model:", error);
      throw error;
    }
  }

  private normalize(data: number[]) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    return data.map((value) => (max === min ? 0 : (value - min) / (max - min)));
  }

  predict(
    ball: {
      position: { x: number; y: number };
      velocity: { x: number; y: number };
    },
    currentPlayer: {
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      team: number;
    },
    otherPlayers: Array<{
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      team: number;
    }>
  ) {
    if (!this.model) {
      throw new Error("Model not loaded. Call loadModel() first.");
    }

    const teams = [
      currentPlayer.team,
      ...otherPlayers.map((player) => player.team),
    ];

    // Format input in the same way as training data
    const input = addTeams(
      [
        ball.position.x,
        ball.velocity.x,
        ball.position.y,
        ball.velocity.y,
        ...zip(
          [
            currentPlayer.position.x,
            currentPlayer.position.y,
            ...otherPlayers.flatMap((player) => [
              player.position.x,
              player.position.y,
            ]),
          ],
          [
            currentPlayer.velocity.x,
            currentPlayer.velocity.y,
            ...otherPlayers.flatMap((player) => [
              player.velocity.x,
              player.velocity.y,
            ]),
          ]
        ).flat(),
      ],
      teams
    );

    // Normalize input
    const normalizedInput = this.normalize(input);

    // Make prediction
    const inputTensor = tf.tensor2d([normalizedInput]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const result = prediction.dataSync()[0];

    // Cleanup tensors to prevent memory leaks
    inputTensor.dispose();
    prediction.dispose();

    const normalizedResult = Math.min(Math.max(0, Math.round(result)), 31);

    return normalizedResult;
  }
}
