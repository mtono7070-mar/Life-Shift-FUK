/* =========================================
   イベント情報（ここを編集するとトップページと予約ページの両方に反映されます）
   - id     : 予約ページのURLに使う識別子（英数字とハイフン）
   - date   : 開催日（YYYY-MM-DD）。曜日は自動で表示されます
   - tags   : 表示するタグ（色は EVENT_TAG_COLORS で設定）
   - image  : トップページ（index.html）から見た画像のパス
   ========================================= */
window.LSF_EVENTS = [
  {
    id: "2026-10-10-walking",
    date: "2026-10-10",
    title: "大濠公園ウォーキング",
    tags: ["健康", "交流"],
    image: "assets/images/events/walking.jpg",
    time: "9:00〜11:00",
    place: "大濠公園（福岡市中央区）※集合場所は予約後にご案内します",
    fee: "500円（保険料込み）",
    capacity: "20名",
    description: "大濠公園の外周をみんなでゆっくり歩きます。自分のペースで参加できるので、運動が苦手な方も大歓迎。ウォーキングのあとは近くのカフェでおしゃべりタイムがあります。"
  },
  {
    id: "2026-10-18-bbq",
    date: "2026-10-18",
    title: "BBQ交流会",
    tags: ["交流", "グルメ"],
    image: "assets/images/events/bbq.jpg",
    time: "11:00〜15:00",
    place: "福岡市内のビーチ（詳細は予約後にご案内します）",
    fee: "4,000円（食材・飲み物込み）",
    capacity: "60名",
    description: "海辺でBBQを楽しみながら、たくさんの人と交流できる人気イベントです。おひとりでの参加も多く、スタッフが会話のきっかけをつくるので安心してご参加ください。"
  },
  {
    id: "2026-10-25-money",
    date: "2026-10-25",
    title: "お金の勉強会",
    tags: ["学び", "お金"],
    image: "assets/images/events/money-study.jpg",
    time: "14:00〜16:00",
    place: "天神エリアのカフェ（詳細は予約後にご案内します）",
    fee: "1,000円（ドリンク代込み）",
    capacity: "12名",
    description: "家計管理やNISAのしくみなど、知っておきたいお金の基本をやさしく学ぶ少人数の勉強会です。金融商品の勧誘・販売は一切ありません。"
  }
];

/* タグの色（未設定のタグは金色で表示） */
window.EVENT_TAG_COLORS = {
  "健康": "#2a9d74",
  "交流": "#df5470",
  "グルメ": "#e0688a",
  "学び": "#2a95c9",
  "お金": "#c98a2b",
  "美容": "#df5470",
  "社会貢献": "#2a9d74"
};

/* "2026-10-10" → { md: "10.10", dow: "土" } */
window.formatEventDate = function (iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = "日月火水木金土"[new Date(y, m - 1, d).getDay()];
  return { md: m + "." + d, dow: dow, full: y + "年" + m + "月" + d + "日（" + dow + "）" };
};
