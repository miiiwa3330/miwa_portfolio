import type { ReactNode } from "react";

/**
 * The self-introduction, in both languages — read in the PC's
 * `自己紹介.txt` and, until the hologram replaces it (step 5 of
 * docs/room-migration.md), in the crawl.
 */
export function aboutParagraphs(isJa: boolean): ReactNode[] {
  // The Japanese copy is written entirely in full-width forms — `２０１９`, not
  // `2019` — because the crawl is set on a grid of one em per character (see
  // the prose block below). Each paragraph also has to stay on a single source
  // line: JSX condenses a newline in the middle of a text run into a single
  // half-width space, which is narrower than a cell and knocks that one line
  // off the grid. `aboutCopy.test.ts` holds both rules — neither depends on
  // how many cells wide the block is, so changing that is not a reason to
  // revisit them.
  const paragraphs = isJa
    ? [
        <>
          初めまして、<span className="font-bold">Ｍｉｉｉｗａ</span>です。「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出しの学生エンジニア（２７卒）です。
        </>,
        <>
          きっかけは２０１９年、漫画『王様達のヴァイキング』を読んだことでした。コード一つで世界と対峙できるという事実に衝撃を受け、そこからコンピュータの世界にのめり込んでいます。翌年には情報系の高校へ進学し、Ｃ言語でアルゴリズムやメモリ管理といった土台を固めました。
        </>,
        <>
          転機になったのはＰｙｔｈｏｎとの出会いです。思いついたものがその日のうちに動く——この速度を知ってから、作りたいものの数が一気に増えました。２０２４年にはエンジニア養成機関「４２ｔｏｋｙｏ」へ入学し、ピアラーニングの環境で自走力とソフトウェアエンジニアリングを鍛え直しています。
        </>,
        <>
          ２０２５年には東京大学松尾研究室のＧＣＩ（グローバル消費インテリジェンス寄付講座）を修了し、データサイエンスとＡＩの視点を手に入れました。同じ年、産学連携プロジェクトではリーダーとしてチーム開発を牽引し、実社会の課題に向き合う難しさと面白さを知りました。
        </>,
        <>
          個人開発では「ｉｍａｄｏｋｏ」から始まり、Ｐ２Ｐスペースシェアリングの「Ｓｕｋｉｍａ　Ｐａｒｋ」、「ｍｅｓｅｎ」と作り続け、いまは新サービス「Ｕｍｏｊａ」を開発中です。要件定義からアーキテクチャ設計、実装までを一人で回すなかで、技術は目的ではなく手段だと考えるようになりました。
        </>,
        <>
          大切にしているのは、ただ動くものを作らないこと。「使ってて楽しい」「デザインがカッコいい」と思ってもらえる体験（ＵＸ）まで含めて、はじめてプロダクトだと思っています。このポートフォリオをボクセルの街にしたのも、その答えの一つです。
        </>,
        <>
          とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！
        </>,
      ]
    : [
        <>
          Hello, I&apos;m <span className="font-bold">Miiiwa</span> — a junior
          student engineer (Class of &apos;27) challenging product development
          every day with the motto &quot;Fun First!&quot;
        </>,
        <>
          It started in 2019, with a manga called <em>Kings&apos; Viking</em>. The
          idea that a single piece of code could take on the world floored me,
          and I have been buried in computers ever since. The next year I entered
          an IT-focused high school and laid the groundwork in C — algorithms,
          memory, how the machine actually works.
        </>,
        <>
          Python was the turning point. An idea could run the same day I had it,
          and once I knew that speed the list of things I wanted to build got a
          lot longer. In 2024 I joined 42tokyo, where peer learning rebuilt how I
          work on my own and how I think about software engineering.
        </>,
        <>
          In 2025 I completed GCI (Global Consumer Intelligence) at the
          University of Tokyo&apos;s Matsuo Lab, which gave me a data science and
          AI perspective. That same year I led a joint industry-academia project,
          and learned how hard — and how interesting — real-world problems are.
        </>,
        <>
          On my own I have shipped <em>imadoko</em>, then <em>Sukima Park</em>, a
          P2P space-sharing platform, then <em>mesen</em>; right now I am building
          a new service called <em>Umoja</em>. Running everything myself, from
          requirements through architecture to implementation, is what taught me
          that technology is the means and never the point.
        </>,
        <>
          What I care about is not stopping at something that merely works. A
          product is only a product once the experience around it — &quot;this is
          fun to use&quot;, &quot;the design is cool&quot; — is there too. Making
          this portfolio a voxel town is one answer to that.
        </>,
        <>
          Above all I chase novelty, spending my days looking for the things that
          do not exist yet.
        </>,
      ];
  return paragraphs;
}
