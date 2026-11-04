/**
 * What the reader says to themselves when they try to get up from the desk
 * while they are kept in the chair (`SEAT_LOCKED`): an engineer at the end of
 * their tether (2026-11-04, the user: 「もう少し頑張ろう」とか「この作業までやろう」
 * みたいな限界エンジニアの一言). Any of them, at random (the user: 「全てランダムで」).
 */
export const STAND_LINES: readonly { ja: string; en: string }[] = [
  { ja: "もう少し頑張ろう。", en: "Just a little longer." },
  { ja: "このコミットまでやろう。", en: "Let me finish this commit first." },
  { ja: "このテストが通ったら休もう。", en: "I'll take a break when this test passes." },
  { ja: "あと1件だけ直そう。", en: "Just one more fix." },
  { ja: "キリのいいところまで……キリってどこだっけ。", en: "Until a good stopping point… where was that again?" },
  { ja: "今立ったら、この流れを忘れる。", en: "If I stand up now, I'll lose the thread." },
  { ja: "頭に全部入ってるうちに書き切ろう。", en: "Better write it down while it's all in my head." },
  { ja: "休憩はビルドを待つあいだにしよう。", en: "I'll rest while the build runs." },
  { ja: "椅子が「まだだ」と言っている。", en: "The chair says not yet." },
  { ja: "寝たら負け。", en: "Sleep is for the deployed." },
  { ja: "コーヒーはまだ残ってる。", en: "There's still coffee left." },
  { ja: "明日の自分には任せられない。", en: "Can't trust tomorrow's me with this." },
  { ja: "立つ体力は、コードを書くのに使おう。", en: "Save the energy for the code." },
  { ja: "ここで止めたら、明日の自分が泣く。", en: "Stop now and tomorrow's me will cry." },
  { ja: "git push するまでが作業です。", en: "It's not done until it's pushed." },
  { ja: "まだ console.log を消してない。", en: "I haven't removed the console.logs yet." },
  { ja: "このバグ、さっきまで再現してたのに。", en: "This bug was reproducing a minute ago." },
  { ja: "「動いた」は「直った」じゃない。", en: "\"It works\" isn't \"it's fixed\"." },
  { ja: "TODO が1つ増えた。座り直そう。", en: "One more TODO. Sitting back down." },
  { ja: "……本当に行く？", en: "…Are you really leaving?" },
  { ja: "この部屋、まだ作りかけなんだ。", en: "This room's still under construction." },
  { ja: "外はまだ実装されてない。", en: "The outside hasn't been implemented yet." },
];

/**
 * Which line to say next: any at random, but never the one just said — two
 * tries in a row that got the same answer would read as nothing happening.
 * `random` is `Math.random`'s shape, passed in so the choice can be tested.
 */
export function pickStandLine(previous: number | null, random: () => number = Math.random, count = STAND_LINES.length): number {
  if (previous === null || count < 2) return Math.floor(random() * count);
  // Draw from the other count − 1 and step over the previous one.
  const drawn = Math.floor(random() * (count - 1));
  return drawn >= previous ? drawn + 1 : drawn;
}
