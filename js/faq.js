/* =========================================
   よくある質問（ここを編集するとトップページとFAQページの両方に反映されます）
   - q : 質問
   - a : 回答（改行したい場所は \n）
   トップページには先頭から5件が表示されます。
   ========================================= */
window.LSF_FAQ = [
  {
    q: "一人でも参加できますか？",
    a: "もちろん参加できます！参加者の半数以上がおひとりでの参加です。\nスタッフが会話のきっかけをつくるので、初めての方も安心してご参加ください。"
  },
  {
    q: "年齢制限はありますか？",
    a: "20代〜40代の方を中心に、幅広い年代の方が参加しています。\nイベントによって対象年齢を設けている場合は、各イベントの詳細ページに記載しています。"
  },
  {
    q: "参加費はいくらですか？",
    a: "イベントによって異なります。ウォーキングなどは500円程度、食事を伴う交流会は3,000〜5,000円程度が目安です。\n詳しくは各イベントの予約ページをご確認ください。"
  },
  {
    q: "コミュニティへの入会が必要ですか？",
    a: "入会や年会費は必要ありません。参加したいイベントがあるときに、気軽にお申し込みください。\n最新情報は公式LINEでお知らせしています。"
  },
  {
    q: "企業関係のイベントもありますか？",
    a: "企業や団体と連携したイベントも開催しています。\nイベントの共同開催やご協賛のご相談は、公式LINEまたはInstagramのDMからお気軽にお問い合わせください。"
  }
];

/* FAQの表示（data-faq-list の data-limit で表示件数を指定） */
(function () {
  document.querySelectorAll("[data-faq-list]").forEach((list) => {
    const limit = Number(list.dataset.limit) || window.LSF_FAQ.length;
    window.LSF_FAQ.slice(0, limit).forEach((item) => {
      const li = document.createElement("li");
      li.className = "faq-item";
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.innerHTML = '<span class="faq-q" aria-hidden="true">Q.</span><span class="faq-text"></span><span class="faq-icon" aria-hidden="true"></span>';
      summary.querySelector(".faq-text").textContent = item.q;
      const answer = document.createElement("div");
      answer.className = "faq-answer";
      answer.innerHTML = '<span class="faq-a" aria-hidden="true">A.</span><p></p>';
      answer.querySelector("p").textContent = item.a;
      details.append(summary, answer);
      li.append(details);
      list.append(li);
    });
  });
})();
