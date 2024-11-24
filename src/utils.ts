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
  .array()
  .array();

export const configSchema = z.object({
  playerLength: z.number(),
});

export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
  const minLength = Math.min(array1.length, array2.length);
  const result: [T, U][] = [];

  for (let i = 0; i < minLength; i++) {
    result.push([array1[i], array2[i]]);
  }

  return result;
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
