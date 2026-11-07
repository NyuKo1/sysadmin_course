// Рейтинг класса: вход по нику и PIN, отправка очков с офлайн-очередью, виджет таблицы лидеров.
// window.Leaderboard = { submit(gameId, score, meta), me(), signIn(), signOut(), render(el), flush() }
// Сервер: tools/leaderboard.gs (Google Apps Script), URL в assets/js/leaderboard-config.js.
// Без URL всё работает локально: свои рекорды на этом устройстве.
// На странице: <div data-leaderboard="l05"></div> (урок: вкладки по играм + «Общий зачёт»)
//          или <div data-leaderboard="l05-compat"></div> (одна игра). data-compact="1": коротко, топ-5.
(function () {
  const K = { me: "lb-me", queue: "lb-queue", best: "lb-best", cache: "lb-cache:" };
  const URL_ = () => String(window.LEADERBOARD_URL || "").trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, val) { try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* без хранилища */ } }
  const changed = (why) => document.dispatchEvent(new CustomEvent("leaderboard:change", { detail: { why } }));

  // ---------- ученики и аватарки ----------
  function students() {
    const list = Array.isArray(window.STUDENTS) && window.STUDENTS.length ? window.STUDENTS : null;
    if (list) return list;
    const out = [];
    for (let i = 1; i <= 13; i++) {
      const id = "s" + String(i).padStart(2, "0");
      out.push({ id, nick: "Игрок " + i, sprite: id, color: `hsl(${(i * 47) % 360} 60% 55%)` });
    }
    return out;
  }
  const studentById = (id) => students().find((s) => s.id === id) || null;
  const svgCache = {};
  function spriteSVG(name) {
    if (svgCache[name] !== undefined) return svgCache[name];
    const P = window.Pixel;
    const sp = (window.HD_SPRITES && window.HD_SPRITES[name]) || (P && P.SPRITES && P.SPRITES[name]);
    if (!sp || !P || !P.PALETTE || !sp.rows) return (svgCache[name] = "");
    // У спрайтов сезона 2 свои цвета в sp.palette, они важнее общей палитры
    const pal = Object.assign({}, P.PALETTE, window.HD_PALETTE || {}, sp.palette || {});
    const rows = sp.rows.map((r) => (sp.mirror ? r + r.split("").reverse().join("") : r));
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
    let rects = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || !pal[ch]) continue;
        let run = 1;
        while (row[x + run] === ch) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pal[ch]}"/>`;
        x += run - 1;
      }
    });
    return (svgCache[name] = `<svg class="px" viewBox="0 0 ${w} ${h}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`);
  }
  function avatar(id, nick) {
    const st = studentById(id);
    const svg = st ? spriteSVG(st.sprite || st.id) : "";
    if (svg) return `<span class="lb-ava">${svg}</span>`;
    const name = (nick || (st && st.nick) || "?").trim();
    const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `<span class="lb-ava lb-ini" style="background:${(st && st.color) || "#3a4a42"}">${esc(ini)}</span>`;
  }

  // ---------- кто я ----------
  function meRaw() {
    const m = load(K.me, null);
    return m && m.id ? m : null;
  }
  // наружу без PIN
  function me() {
    const m = meRaw();
    return m ? { id: m.id, nick: m.nick, verified: !!m.verified, bad: !!m.bad, local: !!m.local } : null;
  }
  function signOut() { save(K.me, null); changed("signout"); }

  function post(body) {
    return fetch(URL_(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // простой запрос: без CORS-preflight
      body: JSON.stringify(body),
      redirect: "follow",
    }).then((r) => r.json());
  }

  let modal = null;
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  function signIn() {
    return new Promise((resolve) => {
      closeModal();
      const online = !!URL_();
      modal = document.createElement("div");
      modal.className = "ar-modal lb-modal";
      modal.innerHTML = `<div class="ar-modal-box" role="dialog" aria-modal="true" aria-label="Вход в рейтинг"><button class="ar-modal-x" type="button" data-x aria-label="Закрыть">×</button><div data-body></div></div>`;
      document.body.appendChild(modal);
      const body = modal.querySelector("[data-body]");
      let done = false;
      const finish = (v) => { if (done) return; done = true; closeModal(); changed("signin"); resolve(v); };
      modal.addEventListener("click", (e) => { if (e.target.closest("[data-x]") || e.target === modal) finish(me()); });
      modal.addEventListener("keydown", (e) => { if (e.key === "Escape") finish(me()); });

      function pickStep() {
        const cur = me();
        body.innerHTML = `<h3>Кто играет?</h3>
          <p class="muted">${online ? "Найди свой ник. Потом введи PIN из 4 цифр, его выдаёт учитель." : "Рейтинг класса учитель ещё не подключил. Выбери себя: рекорды сохранятся на этом устройстве."}</p>
          <div class="lb-pick">${students().map((s) => `<button type="button" class="lb-who${cur && cur.id === s.id ? " me" : ""}" data-id="${esc(s.id)}">${avatar(s.id, s.nick)}<span>${esc(s.nick)}</span></button>`).join("")}</div>
          ${cur ? `<p><button type="button" class="linkbtn" data-out>Выйти (${esc(cur.nick)})</button></p>` : ""}`;
        const first = body.querySelector(".lb-who");
        if (first) first.focus({ preventScroll: true });
      }
      function pinStep(st) {
        body.innerHTML = `<h3>${avatar(st.id, st.nick)} ${esc(st.nick)}</h3>
          <form class="lb-pin" autocomplete="off">
            <label>PIN из 4 цифр <input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required aria-label="PIN"></label>
            <div class="game-row"><button class="btn" type="submit">Войти</button><button class="btn ghost" type="button" data-back>Назад</button></div>
            <p class="err" aria-live="polite"></p>
          </form>`;
        const form = body.querySelector("form");
        const input = form.querySelector("input");
        const errEl = form.querySelector(".err");
        input.focus({ preventScroll: true });
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const pin = input.value.trim();
          if (!/^\d{4}$/.test(pin)) { errEl.textContent = "PIN это ровно 4 цифры"; return; }
          if (navigator.onLine === false) {
            save(K.me, { id: st.id, nick: st.nick, pin, verified: false });
            finish(me());
            return;
          }
          errEl.textContent = "Проверяю…";
          form.querySelector("button[type=submit]").disabled = true;
          post({ action: "whoami", id: st.id, pin }).then((res) => {
            form.querySelector("button[type=submit]").disabled = false;
            if (res && res.ok) {
              save(K.me, { id: st.id, nick: res.nick || st.nick, pin, verified: true });
              flush();
              finish(me());
            } else {
              errEl.textContent = res && res.error === "locked" ? "Слишком много неверных попыток. Подожди 10 минут." : res && res.error === "inactive" ? "Этот ник выключен учителем." : "Неверный PIN. Спроси у учителя.";
            }
          }).catch(() => {
            // нет связи: запомним, проверим при отправке
            save(K.me, { id: st.id, nick: st.nick, pin, verified: false });
            finish(me());
          });
        });
      }
      body.addEventListener("click", (e) => {
        if (e.target.closest("[data-out]")) { signOut(); finish(null); return; }
        if (e.target.closest("[data-back]")) { pickStep(); return; }
        const b = e.target.closest("[data-id]");
        if (!b) return;
        const st = studentById(b.dataset.id);
        if (!st) return;
        if (!online) { save(K.me, { id: st.id, nick: st.nick, pin: "", verified: false, local: true }); finish(me()); return; }
        pinStep(st);
      });
      pickStep();
    });
  }

  // ---------- очки и очередь ----------
  function bests() { return load(K.best, {}); }
  function queue() { return load(K.queue, []); }
  let flushing = false, retryTimer = 0;
  function schedule(ms) { clearTimeout(retryTimer); retryTimer = setTimeout(flush, ms); }

  function submit(gameId, score, meta) {
    meta = meta || {};
    score = Math.max(0, Math.round(Number(score) || 0));
    const b = bests();
    if (!b[gameId] || score > b[gameId].score) {
      b[gameId] = { score, level: meta.level || 0, time: meta.time || 0, at: new Date().toISOString() };
      save(K.best, b);
    }
    const m = me();
    if (m && URL_()) {
      const q = queue();
      q.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), sid: m.id, game: gameId, score, level: meta.level || 0, time: meta.time || 0, mistakes: meta.mistakes || 0, at: new Date().toISOString() });
      save(K.queue, q.slice(-50));
    }
    changed("submit");
    return flush();
  }

  function flush() {
    const m = meRaw();
    if (flushing || !URL_() || !m || !m.pin) return Promise.resolve(false);
    const mine = queue().filter((x) => x.sid === m.id);
    if (!mine.length) return Promise.resolve(true);
    if (navigator.onLine === false) return Promise.resolve(false);
    flushing = true;
    const batch = mine.slice(0, 10);
    const items = batch.map((x) => ({ game: x.game, score: x.score, level: x.level, time: x.time, mistakes: x.mistakes, at: x.at }));
    return post({ action: "submit", id: m.id, pin: m.pin, items })
      .then((res) => {
        res = res || {};
        if (res.ok || ["items", "game", "score"].includes(res.error)) {
          const ids = new Set(batch.map((x) => x.uid));
          save(K.queue, queue().filter((x) => !ids.has(x.uid)));
          if (res.ok && !m.verified) save(K.me, Object.assign({}, m, { verified: true, nick: res.nick || m.nick }));
          changed("sent");
          if (queue().some((x) => x.sid === m.id)) schedule(16000);
          return true;
        }
        if (res.error === "auth" || res.error === "inactive") {
          save(K.me, Object.assign({}, m, { pin: "", verified: false, bad: true }));
          changed("auth");
        } else if (res.error === "rate") schedule((res.retry || 15) * 1000 + 500);
        else if (res.error === "locked") schedule(600000);
        else schedule(60000);
        return false;
      })
      .catch(() => { schedule(60000); return false; })
      .finally(() => { flushing = false; });
  }
  window.addEventListener("online", () => flush());

  // ---------- виджет ----------
  function gamesFor(key) {
    const cfg = window.LEADERBOARD_GAMES || {};
    if (cfg[key]) return { lesson: key, games: cfg[key] };
    for (const l of Object.keys(cfg)) {
      const g = cfg[l].find((x) => x.id === key);
      if (g) return { lesson: null, games: [g] };
    }
    const A = window.Arena && window.Arena.data;
    if (A && A[key]) return { lesson: null, games: [{ id: key, title: A[key].title }] };
    if (A) {
      const ids = Object.keys(A).filter((id) => id.startsWith(key + "-"));
      if (ids.length) return { lesson: key, games: ids.map((id) => ({ id, title: A[id].title })) };
    }
    return { lesson: null, games: [{ id: key, title: key }] };
  }

  function localData(info) {
    const b = bests();
    const m = me();
    const id = m ? m.id : "";
    const nick = m ? m.nick : "Ты";
    const boards = {};
    let total = 0, n = 0;
    info.games.forEach((g) => {
      const x = b[g.id];
      boards[g.id] = x ? [{ id, nick, score: x.score, level: x.level }] : [];
      if (x) { total += x.score; n++; }
    });
    return { ok: true, local: true, boards, total: n ? [{ id, nick, score: total, games: n }] : [] };
  }

  function rowsFor(data, tab) {
    if (!data) return [];
    return (tab === "total" ? data.total : data.boards && data.boards[tab]) || [];
  }

  function rowsHTML(rows, compact, tab) {
    const m = me();
    if (!rows.length) return `<li class="lb-empty muted">Пока пусто. Сыграй первым!</li>`;
    let rank = 0, prev = null;
    const ranked = rows.map((r, i) => { if (r.score !== prev) { rank = i + 1; prev = r.score; } return Object.assign({ rank }, r); });
    let show = ranked;
    if (compact && ranked.length > 5) {
      show = ranked.slice(0, 5);
      const mine = m && ranked.find((r) => r.id === m.id);
      if (mine && mine.rank > 5) show = show.concat([{ gap: true }, mine]);
    }
    return show.map((r) => r.gap ? `<li class="lb-gap" aria-hidden="true">…</li>` : `
      <li class="lb-row${m && r.id && r.id === m.id ? " me" : ""}${r.rank <= 3 ? " top" + r.rank : ""}">
        <span class="lb-rank">${r.rank}</span>${avatar(r.id, r.nick)}<span class="lb-nick">${esc(r.nick || r.id)}${tab === "total" && r.games ? ` <i>игр: ${r.games}</i>` : ""}</span><b class="lb-score">${num(r.score)}</b>
      </li>`).join("");
  }

  function render(el) {
    if (!el) return;
    const key = el.dataset.leaderboard;
    if (!key) return;
    const info = gamesFor(key);
    const compact = el.dataset.compact === "1";
    const st = el._lb || (el._lb = { tab: info.lesson && !compact ? "total" : info.games[0].id, data: null, err: false, at: null, loading: false });
    const url = URL_();
    if (!url) st.data = localData(info);
    else if (!st.data) { const c = load(K.cache + key, null); if (c) { st.data = c.data; st.at = c.at; } }
    draw(el, info, st, compact);
    if (url && !st.loading && (!st.fresh || Date.now() - st.fresh > 30000)) refresh(el);
  }

  function draw(el, info, st, compact) {
    const m = me();
    const url = URL_();
    const tabs = [];
    if (info.lesson && !compact) tabs.push({ id: "total", title: "Общий зачёт" });
    if (!compact) info.games.forEach((g) => tabs.push(g));
    const pending = m ? queue().filter((x) => x.sid === m.id).length : 0;
    let note = "";
    if (!url) note = "Учитель ещё не подключил рейтинг класса. Здесь твои рекорды на этом устройстве.";
    else if (st.loading && !st.data) note = "Загружаю рейтинг…";
    else if (st.err) note = `Нет связи с рейтингом${st.at ? `, показаны данные от ${new Date(st.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""}.`;
    else if (st.at) note = `Обновлено в ${new Date(st.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.`;
    if (pending) note += ` Ждут отправки: ${pending}.`;
    if (m && m.bad) note += " PIN не подошёл, войди заново.";
    const title = compact ? `Рейтинг: ${esc(info.games[0].title)}` : "Рейтинг класса";
    el.innerHTML = `
      <div class="lb${compact ? " compact" : ""}">
        <div class="lb-head">
          <b class="lb-title">${title}</b>
          <span class="lb-meline">${m ? `${avatar(m.id, m.nick)}<span>${esc(m.nick)}</span> <button type="button" class="linkbtn" data-lb="signin">сменить</button>` : `<button type="button" class="btn ghost lb-in" data-lb="signin">Войти</button>`}</span>
          <button type="button" class="lb-refresh" data-lb="refresh" aria-label="Обновить рейтинг" title="Обновить">⟳</button>
        </div>
        ${tabs.length > 1 ? `<div class="lb-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="lb-tab" data-tab="${t.id}" aria-selected="${t.id === st.tab}">${esc(t.title)}</button>`).join("")}</div>` : ""}
        <ol class="lb-list">${rowsHTML(rowsFor(st.data, st.tab), compact, st.tab)}</ol>
        <p class="lb-note muted">${note}</p>
      </div>`;
  }

  function refresh(el) {
    const st = el._lb;
    const key = el.dataset.leaderboard;
    const info = gamesFor(key);
    const url = URL_();
    if (!url) { render(el); return; }
    st.loading = true;
    const q = info.lesson ? "lesson=" + encodeURIComponent(info.lesson) : "game=" + encodeURIComponent(info.games[0].id);
    fetch(url + (url.includes("?") ? "&" : "?") + q, { redirect: "follow" })
      .then((r) => r.json())
      .then((res) => {
        if (!res || !res.ok) throw new Error((res && res.error) || "bad");
        st.data = res; st.err = false; st.at = Date.now(); st.fresh = Date.now();
        save(K.cache + key, { data: res, at: st.at });
      })
      .catch(() => { st.err = true; st.fresh = Date.now(); })
      .finally(() => { st.loading = false; if (el.isConnected) draw(el, info, st, el.dataset.compact === "1"); });
  }

  document.addEventListener("click", (e) => {
    const box = e.target.closest("[data-leaderboard]");
    if (!box || !box._lb) return;
    const a = e.target.closest("[data-lb]");
    const t = e.target.closest("[data-tab]");
    if (t && box.contains(t)) { box._lb.tab = t.dataset.tab; draw(box, gamesFor(box.dataset.leaderboard), box._lb, box.dataset.compact === "1"); return; }
    if (!a) return;
    if (a.dataset.lb === "signin") signIn();
    else if (a.dataset.lb === "refresh") { box._lb.fresh = 0; refresh(box); flush(); }
  });

  function renderAll() {
    document.querySelectorAll("[data-leaderboard]").forEach((el) => {
      if (el._lb && URL_()) { el._lb.fresh = 0; }
      render(el);
    });
  }
  document.addEventListener("leaderboard:change", (e) => {
    const why = e.detail && e.detail.why;
    // после отправки обновим с сервера, иначе просто перерисуем
    document.querySelectorAll("[data-leaderboard]").forEach((el) => {
      if (!el._lb) return render(el);
      if (why === "sent") el._lb.fresh = 0;
      if (URL_()) { const info = gamesFor(el.dataset.leaderboard); draw(el, info, el._lb, el.dataset.compact === "1"); if (!el._lb.fresh) refresh(el); }
      else render(el);
    });
  });
  document.addEventListener("DOMContentLoaded", () => { renderAll(); flush(); });

  window.Leaderboard = { submit, me, signIn, signOut, render, flush, _avatar: avatar };
})();
