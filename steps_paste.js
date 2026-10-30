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
// [로컬 테스트 전용 옵션] 주소 끝에 ?fps=30 을 붙이면 그 프레임 수로 제한 (붙이지 않으면 아무 영향 없음 → 배포 그대로)
//   localhost · 127.0.0.1 에서는 서비스워커(오프라인 캐시)를 쓰지 않음 → 새로 빌드하면 새로고침만으로 바로 반영
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var fps = parseInt(q.get("fps") || "0", 10);
    if (fps > 0 && fps < 60) {
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
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      navigator.serviceWorker.register = function () { return Promise.resolve(undefined); };
      window.daLocalTest = true;
    }
  } catch (e) {}
})();

// 화면 위 상태 막대(시계 · 배터리)까지 게임 화면이 꽉 차게: viewport-fit=cover
//   (없으면 아이폰이 상태 막대 줄을 비워 두고 검은 띠로 칠함). 게임 UI 는 원래 390×844 전체 화면 기준이라
//   위쪽 버튼들은 상태 막대 아래에 그대로 놓임. 띠가 잠깐 보일 때를 위해 바탕도 물빛으로
(function () {
  try {
    var m = document.querySelector('meta[name="viewport"]');
    if (m && m.content.indexOf("viewport-fit") < 0) m.content = m.content + ", viewport-fit=cover";
    var st = document.createElement("style");
    st.textContent = "html,body{background-color:#8fc3d8 !important;}";
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
    if (!(ios && standalone) && !window.daTestSat) return;
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
  try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) {}
  var Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;
  var made = [];
  function Wrapped(opts) {
    var c = opts ? new Orig(opts) : new Orig();
    made.push(c);
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
    var all = true;
    made.forEach(function (c) {
      if (c.state !== "running") { all = false; try { c.resume(); } catch (e) {} }
    });
    if (made.length && all) {
      window.daAudioUnlocked = true;
      EV.forEach(function (t) { document.removeEventListener(t, unlock, true); });
    }
  }
  function arm() { EV.forEach(function (t) { document.addEventListener(t, unlock, true); }); }
  arm();
  function hide() {
    if (window.daHidden) return;
    window.daHidden = true;
    made.forEach(function (c) { try { c.suspend(); } catch (e) {} });
  }
  function show() {
    if (!window.daHidden) return;
    window.daHidden = false;
    made.forEach(function (c) { try { c.resume(); } catch (e) {} });
    // 손가락 없이 다시 켜지지 않으면 다음 터치 때 켜기
    setTimeout(function () {
      var ok = made.length > 0;
      made.forEach(function (c) { if (c.state !== "running") ok = false; });
      if (!ok) { window.daAudioUnlocked = false; arm(); }
    }, 300);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) hide(); else show(); });
  window.addEventListener("pagehide", hide);
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
  function place() {
    if (!root || root.style.display === "none") return;
    var vv = window.visualViewport;
    var h = card.offsetHeight || 200;
    var vh = vv ? vv.height : window.innerHeight;
    var vtop = vv ? vv.offsetTop : 0;
    var keyboard = window.innerHeight - vh > 120;
    var top = keyboard ? (vtop + vh - h - 14) : (vtop + (vh - h) * 0.42);
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
