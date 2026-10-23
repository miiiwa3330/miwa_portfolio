import { describe, expect, it } from "vitest";
import {
  ICONS,
  MAC_SCREEN_PX,
  MENU_BAR,
  SNAKE_BOARD,
  SNAKE_WINDOW,
  closeBox,
  gameCode,
  iconAt,
  isGameKey,
  macAdvance,
  macKey,
  macPress,
  macStart,
  type MacIcon,
  type MacState,
} from "./finder";
import { SNAKE } from "./snake";

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
    const unopened = macPress(start, on("breakout"), 1000, true, first);
    const pair = macPress(unopened, on("breakout"), 1200, true, first);
    expect(pair.lastPress).toBeNull();
    expect(macPress(pair, on("breakout"), 1400, true, first).lastPress).not.toBeNull();
  });

  it("opens only Snake so far: Breakout and Mines are only selected", () => {
    expect(doubleClick(macStart(first), "breakout").open).toBeNull();
    expect(doubleClick(macStart(first), "mines").open).toBeNull();
    expect(doubleClick(macStart(first), "mines").selected).toBe("mines");
  });

  it("opens a game only for a reader sat at the desk", () => {
    expect(doubleClick(macStart(first), "snake", 1000, false).open).toBeNull();
  });

  it("closes the game with its window's close box, and not with a press elsewhere on the window", () => {
    const state = opened();
    expect(macPress(state, middleOf(closeBox(SNAKE_WINDOW)), 5000, true, first).open).toBeNull();
    expect(macPress(state, { x: SNAKE_WINDOW.x + SNAKE_WINDOW.w / 2, y: SNAKE_WINDOW.y + 5 }, 5000, true, first).open).toBe("snake");
    expect(macPress(state, middleOf(SNAKE_BOARD), 5000, true, first).open).toBe("snake");
  });

  it("closes the game with Esc", () => {
    expect(macKey(opened(), "Escape", first).open).toBeNull();
  });

  it("lays the close box in the window's title bar, at its left", () => {
    const box = closeBox(SNAKE_WINDOW);
    expect(box.y).toBeGreaterThan(SNAKE_WINDOW.y);
    expect(box.y + box.h).toBeLessThan(SNAKE_WINDOW.y + 19);
    expect(box.x - SNAKE_WINDOW.x).toBeLessThan(SNAKE_WINDOW.w / 10);
  });

  it("fits the Snake window on the screen, under the menu bar, the board a cell a grid square", () => {
    expect(SNAKE_WINDOW.y).toBeGreaterThanOrEqual(MENU_BAR);
    expect(SNAKE_WINDOW.x).toBeGreaterThanOrEqual(0);
    // Its shadow (2 px) too.
    expect(SNAKE_WINDOW.x + SNAKE_WINDOW.w + 2).toBeLessThanOrEqual(MAC_SCREEN_PX.width);
    expect(SNAKE_WINDOW.y + SNAKE_WINDOW.h + 2).toBeLessThanOrEqual(MAC_SCREEN_PX.height);
    expect(SNAKE_BOARD.w).toBe(SNAKE.cols * 8);
    expect(SNAKE_BOARD.h).toBe(SNAKE.rows * 8);
    expect(SNAKE_BOARD.y + SNAKE_BOARD.h).toBeLessThan(SNAKE_WINDOW.y + SNAKE_WINDOW.h);
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
    expect(macPress(dead, middleOf(SNAKE_BOARD), 9000, true, first).snake.phase).toBe("ready");
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
    const state: MacState = { ...macKey(opened(), "KeyD", first), best: 0 };
    const food: [number, number] = [state.snake.body[0][0] + 1, state.snake.body[0][1]];
    const ate = macAdvance({ ...state, snake: { ...state.snake, food } }, 0.13, first);
    expect(ate.snake.score).toBe(1);
    expect(ate.best).toBe(1);
    expect(macKey({ ...ate, snake: { ...ate.snake, phase: "over" } }, "Space", first).best).toBe(1);
  });

  it("does not run with the game closed", () => {
    const closed = macKey(macKey(opened(), "KeyD", first), "Escape", first);
    expect(macAdvance(closed, 1, first)).toBe(closed);
  });
});
