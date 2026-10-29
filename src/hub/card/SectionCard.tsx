"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import { useCardGestures } from "./useCardGestures";
import { useStepGate } from "./useStepGate";
import { initialWheelState, stepForWheel, wheelPixels } from "./cardWheel";
import { MARKER_TRAIL_INK } from "@/scene/markerBolt";
import { useFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";
import { CARD_COPY } from "./cardCopy";

/**
 * The contextual card over the diorama, drawn as a stack.
 *
 * The card describes whichever area is in front, so there is always a next one
 * behind it — the stack is what says so, and what makes stepping through them
 * an obvious thing to try. The two layers behind carry no text: only a
 * fingernail's width of each is ever visible, and giving them real content
 * would tie their height to copy nobody can read.
 *
 * Which area it shows is not decided here. It reads `section` and asks for a
 * step; the camera turns, and the area it ends up facing comes back down as a
 * new `section`. Card and camera never write to each other — see
 * `facingStop` in `scene/room/layout.ts` for why that direction matters.
 */

/**
 * Simple slide & fade transition between cards without card-deck tilt/stacking.
 */
const CARD_VARIANTS: Variants = {
  enter: (step: number) => ({
    opacity: 0,
    y: step < 0 ? 24 : -24,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 28,
    },
  },
  exit: (step: number) => ({
    opacity: 0,
    y: step < 0 ? -24 : 24,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  }),
};

type Props = {
  /**
   * The area the camera has been sent to, or null in the free orbit — where the
   * card follows whatever is in front instead.
   */
  focusedSection: SectionType;
  isJa: boolean;
  /** The dot the leader line leaves from; measured, never restated. */
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  onOpen: () => void;
  /** -1 is the next spot round the island, matching the swipe convention. */
  onStep: (step: number) => void;
};

/**
 * The desk is on the tour but has no card (docs/room-migration.md): while it is
 * in front, there is nothing here at all. Split from the card's own body so
 * that the hooks below always run for an area — leaving early half way through
 * them is not something a component can do.
 */
export default function SectionCard(props: Props) {
  // Subscribed here rather than handed down from `Hub`. The stop in front
  // changes several times a lap, and `Hub` sits above the `<Canvas>` — a
  // re-render there re-renders the entire three.js tree (see `facingChannel`).
  // This is the one place the answer is displayed, so this is the one place
  // that has any reason to re-render for it.
  const facing = useFacing();
  const section = props.focusedSection ?? facing;
  if (section === "desk") return null;
  return <SectionCardBody {...props} section={section} />;
}

function SectionCardBody({
  section,
  focusedSection,
  isJa,
  anchorRef,
  onOpen,
  onStep,
}: Props & { section: NonNullable<SectionType> }) {
  /** True once an area is focused, which retires the trail and its anchor. */
  const focused = !!focusedSection;
  const card = CARD_COPY[section];

  // Stepping is browsing, and browsing is over once an area is focused: the
  // camera is parked on that building and the orbit is locked out, so a step
  // would swap the card for one describing somewhere the view is not. The
  // stack loses its layers in the same breath, so it stops offering.
  const browsable = !focused;

  // The wait-for-arrival gate, shared with the handheld rail.
  const { takeStep, lastStep } = useStepGate({ section, browsable, onStep });

  const gestures = useCardGestures({ onTap: onOpen, onSwipe: takeStep });

  // The wheel is bound by hand rather than through React's `onWheel`, which is
  // registered passively at the root: preventDefault there is ignored, and the
  // page would rubber-band behind the card. Stopping propagation is the other
  // half — the scene listens for wheels on `window` to orbit the diorama, and
  // without this the same gesture would both step the card and spin the town.
  const stackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = stackRef.current;
    if (!element) return;

    let wheel = initialWheelState();
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // `deltaY` is in whatever unit `deltaMode` names, and the threshold is
      // in pixels. A gesture the gate turns away is still spent, on purpose:
      // keeping its travel banked would mean the moment the gate opened, a
      // momentum tail nobody is driving any more would buy the next card.
      const travel = wheelPixels(event.deltaY, event.deltaMode);
      const result = stepForWheel(wheel, travel, event.timeStamp);
      wheel = result.state;
      if (result.step !== 0) takeStep(result.step);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [takeStep]);

  return (
    <div
      ref={stackRef}
      {...gestures}
      className="relative w-full max-w-xs sm:max-w-sm cursor-pointer select-none touch-none pointer-events-auto"
    >
      {/* Where the trail leaves the card, and the trail's near end. */}
      {!focused && (
        <span
          ref={anchorRef}
          aria-hidden="true"
          style={{
            opacity: 0,
            transition: "opacity 240ms ease",
            backgroundColor: MARKER_TRAIL_INK,
          }}
          className="absolute top-5 right-5 z-20 w-[9px] h-[9px] rounded-full"
        />
      )}

      <AnimatePresence mode="popLayout" initial={false} custom={lastStep}>
        <motion.div
          key={section}
          custom={lastStep}
          variants={CARD_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          className="group relative z-10 bg-white/85 backdrop-blur-md rounded-none p-6 sm:p-7 border border-black/20 shadow-none hover:border-black transition-colors"
        >
          {/* Hovering the card displays corner brackets ("「」") cleanly inside */}
          <CornerBrackets size="md" offset="card" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-100 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-none">
              {card.sub}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight mb-2">
            {isJa ? card.jaTitle : card.enTitle}
          </h3>

          <p className="text-neutral-600 text-sm leading-relaxed mb-6 font-normal">
            {isJa ? card.ja : card.en}
          </p>

          <button
            onClick={onOpen}
            className="group/btn relative inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-mono font-bold py-2.5 px-5 rounded-none border border-black transition-all text-xs uppercase"
          >
            <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            <span>{isJa ? "詳しく見る" : "More"}</span>
            <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
