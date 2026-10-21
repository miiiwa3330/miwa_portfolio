"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { cssCameraStyle, cssPanelTransform, panelShown } from "@/scene/camera/cssView";
import { onView, viewNow } from "@/scene/camera/viewChannel";
import type { Panel } from "@/scene/room/screens";

/**
 * A layer of HTML placed in the room — real DOM, so search engines, screen
 * readers and text selection all see it, moved every frame with CSS 3D
 * transforms so it sits exactly on the rectangle WebGL draws for it. The
 * arithmetic, and why it is not drei's `<Html>`, is in `scene/camera/cssView.ts`.
 *
 * Two ways to stack it against the canvas (prototype 2,
 * docs/room-migration.md), chosen by the `className` the caller gives it:
 *
 * - **Behind the canvas**, for an opaque screen. The canvas cuts a hole where
 *   the screen is (`ScreenHole` in `RoomScene`), so the chair or the lamp in
 *   front of it still draws over it.
 * - **In front of the canvas**, for a hologram, which has to let the room
 *   show through and has nothing standing in front of it.
 *
 * Moved from the camera's own frame: the camera publishes its pose
 * (`viewChannel`) first thing every frame, and this writes the styles from
 * that callback, so the HTML and the picture move on the same frame.
 *
 * **No `overflow: hidden` anywhere in here.** Chrome stops hit-testing every
 * element inside a 3D-transformed box that has it — the picture is right,
 * and no click lands (prototype 2). The layer, the camera and the panels are
 * written without it; what goes inside a panel has to be checked the same way.
 */
export function RoomHtmlLayer({ className = "", children }: { className?: string; children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onView(({ pose, width, height }) => {
        const outer = layer.current;
        const inner = camera.current;
        if (!outer || !inner) return;
        // Until the canvas has measured itself there is no frame to place
        // anything in.
        if (width <= 1) return;
        const style = cssCameraStyle(pose, width, height);
        outer.style.width = `${width}px`;
        outer.style.height = `${height}px`;
        outer.style.perspective = style.perspective;
        outer.style.perspectiveOrigin = style.perspectiveOrigin;
        outer.style.visibility = "visible";
        inner.style.width = `${width}px`;
        inner.style.height = `${height}px`;
        inner.style.transform = style.transform;
      }),
    []
  );

  return (
    <div ref={layer} className={`fixed left-0 top-0 pointer-events-none ${className}`} style={{ visibility: "hidden" }}>
      <div ref={camera} className="absolute left-0 top-0" style={{ transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * One rectangle of HTML in the room, laid out at the panel's px size and
 * scaled into its metres. Hidden whenever the camera cannot draw it
 * (`panelShown`): through the fisheye, behind the reader, from behind.
 *
 * `interactive` decides whether it takes the pointer at all. Off, every
 * gesture goes through it to whatever is under it, as if it were paint.
 * `hidden` takes it off the screen whatever the camera can see — the
 * hologram's text, which is only projected while About is focused.
 */
export function RoomPanel({
  panel,
  interactive,
  hidden = false,
  children,
}: {
  panel: Panel;
  interactive: boolean;
  hidden?: boolean;
  children: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const transform = useMemo(() => cssPanelTransform(panel), [panel]);

  // Written after hydration rather than rendered: the matrix is trigonometry
  // on the panel's placement, and the server's last digit need not match the
  // browser's — rendered, the whole style attribute failed to hydrate
  // (React's "attributes didn't match" warning, step 5).
  useEffect(() => {
    if (element.current) element.current.style.transform = transform;
  }, [transform]);

  useEffect(() => {
    const show = (pose: ReturnType<typeof viewNow>["pose"]) => {
      if (element.current) element.current.style.visibility = !hidden && panelShown(panel, pose) ? "visible" : "hidden";
    };
    // Now, for a change of `hidden` with the camera standing still, and then
    // with every move of the camera.
    show(viewNow().pose);
    return onView(({ pose }) => show(pose));
  }, [panel, hidden]);

  return (
    <div
      ref={element}
      className="absolute left-0 top-0"
      style={{
        width: panel.pxWidth,
        height: panel.pxHeight,
        backfaceVisibility: "hidden",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}
