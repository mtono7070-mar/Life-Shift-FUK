/* 予約ページ：URLの #ID（または ?event=ID）からイベント情報を表示し、フォームを制御します */
document.addEventListener("lsf:content", (e) => {
  const content = e.detail || {};
  const events = content.events || [];
  const { formatDate, src, tagHtml } = window.LSF;
  const id = decodeURIComponent(location.hash.slice(1)) || new URLSearchParams(location.search).get("event");
  const ev = events.find((e) => e.id === id);

  const summary = document.querySelector("[data-event-summary]");
  const formWrap = document.querySelector("[data-reserve]");
  const notFound = document.querySelector("[data-not-found]");

  if (!ev) {
    summary.hidden = true;
    formWrap.hidden = true;
    notFound.hidden = false;
    return;
  }

  const d = formatDate(ev.date);
  const set = (key, value) => {
    const el = summary.querySelector(`[data-field="${key}"]`);
    if (el) el.textContent = value;
  };

  document.title = `${ev.title}の予約｜Life Shift FUK`;
  summary.querySelector("[data-field=image]").src = src(ev.image);
  set("date", d.full);
  set("title", ev.title);
  set("time", ev.time);
  set("place", ev.place);
  set("fee", ev.fee);
  set("capacity", ev.capacity);
  set("description", ev.description);
  summary.querySelector("[data-field=tags]").innerHTML = tagHtml(ev.tags);

  const form = formWrap.querySelector("form");
  form.elements.event_id.value = ev.id;
  form.elements.event_name.value = `${d.full} ${ev.title}`;

  const steps = formWrap.querySelectorAll("[data-step]");
  const show = (name) => {
    steps.forEach((s) => (s.hidden = s.dataset.step !== name));
    formWrap.querySelectorAll(".reserve-steps li").forEach((li) =>
      li.classList.toggle("is-active", li.dataset.stepLabel === name)
    );
    formWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 入力 → 確認
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const dl = formWrap.querySelector("[data-confirm-list]");
    dl.innerHTML = "";
    form.querySelectorAll("[data-label]").forEach((field) => {
      let value;
      if (field.type === "radio") {
        if (!field.checked) return;
        value = field.value;
      } else {
        value = field.value.trim() || "（未入力）";
      }
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = field.dataset.label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
    show("confirm");
  });

  formWrap.querySelector("[data-back]").addEventListener("click", () => show("input"));

  // 確認 → 送信完了
  // ※ デモ版のため、実際の送信は行いません。
  //   本番では Googleフォーム / formrun / Formspree などの送信先をここで設定してください。
  formWrap.querySelector("[data-send]").addEventListener("click", () => {
    show("done");
  });
});
