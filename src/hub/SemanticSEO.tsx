import Link from "next/link";
import { NAV, PAGE_LINKS } from "./nav";

/**
 * SemanticSEO:
 * トップの 3D の部屋の、スクリーンリーダー向けのテキスト代替。部屋そのものは canvas に描かれていて、
 * 支援技術にも検索エンジンにも読めないので、「何が見えているか」と「どこへ行けるか」だけをここに書く。
 *
 * **ここに中身を書かない。** 2026-10-30 に区画がそれぞれのページになってから、制作実績・経歴・技術の文字は
 * 部屋（canvas）の中にもう無い。それをここに書くと、代替する相手の無い画面に出ない文章になり、Google の
 * スパムポリシーの「隠しテキスト」と読まれうる（2026-11-05 に、全プロダクトの説明・経歴・ノートの一覧まで
 * 持っていた4,774字をこの形に縮めた。review.md の F-3）。部屋に見えている文字（ホログラムの自己紹介・
 * PC の画面）は本物の HTML なので、それ自身が読める。中身は、リンク先の見えるページにある。
 */
export default function SemanticSEO() {
  return (
    <div className="sr-only" aria-label="ポートフォリオサイトの概要">
      <h1>Miiiwa | Portfolio - 面白いを最優先！</h1>
      <p>
        学生エンジニア Miiiwa のポートフォリオサイトです。トップページは、ロケットのコロニーの中にある Miiiwa
        の部屋を 3D で描いたもので、机の PC の前に座ったところから始まります。PC の画面では、このサイトそのものを開けます。
      </p>
      <nav aria-label="ページ一覧">
        <ul>
          {[...NAV, ...PAGE_LINKS].map((entry) => (
            <li key={entry.page}>
              <Link href={entry.page}>{entry.ja}</Link>
            </li>
          ))}
          <li>
            <Link href="/privacy">プライバシーポリシー</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
