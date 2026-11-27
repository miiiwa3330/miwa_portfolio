import type { ProjectSource } from "./projectModel";

/**
 * The project catalogue, in display order.
 *
 * One entry per project — adding one means editing this array and nothing
 * else. (It used to be eight files plus a barrel that listed every project
 * twice, so a new project had to be registered in three places.)
 */
export const PROJECTS: ProjectSource[] = [
  {
    slug: "popos",
    title: { ja: "popos", en: "popos" },
    description: {
      ja: "電波がなくても使える、露店・ポップアップ出店のための完全オフラインPOSレジPWA。端末内のIndexedDBにイベント単位で商品・持ち主・在庫・売上を記録し、複数端末間のデータ同期は暗号化した分割QRコードの読み合いだけで完結します。",
      en: "A fully offline POS register PWA built for street stalls and pop-up markets. Stores events, items, owners, inventory, and sales locally in IndexedDB, and syncs across multiple devices solely by exchanging encrypted multi-frame QR codes—no internet or server database required.",
    },
    image: "/images/popos.png",
    tags: ["React", "Vite", "TypeScript", "PWA", "IndexedDB", "Cloudflare Pages"],
    kind: "product",
    category: "WEB",
    status: "Public",
    // Private repository (GitHub returns 404 for public visitors)
    githubUrl: "#",
    demoUrl: "https://popos.miiiwa.com",
  },
  {
    slug: "star-vessel",
    title: { ja: "star_vessel", en: "star_vessel" },
    description: {
      ja: "地球から飛び立ち、世界中のプレイヤーと同じ宇宙を自分の宇宙船の一人称視点で旅するWebアプリ。実在の恒星・惑星・系外惑星・探査機・人工衛星を現実の時刻に合わせて再現した宇宙空間を飛び回り、天体のスキャンや図鑑収集を楽しめます。",
      en: "A web app where you launch from Earth and travel through the same real-time universe as players around the world from your spaceship's cockpit. Explore real stars, planets, exoplanets, probes, and satellites synchronized to current astronomical time, scan celestial bodies, and fill your collection.",
    },
    image: "/images/star_vessel.png",
    tags: ["React", "Three.js", "Cloudflare Workers", "D1", "Durable Objects"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa3330/star_vessel",
    demoUrl: "https://star-vessel.miiiwa.com",
  },
  {
    slug: "coffee",
    title: { ja: "coffee", en: "coffee" },
    description: {
      ja: "「白い方眼の世界」に立つ青い自動販売機から飲み物を買い、隣に立つ手描きの猫キャラクター（miiiwa）へ直接手渡して差し入れできる、一人称3Dコーヒースタンド。",
      en: "A first-person 3D coffee stand set in a white graph-paper world: buy a drink from a blue vending machine and hand it directly to the hand-drawn cat character standing beside it.",
    },
    image: "/images/coffee.png",
    tags: ["React", "Three.js", "Hono", "Cloudflare Workers", "D1", "Stripe"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://coffee.miiiwa.com",
  },
  {
    slug: "loo100",
    title: { ja: "漏洩百貨店（loo100）", en: "loo100 — Data Breach Archive" },
    description: {
      ja: "最近ニュースになった日本企業の情報漏洩事件を、時系列・原因・対策の3つの視点で解説し、セキュリティを学べるサイト。トップは事件の発生日と被害規模を並べた歴史のグラフ。",
      en: "A site for learning security from recent data breaches at Japanese companies, each explained through its timeline, cause and countermeasures. The front page is a history chart of incidents by date and scale.",
    },
    image: "/images/loo100.png",
    tags: ["Astro", "Hono", "Cloudflare Workers", "D1", "Turnstile"],
    kind: "product",
    category: "WEB",
    status: "Public",
    // The repository is private: a link to it is GitHub's 404 for everyone
    // but the owner. "#" makes the hub answer with its "secret" toast and
    // the product page leave View Code out (devlog 2026-09-20).
    githubUrl: "#",
    demoUrl: "https://loo100.miiiwa.com",
  },
  {
    slug: "bukka-now",
    title: { ja: "bukka_now", en: "bukka_now" },
    description: {
      ja: "日用品・食料品・サービスの値段をテンキーで答えて、自分の物価感覚が「上位何%」かを診断するWebサービス。正解は総務省「小売物価統計調査」の公表値で、全員の回答分布と並べて見られます。",
      en: "A web quiz where you type in the prices of groceries, daily goods and services, and find out which percentile your sense of prices puts you in. Answers come from Japan's official Retail Price Survey, shown against everyone else's guesses.",
    },
    image: "/images/bukka_now.png",
    tags: ["React", "Vite", "Hono", "Cloudflare Workers", "D1"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa3330/bukka_now",
    demoUrl: "https://bukka-now.miiiwa.com",
  },
  {
    slug: "imadoko",
    title: { ja: "imadoko", en: "imadoko" },
    description: {
      ja: "URLを共有するだけで現在地をリアルタイムに共有できるWebアプリです。アプリインストールやアカウント登録は不要で、すぐに使い始められます。",
      en: "A web app that allows you to share your current location in real-time just by sharing a URL. No app installation or account registration is required, and you can start using it immediately.",
    },
    image: "/images/imadoko.png",
    tags: ["Next.js", "Supabase", "Tailwind CSS", "Leaflet"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://imadoko.miiiwa.com",
  },
  {
    slug: "michaw",
    title: { ja: "Michaw（見ちゃう）", en: "Michaw" },
    description: {
      ja: "視線推定・アイトラッキングを活用し、画像の中の「つい見てしまう場所」を見てしまうまでの時間を計測するブラウザゲーム・エンタメWebアプリです。",
      en: "An entertainment web app and browser game using eye tracking to measure how long it takes before looking at irresistible points in an image.",
    },
    image: "/images/michaw.png",
    tags: ["Next.js", "MediaPipe", "Cloudflare Workers", "D1"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://michaw.miiiwa.com",
  },
  {
    slug: "synesthesium",
    title: { ja: "Synesthesium", en: "Synesthesium" },
    description: {
      ja: "音階、色覚、モールス、リズムなど、様々な感覚を研ぎ澄ます無料の神経衰弱ゲーム・コレクション。ブラウザでいつでも手軽にプレイできます。",
      en: "A sensory memory matching game collection challenging sound pitch, color perception, Morse code, and rhythm in the browser.",
    },
    image: "/images/synesthesium.png",
    tags: ["Next.js", "React", "Web Audio API", "Tailwind CSS"],
    kind: "product",
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/synesthesium",
    demoUrl: "https://synesthesium.miiiwa.com",
  },
  {
    slug: "portfolio-v1",
    title: { ja: "Miiiwa Portfolio v1", en: "Miiiwa Portfolio v1" },
    description: {
      ja: "このサイトの2代目。宇宙に浮かぶボクセルの惑星と、その上の5つのランドマークや街並みを、すべてコードで手続き的に生成した3Dポートフォリオ。世界観を作り直すにあたり、当時のビルドをそのまま触れる形で保存しています。",
      en: "The second version of this very site. A 3D portfolio whose voxel planet floating in space, five landmarks and city are all generated procedurally in code. With the world being rebuilt, the original build is preserved here, still fully playable.",
    },
    image: "/images/portfolio_v1.webp",
    tags: ["Three.js", "React Three Fiber", "Next.js", "TypeScript"],
    kind: "product",
    category: "WEB",
    status: "Public",
    // The build itself lives in this repo under public/archive/v1/ — see
    // docs/structure.md. No trailing slash: that is the form Vercel serves
    // directly, and it 308s "/archive/v1/" to it.
    githubUrl: "https://github.com/miiiwa1121/miwa_portfolio/tree/v1-voxel-planet",
    demoUrl: "/archive/v1",
  },
  {
    slug: "portfolio-v0",
    title: { ja: "Miiiwa Portfolio v0", en: "Miiiwa Portfolio v0" },
    description: {
      ja: "このサイトの初代。黒地にネオンのグラデーションを重ね、カーソルから逃げ、長押しで吸い寄せられるパーティクルを敷いた、1ページ縦スクロールの HTML ポートフォリオ。3Dの惑星（v1）に置き換わるまで公開していたビルドを、そのまま触れる形で保存しています。",
      en: "The first version of this very site. A single-page, scrolling HTML portfolio: neon gradients on black over a field of particles that flee the cursor and gather under a long press. The build that was live until the 3D planet (v1) replaced it is preserved here, still fully playable.",
    },
    image: "/images/portfolio_v0.webp",
    tags: ["Next.js", "React", "Tailwind CSS", "Framer Motion"],
    kind: "product",
    category: "WEB",
    status: "Public",
    // Built from the last commit main had before v1 was merged; see
    // docs/structure.md.
    githubUrl: "https://github.com/miiiwa1121/miwa_portfolio/tree/v0-dark-neon",
    demoUrl: "/archive/v0",
  },
  {
    slug: "goto",
    title: { ja: "GOTO", en: "GOTO" },
    description: {
      ja: "ユニークな造形とラグジュアリー×ストリートの世界観を持つクッションブランド「GOTO」の公式Webサイト（受託制作）。日英二言語対応、GSAPとView Transitionsによるスクロール連動アニメーション、カート機能を備えています。",
      en: "Official brand website for GOTO, a cushion brand blending unusual sculptural motifs with luxury streetwear aesthetics (client work). Features bilingual ja/en routing, GSAP scroll choreography, View Transitions, and a local cart drawer.",
    },
    image: "/images/goto.png",
    tags: ["Astro", "Tailwind CSS", "GSAP", "Lenis", "Cloudflare Workers"],
    kind: "client",
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://goto-cushion.com",
  },
];
