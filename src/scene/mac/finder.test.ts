import { describe, expect, it } from "vitest";
import {
  ICONS,
  MAC_SCREEN_PX,
  MENU_BAR,
  GAME_FIELD,
  GAME_WINDOW,
  closeBox,
  gameCode,
  iconAt,
  isGameKey,
  macAdvance,
  macClose,
  macKey,
  macKeyUp,
  macPoint,
  macPress,
  macStart,
  type MacIcon,
  type MacState,
} from "./finder";
import { SNAKE } from "./snake";
import { BREAKOUT } from "./breakout";
import { MINES } from "./mines";

const first = () => 0;
/** The middle of an icon's picture. */
const on = (icon: MacIcon) => ({ x: ICONS[icon].x + 16, y: ICONS[icon].y + 13 });
/** A double-click on an icon, at `time` ms, sat at the desk or not. */
const doubleClick = (state: MacState, icon: MacIcon, time = 1000, seated = true) =>
  macPress(macPress(state, on(icon), time, seated, first), on(icon), time + 200, seated, first);
const opened = () => doubleClick(macStart(first), "snake");
const middleOf = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

describe("the Mac's desktop", () => {
  it("has its icons where they are drawn, and nothing in between", () => {
    for (const icon of Object.keys(ICONS) as MacIcon[]) expect(iconAt(on(icon))).toBe(icon);
    // Under the label too, which is wider than the picture.
    expect(iconAt({ x: ICONS.breakout.x - 6, y: ICONS.breakout.y + 36 })).toBe("breakout");
    expect(iconAt({ x: 20, y: 300 })).toBeNull();
    expect(iconAt({ x: (ICONS.snake.x + ICONS.breakout.x) / 2 + 16, y: ICONS.snake.y + 13 })).toBeNull();
  });

  it("selects an icon with a press, and lets it go with a press elsewhere", () => {
    const selected = macPress(macStart(first), on("mines"), 1000, true, first);
    expect(selected.selected).toBe("mines");
    expect(selected.open).toBeNull();
    expect(macPress(selected, { x: 20, y: 300 }, 3000, true, first).selected).toBeNull();
  });

  it("opens Snake with a double-click on it", () => {
    const state = opened();
    expect(state.open).toBe("snake");
    expect(state.snake.phase).toBe("ready");
  });

  it("does not open it with two presses too slow, too far apart, or on two icons", () => {
    const start = macStart(first);
    const slow = macPress(macPress(start, on("snake"), 1000, true, first), on("snake"), 1600, true, first);
    expect(slow.open).toBeNull();
    const moved = macPress(macPress(start, on("snake"), 1000, true, first), { x: on("snake").x + 8, y: on("snake").y }, 1200, true, first);
    expect(moved.open).toBeNull();
    const two = macPress(macPress(start, on("breakout"), 1000, true, first), on("snake"), 1200, true, first);
    expect(two.open).toBeNull();
  });

  it("takes a double-click as two presses, not three: a third press soon after is the start of another pair", () => {
    const start = macStart(first);
    // On the disk, which a double-click only selects.
    const unopened = macPress(start, on("disk"), 1000, true, first);
    const pair = macPress(unopened, on("disk"), 1200, true, first);
    expect(pair.lastPress).toBeNull();
    expect(macPress(pair, on("disk"), 1400, true, first).lastPress).not.toBeNull();
  });

  it("opens each game from its own icon, a new game each time, and not the disk", () => {
    expect(doubleClick(macStart(first), "breakout").open).toBe("breakout");
    expect(doubleClick(macStart(first), "mines").open).toBe("mines");
    expect(doubleClick(macStart(first), "disk").open).toBeNull();
    expect(doubleClick(macStart(first), "disk").selected).toBe("disk");
    // A game left over, opened again: a fresh one.
    const left = { ...macStart(first), mines: { ...macStart(first).mines, phase: "over" as const } };
    expect(doubleClick(left, "mines").mines.phase).toBe("ready");
  });

  it("opens a game only for a reader sat at the desk", () => {
    expect(doubleClick(macStart(first), "snake", 1000, false).open).toBeNull();
  });

  it("closes the game with its window's close box, and not with a press elsewhere on the window", () => {
    const state = opened();
    expect(macPress(state, middleOf(closeBox(GAME_WINDOW)), 5000, true, first).open).toBeNull();
    expect(macPress(state, { x: GAME_WINDOW.x + GAME_WINDOW.w / 2, y: GAME_WINDOW.y + 5 }, 5000, true, first).open).toBe("snake");
    expect(macPress(state, middleOf(GAME_FIELD), 5000, true, first).open).toBe("snake");
  });

  it("closes the game with Esc", () => {
    expect(macKey(opened(), "Escape", first).open).toBeNull();
  });

  it("lays the close box in the window's title bar, at its left", () => {
    const box = closeBox(GAME_WINDOW);
    expect(box.y).toBeGreaterThan(GAME_WINDOW.y);
    expect(box.y + box.h).toBeLessThan(GAME_WINDOW.y + 19);
    expect(box.x - GAME_WINDOW.x).toBeLessThan(GAME_WINDOW.w / 10);
  });

  it("fits the game window on the screen, under the menu bar, each game's grid filling its field", () => {
    expect(GAME_WINDOW.y).toBeGreaterThanOrEqual(MENU_BAR);
    expect(GAME_WINDOW.x).toBeGreaterThanOrEqual(0);
    // Its shadow (2 px) too.
    expect(GAME_WINDOW.x + GAME_WINDOW.w + 2).toBeLessThanOrEqual(MAC_SCREEN_PX.width);
    expect(GAME_WINDOW.y + GAME_WINDOW.h + 2).toBeLessThanOrEqual(MAC_SCREEN_PX.height);
    expect(GAME_FIELD.w).toBe(SNAKE.cols * 8);
    expect(GAME_FIELD.h).toBe(SNAKE.rows * 8);
    expect(GAME_FIELD.w).toBe(MINES.cols * MINES.cell);
    expect(GAME_FIELD.h).toBe(MINES.rows * MINES.cell);
    expect([GAME_FIELD.w, GAME_FIELD.h]).toEqual([BREAKOUT.width, BREAKOUT.height]);
    expect(GAME_FIELD.y + GAME_FIELD.h).toBeLessThan(GAME_WINDOW.y + GAME_WINDOW.h);
  });
});

describe("the game's keys", () => {
  it("are W A S D, and the reader's arrows stand for them", () => {
    const heads = (code: string) => macKey(macKey(opened(), "KeyD", first), code, first).snake.turns;
    expect(heads("KeyW")).toEqual(["up"]);
    expect(heads("KeyS")).toEqual(["down"]);
    expect(heads("ArrowUp")).toEqual(["up"]);
    expect(heads("ArrowDown")).toEqual(["down"]);
    const started = macKey(opened(), "KeyW", first);
    const left = macKey(started, "KeyA", first).snake.turns;
    expect(left).toEqual(["up", "left"]);
    expect(macKey(started, "ArrowLeft", first).snake.turns).toEqual(["up", "left"]);
    expect(macKey(macKey(opened(), "ArrowUp", first), "ArrowRight", first).snake.turns).toEqual(["up", "right"]);
  });

  it("press the M0110's W A S D for the arrows, while a game is open, and only then (it has no arrows)", () => {
    expect(gameCode("ArrowUp", true)).toBe("KeyW");
    expect(gameCode("ArrowLeft", true)).toBe("KeyA");
    expect(gameCode("ArrowDown", true)).toBe("KeyS");
    expect(gameCode("ArrowRight", true)).toBe("KeyD");
    expect(gameCode("KeyQ", true)).toBe("KeyQ");
    expect(gameCode("ArrowUp", false)).toBe("ArrowUp");
  });

  it("are the game's while it is open: the arrows, W A S D, Space, Return and Esc, and not the rest", () => {
    for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "Enter", "Escape"]) expect(isGameKey(code)).toBe(true);
    for (const code of ["KeyQ", "Tab", "Digit1", "ShiftLeft"]) expect(isGameKey(code)).toBe(false);
  });

  it("do nothing on the desktop", () => {
    const start = macStart(first);
    expect(macKey(start, "KeyW", first)).toBe(start);
    expect(macKey(start, "Escape", first)).toBe(start);
  });

  it("start another game with Space or Return once one is over, and not while it runs", () => {
    const running = macKey(opened(), "KeyW", first);
    expect(macKey(running, "Space", first).snake).toBe(running.snake);
    // Up from the middle: 16 ticks to the wall.
    let dead = running;
    for (let i = 0; i < 40 && dead.snake.phase === "running"; i++) dead = macAdvance(dead, 0.12, first);
    expect(dead.snake.phase).toBe("over");
    for (const code of ["Space", "Enter"]) {
      const again = macKey(dead, code, first);
      expect(again.snake.phase).toBe("ready");
      expect(again.snake.score).toBe(0);
    }
    // A press on the board does too.
    expect(macPress(dead, middleOf(GAME_FIELD), 9000, true, first).snake.phase).toBe("ready");
  });
});

describe("a game's clock", () => {
  it("ticks once a tick while the game runs, and not while it waits for a key", () => {
    const ready = opened();
    expect(macAdvance(ready, 1, first)).toBe(ready);
    const running = macKey(ready, "KeyD", first);
    const head = running.snake.body[0];
    expect(macAdvance(running, 0.1, first).snake.body[0]).toEqual(head);
    const once = macAdvance(running, 0.13, first);
    expect(once.snake.body[0]).toEqual([head[0] + 1, head[1]]);
    // The part of a tick left over carries to the next.
    expect(macAdvance(macAdvance(running, 0.07, first), 0.07, first).snake.body[0]).toEqual([head[0] + 1, head[1]]);
  });

  it("starts from the key: the first move is a whole tick after it, however long the game waited", () => {
    const ready = { ...opened(), since: 0.11 };
    const running = macKey(ready, "KeyD", first);
    expect(macAdvance(running, 0.05, first).snake.body[0]).toEqual(running.snake.body[0]);
  });

  it("takes at most a quarter second at once: back from another tab, the snake does not race into the wall", () => {
    const running = macKey(opened(), "KeyD", first);
    const after = macAdvance(running, 10, first);
    expect(after.snake.phase).toBe("running");
    expect(after.snake.body[0][0] - running.snake.body[0][0]).toBe(2);
  });

  it("keeps the best score as the game goes, across games", () => {
    const state: MacState = { ...macKey(opened(), "KeyD", first), best: { snake: 0, breakout: 0, mines: null } };
    const food: [number, number] = [state.snake.body[0][0] + 1, state.snake.body[0][1]];
    const ate = macAdvance({ ...state, snake: { ...state.snake, food } }, 0.13, first);
    expect(ate.snake.score).toBe(1);
    expect(ate.best.snake).toBe(1);
    expect(macKey({ ...ate, snake: { ...ate.snake, phase: "over" } }, "Space", first).best.snake).toBe(1);
  });

  it("does not run with the game closed", () => {
    const closed = macKey(macKey(opened(), "KeyD", first), "Escape", first);
    expect(macAdvance(closed, 1, first)).toBe(closed);
  });
});

describe("Breakout on the Mac", () => {
  const breakout = () => doubleClick(macStart(first), "breakout");
  const field = (x: number, y: number) => ({ x: GAME_FIELD.x + x, y: GAME_FIELD.y + y });

  it("serves the ball with a press on the field, or Space", () => {
    expect(macPress(breakout(), field(100, 100), 5000, true, first).breakout.phase).toBe("running");
    expect(macKey(breakout(), "Space", first).breakout.phase).toBe("running");
    // Snake's keys do nothing to it.
    const state = breakout();
    expect(macKey(state, "KeyW", first).breakout).toBe(state.breakout);
  });

  it("puts the paddle under the cursor, while the cursor is over the field across", () => {
    expect(macPoint(breakout(), field(80, 300)).breakout.paddle).toBe(80);
    const off = breakout();
    expect(macPoint(off, { x: GAME_FIELD.x - 5, y: 100 })).toBe(off);
    // Not while another game is open.
    const snake = opened();
    expect(macPoint(snake, field(80, 100))).toBe(snake);
  });

  it("slides the paddle while A or D (or an arrow) is held, and stops when it is let go — or both are held", () => {
    const left = macKey(breakout(), "KeyA", first);
    expect(left.breakout.steer).toBe(-1);
    expect(macKey(breakout(), "ArrowRight", first).breakout.steer).toBe(1);
    const both = macKey(left, "KeyD", first);
    expect(both.breakout.steer).toBe(0);
    expect(macKeyUp(both, "KeyA").breakout.steer).toBe(1);
    expect(macKeyUp(left, "KeyA").breakout.steer).toBe(0);
    const moved = macAdvance(left, 0.25, first);
    expect(moved.breakout.paddle).toBeLessThan(192);
  });

  it("keeps the best score, and makes the game's sounds", () => {
    const serving = macKey(breakout(), "Space", first);
    // Straight at a brick of the bottom row.
    const flying = { ...serving, breakout: { ...serving.breakout, ball: [100, 100] as const, velocity: [0, -200] as const } };
    const hit = macAdvance(flying, 0.1, first);
    expect(hit.breakout.score).toBe(1);
    expect(hit.best.breakout).toBe(1);
    expect(hit.sounds).toContain("brick");
  });
});

/** A seeded chance (a small linear congruential generator): mines strewn over the board, the same each run. */
function seeded(seed = 7): () => number {
  let x = seed;
  return () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

describe("Mines on the Mac", () => {
  const mines = () => doubleClick(macStart(first), "mines");
  /** A press on the middle of a cell. */
  const cell = (c: number, r: number) => ({ x: GAME_FIELD.x + c * 16 + 8, y: GAME_FIELD.y + r * 16 + 8 });

  it("opens the cell pressed, and starts the clock", () => {
    const state = macPress(mines(), cell(5, 3), 5000, true, seeded());
    expect(state.mines.open[3 * 24 + 5]).toBe(true);
    expect(state.mines.phase).toBe("running");
    expect(state.sounds).toEqual(["open"]);
    expect(macAdvance(state, 0.25, first).since).toBeCloseTo(0.25, 9);
  });

  it("flags the cell instead while ⌘ or Option is held", () => {
    const state = macPress(mines(), cell(5, 3), 5000, true, first, true);
    expect(state.mines.flags[3 * 24 + 5]).toBe(true);
    expect(state.mines.open[3 * 24 + 5]).toBe(false);
    expect(state.sounds).toEqual(["flag"]);
  });

  it("counts the seconds from the first cell, however long the board waited", () => {
    const waited = { ...mines(), since: 30 };
    const state = macPress(waited, cell(5, 3), 5000, true, seeded());
    let clock = state;
    for (let i = 0; i < 6; i++) clock = macAdvance(clock, 0.25, first);
    expect(clock.mines.seconds).toBe(1);
  });

  it("keeps the quickest board cleared", () => {
    const state = mines();
    const nearly = { ...state, mines: { ...state.mines, cols: 3, rows: 1, count: 1, mines: [false, false, true], open: [false, false, false], flags: [false, false, false], phase: "running" as const, seconds: 12 } };
    const won = macPress({ ...nearly, best: { ...nearly.best, mines: 20 } }, cell(0, 0), 5000, true, first);
    expect(won.mines.phase).toBe("won");
    expect(won.best.mines).toBe(12);
    expect(won.sounds).toEqual(["win"]);
    expect(macPress({ ...nearly, best: { ...nearly.best, mines: 8 } }, cell(0, 0), 5000, true, first).best.mines).toBe(8);
  });

  it("starts a new board with a press or Space once one is over", () => {
    const state = mines();
    const over = { ...state, mines: { ...state.mines, phase: "over" as const } };
    expect(macPress(over, cell(1, 1), 5000, true, first).mines.phase).toBe("ready");
    expect(macKey(over, "Space", first).mines.phase).toBe("ready");
  });
});

describe("the games' sounds", () => {
  it("are a bite when the snake eats, and the end when it dies", () => {
    const state = macKey(opened(), "KeyD", first);
    const food: [number, number] = [state.snake.body[0][0] + 1, state.snake.body[0][1]];
    expect(macAdvance({ ...state, snake: { ...state.snake, food } }, 0.13, first).sounds).toEqual(["eat"]);
    const atWall = { ...state, snake: { ...state.snake, body: [[47, 3], [46, 3]] as [number, number][] } };
    expect(macAdvance(atWall, 0.13, first).sounds).toEqual(["over"]);
  });

  it("are made once: a change that makes none carries no sound over from the last", () => {
    const state = macKey(opened(), "KeyD", first);
    const food: [number, number] = [state.snake.body[0][0] + 1, state.snake.body[0][1]];
    const ate = macAdvance({ ...state, snake: { ...state.snake, food } }, 0.13, first);
    expect(macAdvance(ate, 0.05, first).sounds).toEqual([]);
    expect(macKey(ate, "KeyW", first).sounds).toEqual([]);
    expect(macClose(ate).sounds).toEqual([]);
  });
});
