import { AIPlayer } from "./AIPlayer";

async function example() {
  const ai = new AIPlayer();
  await ai.loadModel();

  const rawInput = ai.predict(
    {
      position: {
        x: -431.33419636303904,
        y: -20.854437725769696,
      },
      velocity: {
        x: 0.7370421721824291,
        y: 0.26680657048122086,
      },
    },
    [
      {
        position: {
          x: -868.7659102562507,
          y: -14.369935741117217,
        },
        velocity: {
          x: -1.7996982951295888,
          y: -0.12987473732603494,
        },
      },
      {
        position: {
          x: 224.06600271169543,
          y: 84.332377569921,
        },
        velocity: {
          x: 0.8917849352646419,
          y: -0.2881502710165808,
        },
      },
      {
        position: {
          x: -63.88198122724213,
          y: -77.00549557248122,
        },
        velocity: {
          x: -0.47608700164142276,
          y: -0.034892275611693224,
        },
      },
      {
        position: {
          x: 307.9267056896014,
          y: -212.81111599713577,
        },
        velocity: {
          x: -0.24037156788622713,
          y: 0.6971307994385778,
        },
      },
      {
        position: {
          x: -728.2648379399075,
          y: -283.65997243322863,
        },
        velocity: {
          x: -2.557015738025173,
          y: -3.9486622011873638,
        },
      },
    ]
  );

  const input = Math.min(Math.max(0, Math.round(rawInput)), 31);

  console.log("Predicted input:", input);
}

example().catch(console.error);
