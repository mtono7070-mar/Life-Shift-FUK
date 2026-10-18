/* =========================================
   動画のURLを読み取る（サイトと管理画面の両方で使います）
   - YouTube：https://www.youtube.com/watch?v=… / https://youtu.be/… / ショート動画
   - Instagram：リール・投稿のURL
   読み取れないURLのときは null を返します
   ========================================= */
(function () {
  "use strict";

  function parseVideo(url) {
    let u;
    let text = String(url || "").trim();
    if (/^(www\.|m\.)?(youtube\.com|youtu\.be|instagram\.com)\//i.test(text)) text = "https://" + text; // https:// が抜けていても読めるように
    try { u = new URL(text); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.replace(/^(www|m)\./, "");

    // YouTube
    let id = null;
    let vertical = false;
    if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0];
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
        if (m) { id = m[2]; vertical = m[1] === "shorts"; }
      }
    }
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return {
        type: "youtube",
        label: vertical ? "YouTubeのショート動画" : "YouTubeの動画",
        vertical,
        // 音なしで自動再生・くり返し再生（音は再生画面で出せます）
        src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0`
      };
    }

    // Instagram
    if (host === "instagram.com") {
      const m = u.pathname.match(/^\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
      if (m) {
        const kind = m[1] === "reels" ? "reel" : m[1];
        return { type: "instagram", label: "Instagramの投稿", vertical: true, src: `https://www.instagram.com/${kind}/${m[2]}/embed` };
      }
    }
    return null;
  }

  window.LSF_VIDEO = { parse: parseVideo };
})();
