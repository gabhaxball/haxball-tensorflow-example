import NodeHaxball from "node-haxball";
import { AIPlayer } from "./AIPlayer";

const { Utils, Room } = NodeHaxball();

type NodeHaxball = ReturnType<typeof NodeHaxball>;
type Room = ReturnType<NodeHaxball["Room"]["join"]>["room"];

Utils.generateAuth().then(([authKey, authObj]) => {
  Room.join(
    {
      id: "CkFviTC4f6c",
      authObj,
    },
    {
      // @ts-expect-error
      storage: {
        player_name: "AI Player",
        avatar: "👽",
        player_auth_key: authKey,
      },
      plugins: [],
      onSuccess: roomCallbacks,
      onFailure: (error) => {
        console.log("Unable to join room...", error.toString());
      },
      onLeave: (msg) => {
        console.log("Bot has left the room:", msg.toString());
      },
    }
  );
});

async function roomCallbacks(room: Room) {
  const ai = new AIPlayer();
  await ai.loadModel();

  if (!room) {
    return;
  }

  room.sendChat("Hello, I am an AI player!", null);

  room.onGameTick = () => {
    if (!room.currentPlayer.disc) {
      return;
    }

    const ball = room.gameState?.physicsState.discs[0];

    if (!ball) {
      return;
    }

    const players = room.players
      .filter((player) => player.disc)
      .filter((player) => player.id !== room.currentPlayerId)
      .map((player) => ({
        position: player.disc!.pos,
        velocity: player.disc!.pos,
        team: player.team.id,
      }));

    try {
      const input = ai.predict(
        {
          position: ball.pos,
          velocity: ball.speed,
        },
        {
          position: room.currentPlayer.disc.pos,
          velocity: room.currentPlayer.disc.speed,
          team: room.currentPlayer.team.id,
        },
        players
      );

      room.setKeyState(input);
    } catch (error) {}
  };
}
