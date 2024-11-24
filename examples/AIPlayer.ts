import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-node";

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
    otherPlayers: Array<{
      position: { x: number; y: number };
      velocity: { x: number; y: number };
    }>
  ) {
    if (!this.model) {
      throw new Error("Model not loaded. Call loadModel() first.");
    }

    // Format input in the same way as training data
    const input = [
      ball.position.x,
      ball.position.y,
      ball.velocity.x,
      ball.velocity.y,
      ...otherPlayers.flatMap((player) => [
        player.position.x,
        player.position.y,
        player.velocity.x,
        player.velocity.y,
      ]),
    ];

    // Normalize input
    const normalizedInput = this.normalize(input);

    // Make prediction
    const inputTensor = tf.tensor2d([normalizedInput]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const result = prediction.dataSync()[0];

    // Cleanup tensors to prevent memory leaks
    inputTensor.dispose();
    prediction.dispose();

    return result;
  }
}
