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
    slug: "imadoko-carto-watermark-and-realtime-rls",
    title: "タイルサーバーが HTTP 200 を返しているのに、地図が全面「API KEY REQUIRED」になっていた",
    titleEn: "The Tile Server Returned HTTP 200, Yet the Entire Map Said 'API KEY REQUIRED'",
    description:
      "ステータスコード200のまま約2KBの透かし入りPNGを返していたCARTOタイルから国土地理院の淡色地図へ切り替えた記録と、15分削除の約束を守るためのSupabase Realtime設計。",
    descriptionEn:
      "Switching from CARTO tiles—which quietly returned 2 KB watermarked PNGs with HTTP 200—to GSI pale maps, and designing Supabase Realtime access control without breaking the 15-minute deletion promise.",
    date: "2026-10-25",
    tags: ["Leaflet", "Supabase", "セキュリティ"],
    tagsEn: ["Leaflet", "Supabase", "Security"],
    products: ["imadoko"],
  },
  {
    slug: "loo100-logarithmic-scatter-timeline",
    title: "数百件と数千万件が並ぶグラフを、1画面の対数タイムラインに収めるまで",
    titleEn: "Fitting Hundred-Record and Ten-Million-Record Breaches into a Single Log-Scale Timeline",
    description:
      "一覧ページを廃して1画面の散布図タイムラインに振り切り、スクロールでの時間移動・ピンチでの時間単位ズーム・表示範囲に応じた対数縦軸の滑らかな伸縮を実装するまで。",
    descriptionEn:
      "Replacing a standard article list with a full-screen scatter timeline: scrolling through time, pinching down to hourly resolution, and smoothly rescaling a logarithmic vertical axis to fit the visible window.",
    date: "2026-10-21",
    tags: ["データ可視化", "UI", "Astro"],
    tagsEn: ["Data Visualization", "UI", "Astro"],
    products: ["loo100"],
  },
  {
    slug: "loo100-why-we-dropped-full-ai-automation",
    title: "情報漏洩の記事をAIで全自動公開しようとして、1日でやめた理由",
    titleEn: "Why I Abandoned Full AI Auto-Publishing for Data Breach Articles After One Day",
    description:
      "収集から公開までを全自動化する設計が「推測や二次情報を載せない」原則と衝突。公式PDFやJS描画ページから一次情報を抽出し、人が確認して公開する半自動フローへ転換した記録。",
    descriptionEn:
      "A fully automated collection-to-publishing pipeline clashed with our strict primary-source rule. Here is how I pivoted in one day to extracting official PDFs and JS-rendered releases for human-verified publishing.",
    date: "2026-10-20",
    tags: ["設計", "AI", "スクレイピング"],
    tagsEn: ["Architecture", "AI", "Scraping"],
    products: ["loo100"],
  },
  {
    slug: "meltalk-custom-imap-smtp-mime",
    title: "Gmail API の審査が重すぎて、React Native 上で IMAP / SMTP / MIME を自前で書いた",
    titleEn: "Gmail API Review Was Too Heavy, So I Wrote IMAP, SMTP, and MIME from Scratch in React Native",
    description:
      "Gmailの制限付きスコープ審査と年次セキュリティ評価の壁に直面し、iCloudメールのIMAP対応へ転換。TCPソケット上でMIME解析器やSTARTTLSの二重受信防止を実装した記録。",
    descriptionEn:
      "Facing Google's restricted scope verification and annual security assessments, I pivoted to iCloud IMAP—writing a custom MIME parser, SMTP/IMAP client, and STARTTLS listener handoff over raw TCP sockets.",
    date: "2026-10-16",
    tags: ["React Native", "IMAP", "プロトコル"],
    tagsEn: ["React Native", "IMAP", "Protocols"],
    products: ["meltalk"],
  },
  {
    slug: "meltalk-rule-based-email-parsing",
    title: "メールの挨拶と署名をルールベースで消そうとして、初見メール5件中3件で失敗した話",
    titleEn: "Trying to Strip Email Greetings and Signatures with Rules—and Failing on 3 of 5 Unseen Emails",
    description:
      "ルール作成時の12件では全勝だった解析器が、初見サンプルでは箇条書きを署名と誤認して本文を消してしまった実験記録。「迷ったら残す」安全策と初見テスト運用を決めるまで。",
    descriptionEn:
      "A parser that scored 12/12 on training emails failed on 3 of 5 holdout samples, mistaking bullet points for a signature and deleting the body. How asymmetric error costs led to a 'keep when in doubt' safety net.",
    date: "2026-10-15",
    tags: ["テキスト解析", "テスト", "TypeScript"],
    tagsEn: ["Text Parsing", "Testing", "TypeScript"],
    products: ["meltalk"],
  },
  {
    slug: "bukka-now-45deg-stripe-histogram",
    title: "回答と正解と平均が重なった棒を、グラデーションではなく45度ストライプにした",
    titleEn: "Using 45-Degree Stripes Instead of Gradients When Answer, Truth, and Median Collide",
    description:
      "横棒グラフに背景枠を敷くと進捗ゲージに見えてしまう罠を外し、複数の属性が同じ価格帯に入ったときの色の濁りを45度ハードエッジストライプで解決したUIの試行錯誤。",
    descriptionEn:
      "Removing background tracks so horizontal histogram bars wouldn't look like progress gauges, and replacing muddy gradients with hard-edged 45-degree stripes when multiple markers land in the same price bin.",
    date: "2026-10-12",
    tags: ["UI", "CSS", "データ可視化"],
    tagsEn: ["UI", "CSS", "Data Visualization"],
    products: ["bukka-now"],
  },
  {
    slug: "bukka-now-tenkey-and-histogram",
    title: "4択クイズとレーダーチャートを捨てて、電卓のテンキーにした",
    titleEn: "Throwing Away Multiple-Choice and Radar Charts for a Calculator Ten-Key",
    description:
      "4択・スライダー・偏差値・レーダーチャートで作った初期版を全廃し、「10秒制限のテンキー直打ち」と「10分割の回答分布ヒストグラム」だけに削ぎ落とした引き算の設計記録。",
    descriptionEn:
      "Scrapping an early build full of four-choice buttons, sliders, deviation scores, and radar charts in favor of a 10-second calculator keypad and a 10-bin distribution histogram.",
    date: "2026-10-11",
    tags: ["UI", "設計", "React"],
    tagsEn: ["UI", "Design", "React"],
    products: ["bukka-now"],
  },
  {
    slug: "css3d-overflow-hidden-hit-test-zero",
    title: "CSS3Dで傾けたHTMLに overflow: hidden を付けたら、Chromeの当たり判定が0点になった",
    titleEn: "Adding overflow: hidden to CSS3D-Tilted HTML Dropped Chrome's Hit-Testing to Zero",
    description:
      "3D空間のモニターに置いたHTMLにクリックが届かない原因を、elementFromPointの格子計測で特定した記録。背景穴あけ合成と樽型魚眼レンズの立体射影もあわせて解説。",
    descriptionEn:
      "Debugging why clicks stopped reaching HTML monitors in 3D space by probing a grid of elementFromPoint calls—plus punch-through occlusion masking and stereographic fisheye projection.",
    date: "2026-10-02",
    tags: ["Three.js", "CSS", "デバッグ"],
    tagsEn: ["Three.js", "CSS", "Debugging"],
    products: [],
  },
  {
    slug: "plavo-haptics-when-not-to-vibrate",
    title: "「鳴らさない場所」を先に決める——植物と話すARアプリのハプティクス設計",
    titleEn: "Deciding Where Not to Vibrate First: Haptics Design for a Plant-Talking AR App",
    description:
      "騒がしい展示会場で音を使わずに状態を伝えるため、触覚を「機械の操作」と「植物の気配」の2層に分離。エラーの三連振動を禁じ、株の削除に0.9秒の減衰を鳴らすまでの設計。",
    descriptionEn:
      "Separating haptics into mechanical UI feedback and living plant presence for a noisy exhibition floor: banning error triple-buzzes and designing a 0.9-second fading vibration for parting with a plant.",
    date: "2026-09-24",
    tags: ["iOS", "Core Haptics", "UX"],
    tagsEn: ["iOS", "Core Haptics", "UX"],
    products: ["plavo"],
  },
  {
    slug: "plavo-ar-speech-bubble-physics",
    title: "ARの吹き出しが「板に貼った字幕」に見えないためにやった5つのこと",
    titleEn: "Five Things I Did So AR Speech Bubbles Wouldn't Look Like Flat Subtitles",
    description:
      "ARKitの映像にすりガラスが効かない制約を3本の反射光で越え、1€フィルタによる手ぶれ除去、バネアニメの撤去、見かけの株サイズに比例する拡縮で空間に吹き出しを定着させた記録。",
    descriptionEn:
      "Overcoming ARKit's blur limitations with three rim highlights, stabilizing jitter via a 1€ filter, removing spring animations on projected points, and scaling bubbles by apparent plant size.",
    date: "2026-09-20",
    tags: ["ARKit", "SwiftUI", "アルゴリズム"],
    tagsEn: ["ARKit", "SwiftUI", "Algorithms"],
    products: ["plavo"],
  },
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
    slug: "michaw-disguise-and-seo-puzzle",
    title: "「動体視力テスト」という嘘の入口を守りながら、SEOとAdSense審査を通すパズル",
    titleEn: "Keeping a Fake 'Dynamic Visual Acuity Test' Entrance While Passing SEO and AdSense",
    description:
      "初見の友達には動体視力テストと信じ込ませつつ、検索エンジンには視線計測ゲームの説明を見せるパズル。「検索する人はすでに知っている」という転換と、同日2回の改称の教訓。",
    descriptionEn:
      "Tricking first-time players with a fake visual acuity test while giving search engines and AdSense crawlers full documentation—plus the painful lesson of renaming the Worker twice in one day.",
    date: "2026-09-08",
    tags: ["SEO", "Next.js", "設計"],
    tagsEn: ["SEO", "Next.js", "Architecture"],
    products: ["michaw"],
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
  {
    slug: "gashaan-hybrid-mesh-fracture",
    title: "3,200個の破片を事前分割して破綻し、「1打目の殻＋実行時スライス」に行き着くまで",
    titleEn: "Why Pre-Fracturing 3,200 Shards Failed, and How I Landed on Shell + Runtime Mesh Slicing",
    description:
      "ワイングラスを割るために約3,200ノードの事前破断ツリーを用意したら実機で生成ラグと7mm網目の継ぎ目が露出。1打目の粗破断と実行時平面カットのハイブリッドへ転換した記録。",
    descriptionEn:
      "Shipping a 3,200-node pre-fractured tree caused instantiation lag and visible 7 mm seams on device. Here is how I pivoted to a hybrid of single-layer pre-fractured shells and runtime planar mesh slicing.",
    date: "2026-07-18",
    tags: ["Unity", "3Dメッシュ", "パフォーマンス"],
    tagsEn: ["Unity", "3D Mesh", "Performance"],
    products: ["gashaan"],
  },
];
