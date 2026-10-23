import { describe, expect, it } from "vitest";
import { SNAKE, newSnake, placeFood, steerSnake, stepSnake, type Cell, type Snake } from "./snake";

/** The first empty cell, always. */
const first = () => 0;
/** A game already running, with the given body (head first) and food, heading `heading`. */
function running(body: Cell[], food: Cell | null, heading: Snake["heading"] = "right", cols = 10, rows = 6): Snake {
  return { cols, rows, body, heading, turns: [], food, growing: 0, score: 0, phase: "running" };
}
const run = (game: Snake, ticks: number) => Array.from({ length: ticks }).reduce<Snake>((g) => stepSnake(g, first), game);

describe("Snake", () => {
  it("starts in the middle of the board, 4 long and heading right, waiting for a key", () => {
    const game = newSnake(first);
    expect(game.cols).toBe(48);
    expect(game.rows).toBe(30);
    expect(game.body).toEqual([
      [24, 15],
      [23, 15],
      [22, 15],
      [21, 15],
    ]);
    expect(game.heading).toBe("right");
    expect(game.phase).toBe("ready");
    // The food is never under the snake.
    expect(game.body.some(([c, r]) => c === game.food![0] && r === game.food![1])).toBe(false);
  });

  it("does not move until a key starts it — any of the four, even straight back", () => {
    const game = newSnake(first);
    expect(stepSnake(game, first)).toBe(game);
    const back = steerSnake(game, "left");
    expect(back.phase).toBe("running");
    // Straight back is not a turn: it goes on to the right.
    expect(stepSnake(back, first).body[0]).toEqual([25, 15]);
    expect(steerSnake(game, "up").phase).toBe("running");
  });

  it("moves one cell a tick the way it heads, the tail following", () => {
    const game = run(running([[3, 2], [2, 2], [1, 2]], [9, 5]), 2);
    expect(game.body).toEqual([
      [5, 2],
      [4, 2],
      [3, 2],
    ]);
  });

  it("turns at the next tick, and never straight back into its neck", () => {
    const game = running([[3, 2], [2, 2], [1, 2]], [9, 5]);
    expect(stepSnake(steerSnake(game, "down"), first).body[0]).toEqual([3, 3]);
    expect(stepSnake(steerSnake(game, "left"), first).body[0]).toEqual([4, 2]);
  });

  it("takes two quick turns one a tick (round a corner), and no more than two", () => {
    const game = running([[3, 2], [2, 2], [1, 2]], [9, 5]);
    const turned = steerSnake(steerSnake(game, "down"), "left");
    const once = stepSnake(turned, first);
    expect(once.body[0]).toEqual([3, 3]);
    expect(stepSnake(once, first).body[0]).toEqual([2, 3]);
    // The second turn is judged against the first, not against the heading: up after down is straight back.
    expect(steerSnake(steerSnake(game, "down"), "up").turns).toEqual(["down"]);
    const three = steerSnake(steerSnake(steerSnake(game, "down"), "left"), "up");
    expect(three.turns).toEqual(["down", "left"]);
  });

  it("eats the food it runs into: one longer, one more point, the food somewhere else and not under it", () => {
    const game = stepSnake(running([[3, 2], [2, 2], [1, 2]], [4, 2]), first);
    expect(game.body).toEqual([
      [4, 2],
      [3, 2],
      [2, 2],
      [1, 2],
    ]);
    expect(game.score).toBe(1);
    expect(game.food).toEqual([0, 0]);
    // Growing is once per piece: the next tick it moves on at its new length.
    expect(stepSnake(game, first).body.length).toBe(4);
  });

  it("is over when it runs into the wall", () => {
    const right = run(running([[8, 2], [7, 2]], [0, 5]), 1);
    expect(right.phase).toBe("running");
    expect(stepSnake(right, first).phase).toBe("over");
    expect(stepSnake(running([[0, 2], [1, 2]], [9, 5], "left"), first).phase).toBe("over");
    expect(stepSnake(running([[3, 0], [3, 1]], [9, 5], "up"), first).phase).toBe("over");
    expect(stepSnake(running([[3, 5], [3, 4]], [9, 5], "down", 10, 6), first).phase).toBe("over");
  });

  it("is over when it runs into itself", () => {
    // A ring of 5 turning back on its own side.
    const body: Cell[] = [[2, 2], [3, 2], [3, 3], [2, 3], [1, 3]];
    expect(stepSnake(running(body, [9, 5], "down"), first).phase).toBe("over");
  });

  it("may go into the cell its tail is leaving — but not while it grows (the tail stays then)", () => {
    // A square of four chasing its tail round.
    const body: Cell[] = [[2, 2], [3, 2], [3, 3], [2, 3]];
    const chasing = stepSnake(running(body, [9, 5], "down"), first);
    expect(chasing.phase).toBe("running");
    expect(chasing.body[0]).toEqual([2, 3]);
    expect(stepSnake({ ...running(body, [9, 5], "down"), growing: 1 }, first).phase).toBe("over");
  });

  it("does nothing once it is over", () => {
    const over = stepSnake(running([[0, 2], [1, 2]], [9, 5], "left"), first);
    expect(stepSnake(over, first)).toBe(over);
    expect(steerSnake(over, "up")).toBe(over);
  });

  it("is won when the food has nowhere left to go", () => {
    // A 3 × 1 board: the snake 2 long, eating the last cell.
    const game = stepSnake(running([[1, 0], [0, 0]], [2, 0], "right", 3, 1), first);
    expect(game.phase).toBe("won");
    expect(game.food).toBeNull();
    expect(game.score).toBe(1);
  });

  it("puts the food on an empty cell picked by chance, the whole board open to it", () => {
    const body: Cell[] = [[0, 0], [1, 0]];
    expect(placeFood(body, 3, 2, () => 0)).toEqual([2, 0]);
    expect(placeFood(body, 3, 2, () => 0.999)).toEqual([2, 1]);
    expect(placeFood(body, 3, 2, () => 0.5)).toEqual([1, 1]);
    expect(placeFood([[0, 0]], 1, 1, () => 0)).toBeNull();
  });

  it("goes 8 cells a second", () => {
    expect(1 / SNAKE.tick).toBeGreaterThan(7);
    expect(1 / SNAKE.tick).toBeLessThan(9);
  });
});
