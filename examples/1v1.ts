import { AIPlayer } from "./AIPlayer";

async function example() {
  const ai = new AIPlayer();
  await ai.loadModel();

  const rawInput = ai.predict(
    {
      position: {
        x: 584.0659502969348,
        y: 50.86391505168348,
      },
      velocity: {
        x: -0.00806184372400526,
        y: -0.005044297349678795,
      },
    },
    [
      {
        position: {
          x: 447.0546802373196,
          y: -45.96243595416426,
        },
        velocity: {
          x: 1.9755417960464823,
          y: -0.5785801687224148,
        },
      },
    ]
  );

  const input = Math.min(Math.max(0, Math.round(rawInput)), 31);

  console.log("Predicted input:", input);
}

example().catch(console.error);
