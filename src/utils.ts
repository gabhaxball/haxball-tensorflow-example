import { z } from "zod";

export const trainingDataSchema = z
  .object({
    tick: z.number(),
    players: z.array(
      z.object({
        id: z.number(),
        team: z.number(),
        input: z.number(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
        velocity: z.object({
          x: z.number(),
          y: z.number(),
        }),
      })
    ),
    ball: z.object({
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      velocity: z.object({
        x: z.number(),
        y: z.number(),
      }),
    }),
  })
  .array();

export const configSchema = z.object({
  playerLength: z.number(),
  minTicksToPrepare: z.number(),
});

export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
  const minLength = Math.min(array1.length, array2.length);
  const result: [T, U][] = [];

  for (let i = 0; i < minLength; i++) {
    result.push([array1[i], array2[i]]);
  }

  return result;
}

export function trainingDataSchemaToArray(
  data: z.infer<typeof trainingDataSchema>
): number[] {
  const result: number[] = [];

  for (const frame of data) {
    result.push(frame.tick);

    result.push(frame.ball.position.x);
    result.push(frame.ball.position.y);
    result.push(frame.ball.velocity.x);
    result.push(frame.ball.velocity.y);

    result.push(frame.players.length);

    for (const player of frame.players) {
      result.push(player.id);
      result.push(player.team);
      result.push(player.input);
      result.push(player.position.x);
      result.push(player.position.y);
      result.push(player.velocity.x);
      result.push(player.velocity.y);
    }
  }

  return result;
}

export function trainingDataArrayToSchema(
  data: number[]
): z.infer<typeof trainingDataSchema> {
  const result: z.infer<typeof trainingDataSchema> = [];
  let i = 0;

  while (i < data.length) {
    const tick = data[i++];
    const ball = {
      position: {
        x: data[i++],
        y: data[i++],
      },
      velocity: {
        x: data[i++],
        y: data[i++],
      },
    };

    const playerCount = data[i++];
    const players = [];

    for (let j = 0; j < playerCount; j++) {
      const player = {
        id: data[i++],
        team: data[i++],
        input: data[i++],
        position: {
          x: data[i++],
          y: data[i++],
        },
        velocity: {
          x: data[i++],
          y: data[i++],
        },
      };

      players.push(player);
    }

    result.push({
      tick,
      ball,
      players,
    });
  }

  return result;
}

export function toBinary(input: z.infer<typeof trainingDataSchema>): Buffer {
  const data = trainingDataSchemaToArray(input);
  const buffer = Buffer.alloc(data.length * 4);

  for (let i = 0; i < data.length; i++) {
    buffer.writeFloatLE(data[i], i * 4);
  }

  return buffer;
}

export function fromBinary(input: Buffer): z.infer<typeof trainingDataSchema> {
  const data = [];

  for (let i = 0; i < input.length; i += 4) {
    data.push(input.readFloatLE(i));
  }

  return trainingDataArrayToSchema(data);
}

export function normalize(data: number[]) {
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

export function addTeams(input: number[], teams: number[]): number[] {
  const inputWithoutHead = input.slice(4);
  const head = input.slice(0, 4);
  const newInput = [];

  for (let i = 0; i < teams.length; i++) {
    newInput.push(...inputWithoutHead.splice(0, 4), teams[i] === 1 ? 1 : 0);
  }

  return head.concat(newInput);
}
