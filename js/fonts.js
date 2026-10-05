/* =========================================
   選べるフォントの一覧（サイトと管理画面で共通）
   - name   : フォント名（Google Fonts の名前）
   - label  : 管理画面に表示する説明
   - query  : Google Fonts の読み込み指定（太さは各フォントにあるものだけ）
   - generic: 読み込めなかったときの代わりの書体
   ========================================= */
window.LSF_FONTS = [
  { name: "Noto Serif JP", label: "明朝体（上品・標準）", query: "Noto+Serif+JP:wght@500;700;900", generic: "serif" },
  { name: "Shippori Mincho", label: "明朝体（やわらかく上品）", query: "Shippori+Mincho:wght@500;700;800", generic: "serif" },
  { name: "Zen Old Mincho", label: "明朝体（クラシック）", query: "Zen+Old+Mincho:wght@500;700;900", generic: "serif" },
  { name: "BIZ UDPMincho", label: "明朝体（読みやすさ重視）", query: "BIZ+UDPMincho:wght@400;700", generic: "serif" },
  { name: "Noto Sans JP", label: "ゴシック体（すっきり・標準）", query: "Noto+Sans+JP:wght@400;500;700;900", generic: "sans-serif" },
  { name: "Zen Kaku Gothic New", label: "ゴシック体（モダン）", query: "Zen+Kaku+Gothic+New:wght@400;500;700;900", generic: "sans-serif" },
  { name: "BIZ UDPGothic", label: "ゴシック体（読みやすさ重視）", query: "BIZ+UDPGothic:wght@400;700", generic: "sans-serif" },
  { name: "M PLUS Rounded 1c", label: "丸ゴシック体（親しみやすい）", query: "M+PLUS+Rounded+1c:wght@400;500;700;800", generic: "sans-serif" },
  { name: "Zen Maru Gothic", label: "丸ゴシック体（やさしい）", query: "Zen+Maru+Gothic:wght@400;500;700;900", generic: "sans-serif" },
  { name: "Klee One", label: "手書き風（あたたかい）", query: "Klee+One:wght@400;600", generic: "sans-serif" }
];

/* 文字の大きさの選択肢（標準 = 1） */
window.LSF_FONT_SIZES = [
  { value: 0.9, label: "小さめ" },
  { value: 1, label: "標準" },
  { value: 1.1, label: "大きめ" },
  { value: 1.2, label: "とても大きく" }
];

window.LSF_DEFAULT_DESIGN = { headingFont: "Noto Serif JP", bodyFont: "Noto Sans JP", headingSize: 1, bodySize: 1 };
