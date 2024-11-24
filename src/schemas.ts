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
