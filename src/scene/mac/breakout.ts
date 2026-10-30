/**
 * Breakout, the Macintosh's second game (2026-10-25): a ball bounced off a
 * paddle at the bottom of the field into rows of bricks at the top, each
 * brick gone when the ball hits it. Pure: in the field's own px (its top
 * left the origin, y down), the ball and the paddle moved by the time that
 * passes (`stepBreakout`), the paddle also put where the Mac's cursor is
 * (`aimPaddle`). Drawn by `objects/macScreen.ts`, driven by `finder.ts`.
 *
 * - **The paddle follows the M0100** (the cursor's left and right) or the
 *   keys held (A and D, the reader's arrows standing for them).
 * - **The ball waits on the paddle** (`ready`) until a click or Space sends
 *   it up, at an angle the caller's chance picks (`rng`), so it does not go
 *   straight up and down.
 * - **Where the ball meets the paddle steers it**: straight up from the
 *   middle, up to `BREAKOUT.steer` from the vertical at the ends — the
 *   player aims with the paddle, as in the arcade game.
 * - **The ball moves in steps of at most 2 px** (a brick is 10 px tall): a
 *   whole frame at once could pass through a brick. Each step moves across,
 *   then down, and bounces off whatever it then overlaps on that axis.
 * - A missed ball costs a life; with none left the game is over. With no
 *   bricks left, it is won.
 */

export type BreakoutPhase = "ready" | "running" | "over" | "won";
export type BreakoutSound = "wall" | "paddle" | "brick" | "miss" | "over" | "win";

export type Breakout = {
  /** The paddle's middle, across (px). */
  readonly paddle: number;
  /** The ball's top left (px), and its velocity (px a second). */
  readonly ball: readonly [number, number];
  readonly velocity: readonly [number, number];
  /** Whether each brick is still there, row by row from the top. */
  readonly bricks: readonly boolean[];
  /** The keys held: −1 left, +1 right, 0 neither (or both). */
  readonly steer: -1 | 0 | 1;
  readonly lives: number;
  readonly score: number;
  readonly phase: BreakoutPhase;
};

/**
 * The field is the game window's, 384 × 240 px. Six rows of twelve bricks,
 * 32 × 10, the first row 28 px down; points by row from the top, as the
 * arcade game's (7, 7, 4, 4, 1, 1). The paddle 48 × 6, its top 16 px over
 * the bottom; the ball 6 px square. **仮**: the speeds, the steer and the
 * sizes.
 */
export const BREAKOUT = {
  width: 384,
  height: 240,
  cols: 12,
  rows: 6,
  brick: { w: 32, h: 10, top: 28 },
  points: [7, 7, 4, 4, 1, 1],
  paddle: { w: 48, h: 6, y: 240 - 16, speed: 320 },
  ball: 6,
  speed: 200,
  /** The steepest a launch goes from the vertical, and the least (radians). */
  launch: { least: (15 * Math.PI) / 180, most: (40 * Math.PI) / 180 },
  /** The most the paddle's end turns the ball from the vertical (radians). */
  steer: (60 * Math.PI) / 180,
  lives: 3,
  /** The longest a step of the ball goes (px). */
  substep: 2,
} as const;

const B = BREAKOUT;
const half = B.paddle.w / 2;

/** The paddle's middle, kept on the field. */
export function clampPaddle(x: number): number {
  return Math.min(B.width - half, Math.max(half, x));
}

/** The ball sitting on the paddle's middle, waiting. */
function onPaddle(paddle: number): [number, number] {
  return [paddle - B.ball / 2, B.paddle.y - B.ball];
}

/** A brick's box (px) by its index. */
export function brickBox(i: number): { x: number; y: number; w: number; h: number } {
  const row = Math.floor(i / B.cols);
  const col = i % B.cols;
  return { x: col * B.brick.w, y: B.brick.top + row * B.brick.h, w: B.brick.w, h: B.brick.h };
}

export function newBreakout(): Breakout {
  const paddle = B.width / 2;
  return { paddle, ball: onPaddle(paddle), velocity: [0, 0], bricks: Array(B.cols * B.rows).fill(true), steer: 0, lives: B.lives, score: 0, phase: "ready" };
}

/** The paddle put under the cursor (its place across the field, px). The waiting ball goes with it. */
export function aimPaddle(game: Breakout, x: number): Breakout {
  if (game.phase === "over" || game.phase === "won") return game;
  const paddle = clampPaddle(x);
  if (paddle === game.paddle) return game;
  return { ...game, paddle, ball: game.phase === "ready" ? onPaddle(paddle) : game.ball };
}

/** The keys held: which way the paddle slides. */
export function steerPaddle(game: Breakout, steer: -1 | 0 | 1): Breakout {
  return steer === game.steer ? game : { ...game, steer };
}

/** Send the waiting ball up, to the left or the right of the vertical by the caller's chance. */
export function launchBall(game: Breakout, rng: () => number): Breakout {
  if (game.phase !== "ready") return game;
  const r = rng();
  const side = r < 0.5 ? -1 : 1;
  const angle = B.launch.least + (B.launch.most - B.launch.least) * ((r < 0.5 ? r : r - 0.5) * 2);
  return { ...game, phase: "running", velocity: [side * B.speed * Math.sin(angle), -B.speed * Math.cos(angle)] };
}

const overlaps = (ax: number, ay: number, a: number, b: { x: number; y: number; w: number; h: number }) =>
  ax < b.x + b.w && ax + a > b.x && ay < b.y + b.h && ay + a > b.y;

/** The brick the ball (top left `x`, `y`) overlaps, or −1. */
function brickAt(bricks: readonly boolean[], x: number, y: number): number {
  for (let i = 0; i < bricks.length; i++) if (bricks[i] && overlaps(x, y, B.ball, brickBox(i))) return i;
  return -1;
}

/** `dt` seconds pass: the paddle slides with the keys, the ball flies and bounces. With the sounds it made. */
export function stepBreakout(game: Breakout, dt: number): { game: Breakout; sounds: BreakoutSound[] } {
  const sounds: BreakoutSound[] = [];
  if (game.phase === "over" || game.phase === "won") return { game, sounds };
  const paddle = clampPaddle(game.paddle + game.steer * B.paddle.speed * dt);
  if (game.phase === "ready") return { game: paddle === game.paddle ? game : { ...game, paddle, ball: onPaddle(paddle) }, sounds };

  let [x, y] = game.ball;
  let [vx, vy] = game.velocity;
  const bricks = [...game.bricks];
  let score = game.score;
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(vx), Math.abs(vy)) * dt) / B.substep));
  const h = dt / steps;
  const pad = { x: paddle - half, y: B.paddle.y, w: B.paddle.w, h: B.paddle.h };
  for (let s = 0; s < steps; s++) {
    // Across, then down: a bounce on each axis from what the ball then overlaps.
    x += vx * h;
    if (x < 0 || x + B.ball > B.width) {
      x = x < 0 ? -x : 2 * (B.width - B.ball) - x;
      vx = -vx;
      sounds.push("wall");
    }
    const across = brickAt(bricks, x, y);
    if (across >= 0) {
      bricks[across] = false;
      score += B.points[Math.floor(across / B.cols)];
      x -= vx * h;
      vx = -vx;
      sounds.push("brick");
    }
    y += vy * h;
    if (y < 0) {
      y = -y;
      vy = -vy;
      sounds.push("wall");
    }
    const down = brickAt(bricks, x, y);
    if (down >= 0) {
      bricks[down] = false;
      score += B.points[Math.floor(down / B.cols)];
      y -= vy * h;
      vy = -vy;
      sounds.push("brick");
    }
    if (vy > 0 && overlaps(x, y, B.ball, pad)) {
      // Off the paddle at an angle by where it met it: the middle straight up, the ends `steer` over.
      const off = Math.max(-1, Math.min(1, (x + B.ball / 2 - paddle) / half));
      const speed = Math.hypot(vx, vy);
      vx = speed * Math.sin(off * B.steer);
      vy = -speed * Math.cos(off * B.steer);
      y = pad.y - B.ball;
      sounds.push("paddle");
    }
    if (!bricks.includes(true)) {
      sounds.push("win");
      return { game: { ...game, paddle, ball: [x, y], velocity: [0, 0], bricks, score, phase: "won" }, sounds };
    }
    if (y > B.height) {
      const lives = game.lives - 1;
      sounds.push(lives > 0 ? "miss" : "over");
      return { game: { ...game, paddle, ball: onPaddle(paddle), velocity: [0, 0], bricks, score, lives, phase: lives > 0 ? "ready" : "over" }, sounds };
    }
  }
  return { game: { ...game, paddle, ball: [x, y], velocity: [vx, vy], bricks, score }, sounds };
}
