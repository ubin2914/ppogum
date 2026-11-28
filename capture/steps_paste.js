// Dreamy Aquarium 웹 앱: 단축어가 복사한 걸음 수를 붙여넣는 작은 창.
// 아이폰 사파리는 "손가락으로 누른 그 순간"에만 클립보드 읽기를 허락하므로 게임 화면 위에 진짜 HTML 버튼을 띄운다.
// 게임(Godot)은 window.daSteps.open() 으로 열고, 매 프레임 window.daSteps.take() 로 결과를 가져간다.
//   take(): "" = 아직 기다리는 중, "\u0001" = 닫힘(취소), 그 밖 = 붙여넣은 글자
// 소리
//   - 아이폰 사파리는 손가락으로 처음 누를 때까지 소리를 막아 둔다 (브라우저 규칙)
//     → 게임이 만드는 AudioContext 를 기억해 두었다가, 첫 터치 순간에 바로 resume (음악 페이드 인)
//   - 다른 음악 앱(Apple Music · Spotify)을 끊지 않고 같이 나오게: navigator.audioSession.type = "ambient" (iOS 17+)
//     ※ ambient 는 무음 스위치를 켜면 게임 소리도 꺼짐 (iOS 규칙)
//   - 홈으로 나가거나 다른 앱으로 가거나 창을 내리면 바로 소리 멈춤 (AudioContext suspend),
//     돌아오면 다시 켬 (음악 ON/OFF 는 게임이 정함). 게임 시간은 기기 시계로 계산해서 그대로 흐름
// DEVELOPMENT ONLY BEGIN
// [로컬 테스트 전용 옵션] 주소 끝에 ?fps=30 을 붙이면 그 프레임 수로 제한 (붙이지 않으면 아무 영향 없음 → 배포 그대로)
//   localhost · 127.0.0.1 에서는 서비스워커(오프라인 캐시)를 쓰지 않음 → 새로 빌드하면 새로고침만으로 바로 반영
(function () {
  try {
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    var q = new URLSearchParams(location.search);
    var fps = parseInt(q.get("fps") || "0", 10);
    if (local && fps > 0 && fps < 60) {
      var orig = window.requestAnimationFrame.bind(window);
      var gap = 1000 / fps;
      var last = 0;
      window.requestAnimationFrame = function (cb) {
        return orig(function tick(t) {
          if (t - last >= gap - 2) { last = t; cb(t); } else { orig(tick); }
        });
      };
      window.daFpsLimit = fps;
    }
    if (local && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      navigator.serviceWorker.register = function () { return Promise.resolve(undefined); };
      window.daLocalTest = true;
    }
  } catch (e) {}
})();
// DEVELOPMENT ONLY END

// 화면 위 상태 막대(시계 · 배터리)까지 게임 화면이 꽉 차게: viewport-fit=cover
//   (없으면 아이폰이 상태 막대 줄을 비워 두고 검은 띠로 칠함). 게임 UI 는 원래 390×844 전체 화면 기준이라
//   위쪽 버튼들은 상태 막대 아래에 그대로 놓임. 띠가 잠깐 보일 때를 위해 바탕도 물빛으로
(function () {
  try {
    var m = document.querySelector('meta[name="viewport"]');
    if (m && m.content.indexOf("viewport-fit") < 0) m.content = m.content + ", viewport-fit=cover";
    var st = document.createElement("style");
    st.textContent = "html,body{background-color:#8fc3d8 !important;}" +
      // 2026-11-24: 로딩 화면 = 뽀금 물빛 (고닷 로고 · 회색 바탕 대신). 그림은 assets/splash/splash.png (부트 스플래시와 같음)
      "#status{background:linear-gradient(#8fc3d8,#c4e2ec) !important;}" +
      "#status-splash.fullsize--true{object-fit:cover !important;}" +
      "#status-progress{bottom:auto !important;top:calc(50% + 150px) !important;width:150px !important;height:8px !important;" +
      "-webkit-appearance:none;appearance:none;border:none;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.5);}" +
      "#status-progress::-webkit-progress-bar{background:rgba(255,255,255,.5);border-radius:4px;}" +
      "#status-progress::-webkit-progress-value{background:#f4a259;border-radius:4px;}" +
      "#status-progress::-moz-progress-bar{background:#f4a259;border-radius:4px;}" +
      "#status-progress:indeterminate{background:rgba(255,255,255,.5);}" +
      "#status-notice{background-color:rgba(255,255,255,.85) !important;border:none !important;color:#2e5866 !important;}" +
      "#da-bubbles{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;overflow:hidden;}" +
      ".da-bub{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.95);background:rgba(255,255,255,.3);" +
      "animation:daBub 1.7s cubic-bezier(.3,.6,.4,1) forwards;}" +
      "@keyframes daBub{0%{transform:translate(0,0) scale(.35);opacity:0}15%{opacity:.95}" +
      "100%{transform:translate(var(--dx),-170px) scale(1);opacity:0}}";
    document.head.appendChild(st);
  } catch (e) {}
})();

// 홈 화면 앱(standalone) 상단 · 하단
//   - 게임 화면(버튼 위치 포함)은 상태 막대(시계 · 배터리) 아래부터 화면 맨 아래까지 → 걸음 · 재화 막대가 가려지지 않음
//   - 상태 막대 자리에는 게임 화면 맨 윗부분(버튼 없는 배경 줄)을 매 프레임 거울처럼 뒤집어 그려서 배경이 위로 이어지게 (흐림 없음)
//   - iOS 는 이 모드에서 화면 높이(innerHeight)를 상태 막대만큼 짧게 알려 주고, position:fixed 는 그 높이에서 잘림 → absolute 로 배치
//   - Safari 탭 · 가로 화면 · 컴퓨터에서는 아무것도 안 함. 게임 코드는 그대로
(function () {
  try {
    var ios = /iPhone|iPod|iPad/.test(navigator.userAgent);
    var standalone = navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    // 2026-11-24: 뽀금 아이폰 앱(?app=1, 화면 가득 WKWebView)도 홈 화면 앱과 같게 (버튼이 상태 막대 아래 · 창은 그 아래 화면 가운데)
    var inApp = /[?&]app=1/.test(location.search);
    if (!(ios && (standalone || inApp)) && !window.daTestSat) return;
    var st = document.createElement("style");
    st.textContent =
      ":root{--da-sat:env(safe-area-inset-top,0px);}" +
      "html,body{background-color:#000 !important;}" +
      "#canvas{position:absolute !important;left:0 !important;top:var(--da-sat) !important;}" +
      "#da-topfill{position:absolute;left:0;top:0;width:100%;height:var(--da-sat);pointer-events:none;display:block;}" +
      "#da-sat-probe{position:absolute;top:0;left:0;width:1px;height:var(--da-sat);visibility:hidden;pointer-events:none;}";
    document.head.appendChild(st);
    if (window.daTestSat) document.documentElement.style.setProperty("--da-sat", window.daTestSat + "px");
    var probe = null, fill = null, fctx = null;
    function sat() {
      if (!probe && document.body) {
        probe = document.createElement("div"); probe.id = "da-sat-probe"; document.body.appendChild(probe);
        fill = document.createElement("canvas"); fill.id = "da-topfill"; document.body.appendChild(fill);
        fctx = fill.getContext("2d");
      }
      return probe ? probe.offsetHeight : 0;
    }
    document.addEventListener("DOMContentLoaded", sat);
    // 게임 화면 높이 = 화면 높이 − 상태 막대
    var d = Object.getOwnPropertyDescriptor(window, "innerHeight") ||
      Object.getOwnPropertyDescriptor(Window.prototype, "innerHeight");
    if (d && d.get && d.configurable) {
      var realGet = d.get;
      Object.defineProperty(window, "innerHeight", { configurable: true, enumerable: true, get: function () {
        var h = realGet.call(window);
        var sw = Math.min(screen.width, screen.height), sh = Math.max(screen.width, screen.height);
        var t = sat();
        if (Math.abs(window.innerWidth - sw) > 2 || t <= 0) return h; // 가로 화면 · 상태 막대 없음
        var want = sh - t;
        return Math.abs(h - want) <= 80 ? want : h; // 키보드가 올라온 경우 등은 그대로
      } });
    }
    // 게임이 한 프레임 그린 직후(같은 차례 안)에 맨 윗부분을 뒤집어 복사
    var game = null, n = 0;
    var TOP_PT = 46; // 게임 화면 맨 위에서 이만큼(pt)은 버튼이 없는 배경 (걸음 막대가 52pt 부터)
    function mirror() {
      if (!fctx) return;
      if (!game) game = document.getElementById("canvas");
      if (!game || game.width < 8) return;
      var t = probe.offsetHeight; if (t <= 0) return;
      var scale = game.width / Math.max(1, game.clientWidth);
      var dw = game.width, dh = Math.round(t * scale);
      if (fill.width !== dw || fill.height !== dh) { fill.width = dw; fill.height = dh; }
      var sh = Math.min(game.height, Math.round(Math.min(TOP_PT, t) * scale));
      fctx.setTransform(1, 0, 0, -1, 0, dh); // 위아래 뒤집기: 게임 맨 윗줄이 경계선에 오게
      fctx.drawImage(game, 0, 0, dw, sh, 0, 0, dw, dh);
      window.daTopFillN = (window.daTopFillN || 0) + 1;
    }
    var origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      return origRAF(function (ts) {
        cb(ts);
        if ((++n & 1) === 0) { try { mirror(); } catch (e) { window.daTopFillWhy = String(e); } }
      });
    };
    window.daTopFill = true;
  } catch (e) {}
})();

// A manual update waits for the new cache to take control before reloading.
window.daApplyWebUpdate = async function () {
  try {
    const sw = navigator.serviceWorker;
    const registration = await sw?.getRegistration();
    if (!registration) throw new Error("No service worker");
    const previous = sw.controller;
    await registration.update();
    if (sw.controller !== previous) { location.reload(); return; }
    if (!registration.installing && !registration.waiting) { location.reload(); return; }
    sw.addEventListener("controllerchange", function () { location.reload(); }, { once: true });
  } catch (_) {
    alert("업데이트를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
  }
};

// 업데이트 · 저장 보호
//   1) 저장(IndexedDB)을 브라우저가 공간 정리할 때 지우지 않도록 요청 (지원되는 브라우저만)
//   2) 홈 화면 앱은 메모리에 남아 있다가 다시 열리면 새 버전 확인을 안 함 → 화면에 돌아올 때마다 새 버전 확인
//   3) 새 버전이 이미 받아졌으면, 앱을 내렸다가(이때 게임이 저장함) 다시 올릴 때 한 번 새로고침해서 반영.
//      게임하는 도중에는 절대 새로고침하지 않음
(function () {
  try {
    if (window.daLocalTest) return;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    if (!("serviceWorker" in navigator)) return;
    var hadController = !!navigator.serviceWorker.controller;
    var pending = false, hiddenAt = 0;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (hadController) pending = true; // 처음 설치는 제외 (이미 최신)
      hadController = true;
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (pending && hiddenAt && Date.now() - hiddenAt > 1500) { location.reload(); return; }
      navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () {}); }).catch(function () {});
    });
  } catch (e) {}
})();

(function () {
  // 2026-11-04
  //  - 다른 앱(유튜브 · 음악) 소리를 끊지 않고 같이: audioSession "ambient" 를 시작 · 다시 켤 때마다 다시 지정
  //  - 켜고 끌 때 "삑" 없애기: 게임 소리를 우리 볼륨(GainNode)에 거쳐 내보내고,
  //    끌 때는 0 으로 빠르게 줄인 뒤 멈춤 · 켤 때는 0 에서 천천히 올림 (남아 있던 소리 조각이 튀지 않음)
  function ambient() { try { if (navigator.audioSession && navigator.audioSession.type !== "ambient") navigator.audioSession.type = "ambient"; } catch (e) {} }
  ambient();
  var Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;
  window.daOrigAudioContext = Orig; // 로딩 화면 뽀글 소리용 (게임 소리 관리와 따로)
  var made = [];
  var gains = new Map();
  var origConnect = AudioNode.prototype.connect;
  // 2026-11-05 고침: 우리 볼륨 노드는 원래 connect 로 바로 연결 (예전엔 자기 자신을 다시 감싸서 끝없이 반복 → 사파리 멈춤)
  function gainOf(c) {
    var g = gains.get(c);
    if (!g) {
      g = c.createGain();
      g.gain.value = 0;
      gains.set(c, g);
      origConnect.call(g, c.destination);
    }
    return g;
  }
  AudioNode.prototype.connect = function (dest) {
    try {
      if (dest && made.indexOf(this.context) >= 0 && dest === this.context.destination && gains.get(this.context) !== this) {
        arguments[0] = gainOf(this.context);
      }
    } catch (e) {}
    return origConnect.apply(this, arguments);
  };
  function ramp(c, to, sec) {
    var g = gains.get(c);
    if (!g) return;
    try {
      var t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(to, t + sec);
    } catch (e) { g.gain.value = to; }
  }
  function Wrapped(opts) {
    ambient();
    var c = opts ? new Orig(opts) : new Orig();
    made.push(c);
    gainOf(c);
    // 처음 소리가 풀리면 천천히 올림
    c.addEventListener("statechange", function () {
      if (c.state === "closed") {
        var i = made.indexOf(c);
        if (i >= 0) made.splice(i, 1);
        gains.delete(c);
      } else if (c.state === "running" && !window.daHidden) {
        ramp(c, 1, 0.35);
      }
    });
    if (c.state === "running") ramp(c, 1, 0.35);
    return c;
  }
  Wrapped.prototype = Orig.prototype;
  window.AudioContext = Wrapped;
  if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  window.daAudioUnlocked = false;
  window.daHidden = false;
  var EV = ["touchstart", "touchend", "pointerdown", "mousedown", "keydown"];
  function unlock() {
    if (window.daHidden) return;
    ambient();
    var all = true;
    made.forEach(function (c) {
      if (c.state !== "running") { all = false; try { gains.get(c).gain.value = 0; c.resume().catch(function () {}); } catch (e) {} }
    });
    if (made.length && all) {
      window.daAudioUnlocked = true;
      EV.forEach(function (t) { document.removeEventListener(t, unlock, true); });
    }
  }
  function arm() { EV.forEach(function (t) { document.addEventListener(t, unlock, true); }); }
  arm();
  // 2026-11-05: 앱을 닫을 때 삑 → 가장 먼저 오는 신호(blur)에서 바로 0 으로 (아주 짧게 줄여 딸깍 없이), 곧바로 멈춤
  function mute() {
    made.forEach(function (c) {
      var g = gains.get(c);
      if (!g) return;
      try {
        var t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        // 2026-11-25: 0.015초는 너무 급해서 끌 때 "빽" → 0.06초로 부드럽게 (지수 곡선)
        g.gain.setTargetAtTime(0, t, 0.018);
        g.gain.linearRampToValueAtTime(0, t + 0.07);
      } catch (e) { try { g.gain.value = 0; } catch (e2) {} }
    });
  }
  function hide() {
    if (window.daHidden) return;
    window.daHidden = true;
    mute();
    made.forEach(function (c) {
      setTimeout(function () { if (window.daHidden) { try { c.suspend(); } catch (e) {} } }, 90);
    });
    // 로딩 화면 거품 소리도
    try { if (window.daLoadingAudio) window.daLoadingAudio.suspend(); } catch (e) {}
  }
  // 아이폰 앱이 내려가기 시작할 때(inactive) 앱이 직접 부름
  window.daFadeOut = hide;
  window.daFadeIn = function () { if (!document.hidden) show(); };
  function show() {
    if (!window.daHidden) return;
    window.daHidden = false;
    ambient();
    made.forEach(function (c) {
      var g = gains.get(c);
      if (g) { try { g.gain.cancelScheduledValues(0); g.gain.value = 0; } catch (e) {} }
      try { c.resume().then(function () { ramp(c, 1, 0.5); }).catch(function () {}); } catch (e) {}
    });
    // 손가락 없이 다시 켜지지 않으면 다음 터치 때 켜기
    setTimeout(function () {
      var ok = made.length > 0;
      made.forEach(function (c) { if (c.state !== "running") ok = false; });
      if (!ok) { window.daAudioUnlocked = false; arm(); }
    }, 300);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) hide(); else show(); });
  window.addEventListener("pagehide", hide);
  document.addEventListener("freeze", hide);
  // 앱 전환 화면을 여는 순간(blur)에도 먼저 소리를 0 으로. 다시 돌아오면(focus) 화면이 보이는 경우 천천히 올림
  // 2026-11-06: 키보드를 켜고 끌 때(이름 짓기 · 걸음 입력)는 음악을 멈추지 않음 → 글자 칸에 초점이 있으면 건너뜀
  function typing() {
    var a = document.activeElement;
    return !!(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable));
  }
  window.addEventListener("blur", function () { if (!typing()) mute(); });
  window.addEventListener("focus", function () {
    if (window.daHidden || document.hidden) return;
    made.forEach(function (c) { if (c.state === "running") ramp(c, 1, 0.4); });
  });
  window.addEventListener("pageshow", function () { if (!document.hidden) show(); });
})();

(function () {
  // 다른 사람도 쓸 수 있게: [단축어 받기] = 내 "DA 걸음" iCloud 링크 (누르면 단축어 앱에서 '단축어 추가')
  //                        [직접 입력] = 건강 앱 숫자를 보고 쳐 넣기 (단축어 없이)
  var SHORTCUT_URL = "https://www.icloud.com/shortcuts/e95301d7708e4b41930d40eba0ddb077";
  var MSG = "단축어 'DA 걸음' 실행 후 붙여넣기";
  var state = { open: false, result: "", mode: "" };
  var root = null, msg = null, input = null, ok = null, typeBtn = null;

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }

  function build() {
    root = el("div", "position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;" +
      "background:rgba(20,60,80,0.18);font-family:-apple-system,system-ui,sans-serif;-webkit-user-select:none;user-select:none");
    var card = el("div", "width:min(92vw,360px);margin-bottom:max(24px,env(safe-area-inset-bottom));padding:18px 18px 14px;" +
      "border-radius:30px;background:rgba(240,248,250,0.78);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);" +
      "border:2px solid rgba(255,255,255,0.9);color:#2c4f5c;box-shadow:0 10px 30px rgba(20,60,80,0.18);text-align:center");
    card.appendChild(el("div", "font-size:17px;font-weight:600;margin-bottom:6px", "걸음 수 불러오기"));
    msg = el("div", "font-size:13px;line-height:1.5;color:#5f7f8b;margin-bottom:14px", MSG);
    card.appendChild(msg);
    var paste = el("button", "width:100%;padding:14px 0;border:0;border-radius:999px;background:#7dd0b6;color:#ffffff;" +
      "font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(79,179,148,0.35)", "붙여넣기");
    paste.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) { finish(t || ""); })
          .catch(function () { showInput("paste"); });
      } else {
        showInput("paste");
      }
    });
    card.appendChild(paste);
    var row = el("div", "display:flex;gap:8px;margin-top:8px");
    var get = el("button", "flex:1;padding:11px 0;border:1.5px solid #9fd9c7;border-radius:999px;background:rgba(255,255,255,0.85);" +
      "color:#2e8a70;font-size:14px;font-weight:600", "단축어 받기");
    get.id = "daStepsGetShortcut";
    get.addEventListener("click", function () {
      // 홈 화면 앱에서도 사파리/단축어 앱으로 열림
      var w = null;
      try { w = window.open(SHORTCUT_URL, "_blank"); } catch (e) {}
      if (!w) location.href = SHORTCUT_URL;
    });
    row.appendChild(get);
    typeBtn = el("button", "flex:1;padding:11px 0;border:1.5px solid #9fd9c7;border-radius:999px;background:rgba(255,255,255,0.85);" +
      "color:#2e8a70;font-size:14px;font-weight:600", "직접 입력");
    typeBtn.id = "daStepsType";
    typeBtn.addEventListener("click", function () { showInput("type"); });
    row.appendChild(typeBtn);
    card.appendChild(row);
    var inRow = el("div", "display:none;gap:8px;margin-top:10px");
    input = el("input", "flex:1;min-width:0;box-sizing:border-box;padding:11px;border-radius:12px;" +
      "border:1.5px solid #9fd9c7;background:rgba(255,255,255,0.92);color:#2c4f5c;font-size:16px;-webkit-user-select:text;user-select:text");
    input.setAttribute("autocomplete", "off");
    input.addEventListener("input", function () {
      if (state.mode === "paste" && input.value.trim()) finish(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submitTyped(); }
    });
    inRow.appendChild(input);
    ok = el("button", "padding:0 18px;border:0;border-radius:12px;background:#7dd0b6;color:#fff;font-size:15px;font-weight:600", "확인");
    ok.addEventListener("click", submitTyped);
    inRow.appendChild(ok);
    input._row = inRow;
    card.appendChild(inRow);
    var close = el("button", "margin-top:8px;padding:10px 22px;border:0;background:none;color:#5f7f8b;font-size:14px", "닫기");
    close.addEventListener("click", function () { hide(); state.result = "\u0001"; });
    card.appendChild(close);
    root.appendChild(card);
    root.addEventListener("click", function (e) { if (e.target === root) { hide(); state.result = "\u0001"; } });
    document.body.appendChild(root);
  }

  function showInput(mode) {
    state.mode = mode;
    var typing = mode === "type";
    msg.textContent = typing ? "건강 앱 오늘 걸음 수" : "아래 칸을 길게 눌러 붙여넣기";
    input.setAttribute("inputmode", typing ? "numeric" : "text");
    input.setAttribute("enterkeyhint", "done");
    input.placeholder = typing ? "예: 8768" : "여기를 길게 눌러 붙여넣기";
    ok.style.display = typing ? "block" : "none";
    input._row.style.display = "flex";
    input.value = "";
    input.focus();
  }

  function submitTyped() {
    var digits = (input.value || "").replace(/[^0-9]/g, "");
    if (!digits) { input.focus(); return; }
    finish(digits);
  }

  function finish(t) {
    hide();
    state.result = t.trim() || "\u0001";
  }

  function hide() {
    state.open = false;
    state.mode = "";
    if (root) root.style.display = "none";
    if (input) { input.blur(); input._row.style.display = "none"; }
  }

  window.daSteps = {
    url: SHORTCUT_URL,
    open: function () {
      if (!root) build();
      state.open = true;
      state.result = "";
      state.mode = "";
      msg.textContent = MSG;
      input._row.style.display = "none";
      root.style.display = "flex";
    },
    take: function () {
      var r = state.result;
      if (r) state.result = "";
      return r || (state.open ? "" : "\u0001");
    },
  };
})();

// 켤 때마다 새 버전 확인 (새 버전은 다음에 켤 때 보임)
(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.getRegistration().then(function (r) {
      if (r) r.update();
    }).catch(function () {});
  });
})();

// 이름 입력 창 (어항 이름 · 물고기 이름): 아이폰 사파리/홈 화면 앱에서 기본 키보드가 바로 뜨게 진짜 HTML 입력칸을 씀.
// 게임(Godot)은 window.daText.open(제목, 처음 글자, 안내, 최대 글자) 로 열고, 매 프레임 window.daText.take() 로 결과를 가져감.
//   take(): "" = 기다리는 중, "\u0001" = 취소, "\u0002" + 글자 = 저장
//   - 키보드 Return(완료) → 저장하고 키보드 내림 / 키보드 위 '완료' 로 키보드만 내려도 저장 / [확인] 버튼도 저장
//   - 창은 키보드 바로 위에 뜸 (visualViewport 로 키보드 높이를 보고 맞춤, 키보드 없으면 화면 가운데쯤)
(function () {
  var st = { open: false, result: "" };
  var root = null, card = null, title = null, hint = null, input = null, cancelling = false, done = false;
  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }
  function build() {
    root = el("div", "position:fixed;inset:0;z-index:9998;display:none;align-items:flex-start;justify-content:center;" +
      "background:rgba(20,60,80,0.22);font-family:-apple-system,system-ui,sans-serif;color-scheme:light only");
    card = el("div", "position:absolute;left:50%;transform:translateX(-50%);top:30%;width:min(90vw,340px);box-sizing:border-box;padding:18px 18px 14px;" +
      "border-radius:28px;background:rgba(240,248,250,0.86);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);" +
      "border:2px solid rgba(255,255,255,0.9);color:#2c4f5c;box-shadow:0 10px 30px rgba(20,60,80,0.18)");
    title = el("div", "font-size:16px;font-weight:600;margin-bottom:10px");
    card.appendChild(title);
    input = el("input", "width:100%;box-sizing:border-box;padding:13px 14px;border-radius:14px;border:1.5px solid #9fd9c7;" +
      "background:rgba(255,255,255,0.95);color:#2c4f5c;font-size:17px;outline:none;-webkit-user-select:text;user-select:text");
    input.type = "text";
    input.setAttribute("enterkeyhint", "done");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.placeholder = "눌러서 이름 입력";
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); }
    });
    input.addEventListener("blur", function () {
      // 키보드 위 '완료' 로 내렸을 때도 저장 (취소 버튼을 누른 경우는 빼고)
      setTimeout(function () { if (st.open && !cancelling && !done && input.value.trim()) ok(); }, 160);
    });
    card.appendChild(input);
    hint = el("div", "font-size:12px;color:#5f7f8b;margin:8px 2px 12px");
    card.appendChild(hint);
    var row = el("div", "display:flex;gap:8px");
    var cancel = el("button", "flex:1;padding:12px 0;border-radius:999px;border:1px solid rgba(255,255,255,0.9);" +
      "background:rgba(255,255,255,0.6);color:#2c4f5c;font-size:15px", "취소");
    cancel.addEventListener("pointerdown", function () { cancelling = true; });
    cancel.addEventListener("click", function () { finish("\u0001"); });
    var okb = el("button", "flex:1;padding:12px 0;border-radius:999px;border:0;background:#7dd0b6;color:#fff;font-size:15px;font-weight:600", "확인");
    okb.addEventListener("pointerdown", function (e) { e.preventDefault(); });
    okb.addEventListener("click", ok);
    row.appendChild(cancel);
    row.appendChild(okb);
    card.appendChild(row);
    root.appendChild(card);
    document.body.appendChild(root);
    var vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", place);
      vv.addEventListener("scroll", place);
    }
    window.addEventListener("resize", place);
    input.addEventListener("focus", function () { place(); setTimeout(place, 120); setTimeout(place, 350); });
  }
  // 키보드 바로 위 (키보드가 없으면 화면 가운데보다 조금 위)
  var screenH = 0;
  function place() {
    if (!root || root.style.display === "none") return;
    var vv = window.visualViewport;
    var h = card.offsetHeight || 200;
    var vtop = vv ? vv.offsetTop : 0;
    // 2026-11-17: 키보드가 올라오든 아니든 늘 화면(키보드 올라오기 전 전체 화면)의 정가운데
    var fullH = Math.max(screenH || 0, window.innerHeight || 0);
    var top = vtop + (fullH - h) * 0.5;
    card.style.top = Math.max(top, vtop + 12) + "px";
  }
  function ok() {
    if (!st.open) return;
    var v = input.value.trim();
    if (!v) { hint.textContent = "이름을 입력해 주세요"; input.focus(); return; }
    finish("\u0002" + v);
  }
  function finish(r) {
    done = true;
    st.open = false;
    st.result = r;
    input.blur();
    root.style.display = "none";
  }
  window.daText = {
    open: function (t, value, h, maxLen) {
      if (!root) build();
      title.textContent = t || "이름";
      hint.textContent = h || "";
      input.maxLength = maxLen || 12;
      input.value = value || "";
      cancelling = false;
      done = false;
      st.open = true;
      st.result = "";
      root.style.display = "flex";
      screenH = window.innerHeight;
      place();
      try { input.focus(); input.select(); } catch (e) {}
    },
    take: function () {
      var r = st.result;
      if (r) st.result = "";
      return r || (st.open ? "" : "\u0001");
    },
    isOpen: function () { return st.open; },
  };
})();

// 어항 사진 (2026-11-03): 게임이 UI 없이 찍은 사진을 화면에 띄움
//   아이폰: 사진을 길게 눌러 "사진 앱에 저장" / [저장 · 공유] → 공유 시트에서 "이미지 저장"
//   컴퓨터: [저장 · 공유] → 파일로 내려받기
(function () {
  var box = null, img = null;
  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; }
  function build() {
    box = el("div", "position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;" +
      "padding:max(20px,env(safe-area-inset-top)) 18px max(20px,env(safe-area-inset-bottom));background:rgba(20,50,64,0.55);" +
      "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:-apple-system,system-ui,sans-serif");
    img = el("img", "max-width:86vw;max-height:66vh;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,0.25);-webkit-touch-callout:default;user-select:auto;-webkit-user-select:auto");
    img.alt = "뽀금 어항 사진";
    var tip = el("div", "color:#fff;font-size:13px;opacity:0.9", "사진을 길게 눌러 '사진 앱에 저장'");
    var row = el("div", "display:flex;gap:10px");
    var share = el("button", "padding:12px 22px;border:0;border-radius:999px;background:#7dd0b6;color:#fff;font-size:15px;font-weight:600", "저장 · 공유");
    var close = el("button", "padding:12px 22px;border:0;border-radius:999px;background:rgba(255,255,255,0.85);color:#2c4f5c;font-size:15px", "닫기");
    share.onclick = function () {
      var name = "ppogum_" + Date.now() + ".png";
      fetch(img.src).then(function (r) { return r.blob(); }).then(function (blob) {
        var file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: "뽀금 어항" }).catch(function () {});
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
      });
    };
    close.onclick = function () { box.style.display = "none"; img.src = ""; };
    row.appendChild(share); row.appendChild(close);
    box.appendChild(img); box.appendChild(tip); box.appendChild(row);
    document.body.appendChild(box);
  }
  window.daCapture = {
    show: function (src) {
      if (!box) build();
      img.src = src;
      box.style.display = "flex";
    },
    isOpen: function () { return !!box && box.style.display !== "none"; }
  };
})();


(function () {
  // 2026-11-06 (2): 약한 진동
  //   아이폰 사파리는 진동 API가 없어서 iOS 18 의 '스위치' 햅틱을 씀. 이건 손가락이 닿은 그 순간(터치 이벤트 안)에서만 울림.
  //   그래서 게임이 0.1초마다 "여기를 누르면 진동" 자리(물고기 · 머리 위 표시 · 꺼내기 버튼)를 window.ppHapticZones 로 알려 주고,
  //   손가락을 뗄 때 그 자리면 바로 진동.
  // iOS: <label for> + <input type=checkbox switch> 를 body 에 계속 두고(display:none 이 아니라 투명하게), 터치 순간 label.click()
  var lab = null;
  function ensure() {
    if (lab || !document.body) return;
    var inp = document.createElement("input");
    inp.type = "checkbox";
    inp.id = "pp-haptic-switch";
    inp.setAttribute("switch", "");
    inp.setAttribute("aria-hidden", "true");
    inp.tabIndex = -1;
    inp.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;margin:0;z-index:-1";
    lab = document.createElement("label");
    lab.htmlFor = "pp-haptic-switch";
    lab.setAttribute("aria-hidden", "true");
    lab.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1";
    document.body.appendChild(inp);
    document.body.appendChild(lab);
  }
  function one() {
    try { if (navigator.vibrate && navigator.vibrate(10)) return; } catch (e) {}
    try { ensure(); if (lab) lab.click(); } catch (e) {}
  }
  // DEVELOPMENT ONLY BEGIN
  var localDiagnostics = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (localDiagnostics) window.ppHapticTest = one;
  // 진단용: 주소 끝에 ?haptic 을 붙여 열면 화면 아래에 [진동 테스트] 버튼 (게임 밖의 진짜 HTML 버튼)
  //   이 버튼을 눌러도 안 울리면 그 아이폰(iOS 버전)은 웹에서 진동을 아예 못 씀
  if (localDiagnostics && new URLSearchParams(location.search).has("haptic")) {
    window.addEventListener("load", function () {
      var b = document.createElement("button");
      b.textContent = "진동 테스트";
      b.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;padding:12px 22px;border-radius:22px;border:0;background:#5cc7b2;color:#fff;font-size:16px;font-weight:700";
      b.addEventListener("click", function () { one(); b.textContent = "진동 테스트 (" + navigator.userAgent.match(/OS (\d+[_\d]*)/)?.[1]?.replace(/_/g, ".") + ")"; });
      document.body.appendChild(b);
    });
  }
  // DEVELOPMENT ONLY END
  function run(list) {
    list = Array.isArray(list) && list.length ? list : [0];
    list.forEach(function (d) { if (d <= 0) one(); else setTimeout(one, d); });
  }
  // 게임에서 바로 부를 때 (안드로이드는 이걸로 됨, 아이폰은 손가락 순간이 아니면 안 될 수 있음)
  window.ppHaptic = function (pattern) {
    if (Date.now() - lastTouchHaptic < 250) return; // 방금 터치 순간에 이미 울림
    run(pattern);
  };
  window.ppHapticZones = [];
  var start = null, lastTouchHaptic = 0;
  function canvasRect() {
    var c = document.querySelector("canvas");
    return c ? c.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }
  function onStart(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    start = { x: t.clientX, y: t.clientY, at: Date.now() };
  }
  function onEnd(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    if (!start) return;
    if (Date.now() - lastTouchHaptic < 400) { start = null; return; } // 터치 뒤 따라오는 마우스 이벤트
    var moved = Math.hypot(t.clientX - start.x, t.clientY - start.y);
    var long = Date.now() - start.at;
    start = null;
    if (moved > 14 || long > 450) return;
    var r = canvasRect();
    var nx = (t.clientX - r.left) / r.width, ny = (t.clientY - r.top) / r.height;
    var zones = window.ppHapticZones || [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i]; // [x, y, w, h, pattern] (0~1 화면 비율)
      if (nx >= z[0] && nx <= z[0] + z[2] && ny >= z[1] && ny <= z[1] + z[3]) {
        lastTouchHaptic = Date.now();
        run(z[4]);
        return;
      }
    }
  }
  document.addEventListener("touchstart", onStart, { capture: true, passive: true });
  document.addEventListener("touchend", onEnd, { capture: true, passive: true });
  document.addEventListener("mousedown", onStart, true);
  document.addEventListener("mouseup", onEnd, true);
})();

// 2026-11-25: 로딩 화면 금붕어가 입에서 거품을 뽀글뽀글 (+ 작은 뽀글 소리)
//   그림(assets/splash/splash.png 1170×2532, 가운데 340 금붕어)을 화면에 꽉 채운 그대로 입 위치를 계산.
//   소리는 손가락으로 누르기 전에 막히는 브라우저에서는 조용히 넘어감 (아이폰 앱에서는 남)
(function () {
  function spawnFishBubbles(layer, mouth, tap, sound) {
    var n = tap ? 2 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2);
    var queued = Number(layer.dataset.pending || 0);
    n = Math.max(0, Math.min(n, 16 - layer.childElementCount - queued));
    layer.dataset.pending = queued + n;
    for (var i = 0; i < n; i++) {
      setTimeout(function () {
        layer.dataset.pending = Number(layer.dataset.pending) - 1;
        if (!layer.isConnected) return;
        var m = mouth(), b = document.createElement("div"), sz = 6 + Math.random() * 7;
        b.className = "da-bub";
        b.style.width = b.style.height = sz + "px";
        b.style.left = (m[0] - sz / 2) + "px";
        b.style.top = (m[1] - sz / 2) + "px";
        b.style.setProperty("--dx", (Math.random() * 26 - 6).toFixed(1) + "px");
        layer.appendChild(b);
        setTimeout(function () { b.remove(); }, 1800);
        if (sound) sound();
      }, i * (tap ? 90 : 150));
    }
  }

  function playFishBubble(ctx) {
    if (!ctx) return;
    if (ctx.state !== "running") { try { ctx.resume().catch(function () {}); } catch (e) {} return; }
    try {
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      var f = 420 + Math.random() * 320;
      o.type = "sine";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.13);
    } catch (e) {}
  }

  var tutorialAudio = null;
  window.daStopTutorialFishPuff = function () {
    var layer = document.getElementById("da-tutorial-bubbles");
    if (layer) layer.remove();
    if (tutorialAudio && tutorialAudio.state !== "closed") tutorialAudio.close().catch(function () {});
    tutorialAudio = null;
  };

  window.daTutorialFishPuff = function (x, y, sounds) {
    var canvas = document.querySelector("canvas");
    if (!canvas || !canvas.width || !canvas.height) return;
    var rect = canvas.getBoundingClientRect();
    var layer = document.getElementById("da-tutorial-bubbles");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "da-tutorial-bubbles";
      layer.style.cssText = "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:10";
      document.body.appendChild(layer);
    }
    if (sounds && !tutorialAudio) {
      try { var Context = window.AudioContext || window.webkitAudioContext; if (Context) tutorialAudio = new Context(); } catch (e) {}
    }
    if (sounds && tutorialAudio && tutorialAudio.state === "suspended") tutorialAudio.resume().catch(function () {});
    spawnFishBubbles(layer, function () {
      return [rect.left + x * rect.width / canvas.width, rect.top + y * rect.height / canvas.height];
    }, true, sounds ? function () { playFishBubble(tutorialAudio); } : null);
  };

  function start() {
    var st = document.getElementById("status");
    if (!st) return;
    var layer = document.createElement("div");
    layer.id = "da-bubbles";
    st.appendChild(layer);
    var ctx = null;
    try { var O = window.daOrigAudioContext || window.AudioContext || window.webkitAudioContext; if (O) ctx = new O(); } catch (e) { ctx = null; }
    function mouth() {
      var W = window.innerWidth, H = window.innerHeight;
      var s = Math.max(W / 1170, H / 2532);
      var cy = H / 2 + (1206 - 1266) * s; // 그림 속 금붕어 가운데 (그림 가운데보다 60 위)
      return [W / 2 + 150 * s, cy + 6 * s];
    }
    function blub() { playFishBubble(ctx); }
    var iv = 0;
    window.daLoadingAudio = ctx;
    function stop() { if (iv) clearInterval(iv); iv = 0; try { if (ctx) ctx.close(); } catch (e) {} ctx = null; window.daLoadingAudio = null; document.removeEventListener("pointerdown", onTap, true); }
    // 2026-11-25: 저절로는 가끔(약 5.5초마다)만 · 금붕어를 누르면 누를 때마다 뽀글 (연타 OK)
    function onTap(e) {
      if (!st.isConnected) { stop(); return; }
      if (getComputedStyle(st).visibility === "hidden") return;
      var W = window.innerWidth, H = window.innerHeight;
      var s = Math.max(W / 1170, H / 2532);
      var cx = W / 2, cy = H / 2 + (1206 - 1266) * s;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > Math.max(260 * s, 70)) return;
      if (ctx && ctx.state !== "running") { try { ctx.resume().then(function () { blub(); }).catch(function () {}); } catch (e2) {} }
      puff(true);
    }
    document.addEventListener("pointerdown", onTap, true);
    function puff(tap) {
      if (!st.isConnected) { stop(); return; }
      if (getComputedStyle(st).visibility === "hidden") return;
      spawnFishBubbles(layer, mouth, tap, blub);
    }
    iv = setInterval(function () { puff(false); }, 5500);
    setTimeout(function () { puff(false); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
