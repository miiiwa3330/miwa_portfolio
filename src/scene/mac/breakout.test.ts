import { describe, expect, it } from "vitest";
import { BREAKOUT, aimPaddle, brickBox, launchBall, newBreakout, steerPaddle, stepBreakout, type Breakout } from "./breakout";

const DEG = Math.PI / 180;
/** A game in flight: the ball at (x, y) going (vx, vy), the given bricks left (all by default). */
function flying(x: number, y: number, vx: number, vy: number, patch: Partial<Breakout> = {}): Breakout {
  return { ...newBreakout(), ball: [x, y], velocity: [vx, vy], phase: "running", ...patch };
}
const none = () => Array(BREAKOUT.cols * BREAKOUT.rows).fill(false) as boolean[];
/** One brick left, at the top left, out of the way (with none left the game is won). */
const far = () => none().map((_, j) => j === 0);
/** Only the brick `i` left. */
const only = (i: number) => none().map((_, j) => j === i);

describe("Breakout", () => {
  it("starts with six rows of twelve bricks, three balls, and the ball waiting on the paddle's middle", () => {
    const game = newBreakout();
    expect(game.bricks.length).toBe(72);
    expect(game.bricks.every(Boolean)).toBe(true);
    expect(game.lives).toBe(3);
    expect(game.phase).toBe("ready");
    expect(game.paddle).toBe(192);
    expect(game.ball[0] + BREAKOUT.ball / 2).toBe(game.paddle);
    expect(game.ball[1] + BREAKOUT.ball).toBe(BREAKOUT.paddle.y);
  });

  it("lays the bricks across the whole field, the top row 28 px down", () => {
    expect(brickBox(0)).toEqual({ x: 0, y: 28, w: 32, h: 10 });
    const last = brickBox(71);
    expect(last.x + last.w).toBe(384);
    expect(last.y).toBe(28 + 5 * 10);
  });

  it("puts the paddle under the cursor, kept on the field, the waiting ball going with it", () => {
    const game = aimPaddle(newBreakout(), 100);
    expect(game.paddle).toBe(100);
    expect(game.ball[0] + BREAKOUT.ball / 2).toBe(100);
    expect(aimPaddle(newBreakout(), -50).paddle).toBe(24);
    expect(aimPaddle(newBreakout(), 999).paddle).toBe(384 - 24);
    // A ball in flight does not.
    const away = aimPaddle(flying(50, 100, 0, -200), 300);
    expect(away.ball).toEqual([50, 100]);
  });

  it("slides the paddle 320 px a second while a key is held, kept on the field", () => {
    const left = stepBreakout(steerPaddle(newBreakout(), -1), 0.25).game;
    expect(left.paddle).toBeCloseTo(192 - 80, 6);
    expect(left.ball[0] + BREAKOUT.ball / 2).toBeCloseTo(left.paddle, 6);
    expect(stepBreakout(steerPaddle(aimPaddle(newBreakout(), 370), 1), 0.25).game.paddle).toBe(360);
  });

  it("serves the ball up, to the left or right of the vertical by chance — never straight up", () => {
    for (const r of [0, 0.25, 0.49, 0.5, 0.75, 0.999]) {
      const game = launchBall(newBreakout(), () => r);
      const [vx, vy] = game.velocity;
      expect(game.phase).toBe("running");
      expect(vy).toBeLessThan(0);
      expect(Math.hypot(vx, vy)).toBeCloseTo(200, 6);
      const angle = Math.atan2(Math.abs(vx), -vy) / DEG;
      expect(angle).toBeGreaterThanOrEqual(15 - 1e-6);
      expect(angle).toBeLessThanOrEqual(40 + 1e-6);
      expect(Math.sign(vx)).toBe(r < 0.5 ? -1 : 1);
    }
    const running = flying(10, 10, 100, -100);
    expect(launchBall(running, () => 0)).toBe(running);
  });

  it("bounces off the side walls and the top, with a sound", () => {
    const right = stepBreakout(flying(376, 150, 200, -10, { bricks: far() }), 0.05);
    expect(right.game.velocity[0]).toBeLessThan(0);
    expect(right.game.ball[0] + BREAKOUT.ball).toBeLessThanOrEqual(384);
    expect(right.sounds).toContain("wall");
    const left = stepBreakout(flying(2, 150, -200, -10, { bricks: far() }), 0.05);
    expect(left.game.velocity[0]).toBeGreaterThan(0);
    expect(left.game.ball[0]).toBeGreaterThanOrEqual(0);
    const top = stepBreakout(flying(100, 2, 10, -200, { bricks: far() }), 0.05);
    expect(top.game.velocity[1]).toBeGreaterThan(0);
    expect(top.game.ball[1]).toBeGreaterThanOrEqual(0);
  });

  it("knocks out a brick it runs into, bounces back off it, and scores by its row: 7 at the top, 1 at the bottom", () => {
    // Under the bottom row's first brick, going up.
    const bottom = 5 * 12;
    const box = brickBox(bottom);
    const hit = stepBreakout(flying(box.x + 10, box.y + box.h + 1, 0, -200, { bricks: only(bottom).map((b, i) => b || i === 0) }), 0.05);
    expect(hit.game.bricks[bottom]).toBe(false);
    expect(hit.game.bricks[0]).toBe(true);
    expect(hit.game.velocity[1]).toBeGreaterThan(0);
    expect(hit.game.score).toBe(1);
    expect(hit.sounds).toContain("brick");
    const topBox = brickBox(0);
    const top = stepBreakout(flying(topBox.x + 10, topBox.y + topBox.h + 1, 0, -200, { bricks: only(0).map((b, i) => b || i === 71) }), 0.05);
    expect(top.game.score).toBe(7);
  });

  it("knocks out a brick from the side, turning back across", () => {
    const box = brickBox(3 * 12 + 5);
    const side = stepBreakout(flying(box.x - BREAKOUT.ball - 1, box.y + 2, 200, 0, { bricks: only(3 * 12 + 5).map((b, i) => b || i === 0) }), 0.05);
    expect(side.game.bricks[3 * 12 + 5]).toBe(false);
    expect(side.game.velocity[0]).toBeLessThan(0);
  });

  it("does not pass through a brick in a long frame", () => {
    const box = brickBox(5 * 12 + 6);
    // 50 px in one step of time, the brick 10 px tall in the way.
    const fast = stepBreakout(flying(box.x + 10, box.y + box.h + 20, 0, -200, { bricks: only(5 * 12 + 6).map((b, i) => b || i === 0) }), 0.25);
    expect(fast.game.bricks[5 * 12 + 6]).toBe(false);
  });

  it("sends the ball off the paddle by where it met it: straight up from the middle, 60° over at the ends", () => {
    const y = BREAKOUT.paddle.y - BREAKOUT.ball - 1;
    const middle = stepBreakout(flying(192 - 3, y, 0, 200), 0.02).game;
    expect(middle.velocity[0]).toBeCloseTo(0, 6);
    expect(middle.velocity[1]).toBeLessThan(0);
    const end = stepBreakout(flying(192 + 24 - 3, y, 0, 200), 0.02).game;
    expect(Math.atan2(end.velocity[0], -end.velocity[1]) / DEG).toBeCloseTo(60, 3);
    const otherEnd = stepBreakout(flying(192 - 24 - 3, y, 0, 200), 0.02).game;
    expect(Math.atan2(otherEnd.velocity[0], -otherEnd.velocity[1]) / DEG).toBeCloseTo(-60, 3);
    expect(Math.hypot(...end.velocity)).toBeCloseTo(200, 6);
    expect(stepBreakout(flying(192 - 3, y, 0, 200), 0.02).sounds).toContain("paddle");
  });

  it("does not catch a ball going up past the paddle", () => {
    // Neither turned nor lifted onto the paddle: it goes on as it went.
    const up = stepBreakout(flying(192 + 10, BREAKOUT.paddle.y + 1, 50, -200), 0.01).game;
    expect(up.velocity).toEqual([50, -200]);
    expect(up.ball[1]).toBeCloseTo(BREAKOUT.paddle.y + 1 - 2, 6);
  });

  it("costs a ball when it falls past the paddle, and waits on the paddle again; the last one ends the game", () => {
    const miss = stepBreakout(flying(10, 238, 0, 200), 0.05);
    expect(miss.game.lives).toBe(2);
    expect(miss.game.phase).toBe("ready");
    expect(miss.game.ball[1] + BREAKOUT.ball).toBe(BREAKOUT.paddle.y);
    expect(miss.sounds).toEqual(["miss"]);
    const last = stepBreakout(flying(10, 238, 0, 200, { lives: 1 }), 0.05);
    expect(last.game.phase).toBe("over");
    expect(last.sounds).toEqual(["over"]);
    expect(stepBreakout(last.game, 1).game).toBe(last.game);
  });

  it("is won when the last brick is knocked out", () => {
    const box = brickBox(30);
    const won = stepBreakout(flying(box.x + 10, box.y + box.h + 1, 0, -200, { bricks: only(30) }), 0.05);
    expect(won.game.phase).toBe("won");
    expect(won.sounds).toContain("win");
  });
});
