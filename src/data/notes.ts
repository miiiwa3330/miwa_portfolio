import type { NoteSource } from "./noteModel";

/**
 * The notes. The prose of each is `src/content/notes/<slug>.mdx`;
 * `notes.test.ts` checks the two sets match.
 *
 * Listed newest first by `date`; entries sharing a date keep the order they
 * are written in here, so that order is what the index shows for them.
 */
export const NOTES: NoteSource[] = [
  {
    slug: "adsense-low-value-content",
    title: "AdSense に「有用性の低いコンテンツ」で落ちた",
    titleEn: "Rejected by AdSense for 'Low Value Content'",
    description:
      "3D の惑星が主役のサイトは、審査する側からは「文字がほとんど見えない、2ページだけのサイト」に見えていた。測った数字と、見えない文章を増やさずに直した方法。",
    descriptionEn:
      "To an automated reviewer, a 3D-planet portfolio looked like a two-page site with almost no visible text. Here are the numbers I measured and how I fixed it without stuffing hidden text.",
    date: "2026-09-19",
    tags: ["AdSense", "Next.js", "SEO"],
    tagsEn: ["AdSense", "Next.js", "SEO"],
    products: [],
  },
  {
    slug: "phone-is-another-scene",
    title: "スマホは PC の縮小版ではなかった",
    titleEn: "A Phone Is Not a Shrunken Desktop",
    description:
      "PC の画面を縮めただけだったスマホ版を作り直した記録。スマホの判定を1か所に決め、PC の数字を書き換えず、2本指の操作を両方の経路で成り立たせるまで。",
    descriptionEn:
      "Rebuilding the mobile view from scratch instead of shrinking the desktop scene: unifying handheld detection in one place, keeping desktop constants untouched, and making two-finger gestures work across both input paths.",
    date: "2026-09-12",
    tags: ["スマホ", "ジェスチャ", "React Three Fiber"],
    tagsEn: ["Mobile", "Gestures", "React Three Fiber"],
    products: ["portfolio-v1"],
  },
  {
    slug: "headless-webgl-pitfalls",
    title: "ヘッドレス Chrome で 3D を撮る罠",
    titleEn: "Pitfalls of Capturing 3D WebGL in Headless Chrome",
    description:
      "WebGL の画面を自動で撮って確かめる仕組みが、何度も間違った結論を出しかけた。毎秒3フレーム、4秒かかるタップ、いつも左上を撃つイベントなど。",
    descriptionEn:
      "How automated WebGL screenshot verification nearly led me to wrong conclusions again and again: 3 fps software rendering, 4-second taps, and synthetic pointer events that always hit the top-left corner.",
    date: "2026-09-12",
    tags: ["テスト", "Puppeteer", "WebGL"],
    tagsEn: ["Testing", "Puppeteer", "WebGL"],
    products: ["portfolio-v1"],
  },
  {
    slug: "drag-the-sun",
    title: "太陽をつかんで動かせるようにした",
    titleEn: "Making the Sun Draggable Across the Sky",
    description:
      "固定の光では惑星の全部を照らせないと分かり、カメラを光源にする案を作って測って捨て、読む人が太陽を動かす形にたどり着いた。追従率41%から100%への話も。",
    descriptionEn:
      "A fixed light couldn't illuminate a whole planet. After building, measuring, and discarding a camera-mounted light, I let the reader drag the sun directly — and raised drag tracking from 41% to 100%.",
    date: "2026-08-26",
    tags: ["Three.js", "ライティング", "計測"],
    tagsEn: ["Three.js", "Lighting", "Measurement"],
    products: ["portfolio-v1"],
  },
  {
    slug: "trackpad-inertia",
    title: "トラックパッドの慣性に、2回目のスワイプを飲まれていた",
    titleEn: "Trackpad Inertia Was Swallowing the Second Swipe",
    description:
      "カードのスクロールが「効いたり効かなかったり」する原因は、慣性スクロールの尾が次のスワイプを飲み込んでいたことだった。感度を上げずに直した方法。",
    descriptionEn:
      "Why card scrolling felt flaky on macOS trackpads: the tail of inertial scrolling was swallowing the next swipe. Here is how I fixed it by detecting momentum decay instead of cranking up sensitivity.",
    date: "2026-08-03",
    tags: ["UI", "スクロール", "ジェスチャ"],
    tagsEn: ["UI", "Scroll", "Gestures"],
    products: ["portfolio-v1"],
  },
  {
    slug: "starwars-crawl",
    title: "スター・ウォーズ風の自己紹介を、マス目に並べる",
    titleEn: "Aligning a Star Wars Opening Crawl into a Strict Character Grid",
    description:
      "奥へ流れる自己紹介の文字を、映画のフレームと同じく1行きっちり同じ文字数にそろえた。禁則なし・両端そろえ・全角化と、ファイルに存在しない空白の話。",
    descriptionEn:
      "Formatting a receding 3D self-introduction into an exact characters-per-line grid like the film title crawl — full-width punctuation, justified lines, and phantom spaces that weren't in the source file.",
    date: "2026-08-03",
    tags: ["CSS", "文字組み", "3D変形"],
    tagsEn: ["CSS", "Typography", "3D Transform"],
    products: ["portfolio-v1"],
  },
  {
    slug: "mirrored-signboard",
    title: "看板が鏡文字になった日",
    titleEn: "The Day the Signboards Turned into Mirror Writing",
    description:
      "球体の惑星で、建物に寄ると看板が左右反転していた。原因はカメラの「上」の向き。最初の診断が間違っていたことと、テストがバグを守っていたことの記録。",
    descriptionEn:
      "Zooming into a building on the spherical planet flipped its signboard horizontally. The culprit was the camera's up-vector — a story of a wrong first diagnosis and a unit test that was guarding the bug.",
    date: "2026-08-02",
    tags: ["Three.js", "カメラ", "テスト"],
    tagsEn: ["Three.js", "Camera", "Testing"],
    products: ["portfolio-v1"],
  },
  {
    slug: "flat-island-to-planet",
    title: "平らな島を捨てて、惑星にした",
    titleEn: "Throwing Away the Flat Island to Build a Planet",
    description:
      "空に浮かぶ平らな島だったトップページを、宇宙に浮かぶ球体に作り替えた。参考写真を測って数字を2つ否定され、雑居ビルを290棟で止めるまでの記録。",
    descriptionEn:
      "Replacing a floating flat island with a spherical voxel planet in space: measuring reference photos, having two assumptions disproved by numbers, and stopping the procedural city at 290 buildings.",
    date: "2026-07-31",
    tags: ["Three.js", "ボクセル", "設計"],
    tagsEn: ["Three.js", "Voxel", "Architecture"],
    products: ["portfolio-v1"],
  },
];
