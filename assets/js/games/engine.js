// Движок мини-игр. Каждый тип игры (викторина, пары, сортировка, биты) подключается сюда.
// На странице: <div class="minigame" data-config="l03-match"></div>
// Данные игр лежат в assets/js/content/lessonNN.js в window.MiniGame.data.
(function () {
  const MiniGame = (window.MiniGame = window.MiniGame || { types: {}, data: {} });
  MiniGame.types = MiniGame.types || {};
  MiniGame.data = MiniGame.data || {};

  // ---------- помощники для случайных заданий ----------
  const U = (MiniGame.util = {
    rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    sample(arr, n) { return U.shuffle(arr).slice(0, n); },
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
  });

  function bestKey(id) { return "best-" + id; }
  function getBest(id) { try { return Number(localStorage.getItem(bestKey(id))) || 0; } catch (e) { return 0; } }
  function setBest(id, v) { try { if (v > getBest(id)) localStorage.setItem(bestKey(id), String(v)); } catch (e) { /* без хранилища */ } }

  const GIF = (name) => (document.documentElement.dataset.root || "./") + "assets/gif/" + name + ".gif";

  function Game(el) {
    const id = el.dataset.config;
    const cfg = MiniGame.data[id];
    if (!cfg) { el.innerHTML = `<p class="muted">Игра «${U.esc(id)}» не найдена.</p>`; return; }
    const type = MiniGame.types[cfg.type];
    const LIVES = cfg.lives || 5;
    let s = null;

    function intro() {
      stopTimer();
      el.innerHTML = `
        <div class="game-intro">
          <div class="game-intro-head">
            <img class="gif" src="${GIF(cfg.gif || "wave")}" alt="" width="96" height="96">
            <div>
              <span class="block-label game">Мини-игра</span>
              <h3>${cfg.title}</h3>
            </div>
          </div>
          <p>${cfg.intro}</p>
          <p class="muted mono">Раундов: ${cfg.rounds} · жизней: ${LIVES} · на раунд: ${cfg.time || 60} с · рекорд: ${getBest(id)}</p>
          <button class="btn" data-act="start">Играть</button>
        </div>`;
    }

    function start() {
      s = { i: 0, lives: LIVES, score: 0, mistakes: [], streak: 0, roundMistakes: 0 };
      s.rounds = type.makeRounds(cfg);
      showRound();
    }

    function stopTimer() { if (s && s.timer) clearInterval(s.timer); }

    function showRound() {
      stopTimer();
      const r = s.rounds[s.i];
      s.roundMistakes = 0;
      s.locked = false;
      s.total = s.left = r.time || cfg.time || 60;
      el.innerHTML = `
        <div class="game-hud">
          <span>Раунд <b>${s.i + 1}/${s.rounds.length}</b></span>
          <span>Очки <b data-score>${s.score}</b></span>
          <span class="lives" data-lives aria-label="Жизни">${hearts()}</span>
        </div>
        <div class="game-task">${r.prompt}</div>
        <div class="game-timer"><i style="width:100%"></i></div>
        <div class="game-body"></div>
        <div class="game-msg" aria-live="polite"></div>`;
      type.mount(el.querySelector(".game-body"), r, makeApi(s.i), cfg);
      s.timer = setInterval(tick, 1000);
    }

    function hearts() { return "♥".repeat(Math.max(s.lives, 0)) + "♡".repeat(LIVES - Math.max(s.lives, 0)); }

    function tick() {
      s.left--;
      const bar = el.querySelector(".game-timer i");
      if (bar) {
        bar.style.width = (100 * s.left / s.total) + "%";
        bar.classList.toggle("low", s.left <= 10);
      }
      if (s.left <= 0) {
        stopTimer();
        const r = s.rounds[s.i];
        const api = makeApi(s.i);
        api.mistake({ what: r.what || stripTags(r.prompt), yours: "время вышло", right: r.right, why: r.why });
        api.done(false);
      }
    }

    function stripTags(h) { return String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

    function msg(text, ok) {
      const m = el.querySelector(".game-msg");
      if (!m) return;
      m.className = "game-msg " + (ok ? "ok" : "bad");
      m.textContent = text;
    }

    // То, что вызывает тип игры. Вызовы от старого раунда игнорируются.
    function makeApi(idx) {
      const live = () => s && !s.over && s.i === idx;
      return {
        mistake(info) { if (live()) api.mistake(info); },
        good(text) { if (live()) api.good(text); },
        done(ok) { if (live()) api.done(ok); },
      };
    }
    const api = {
      // ошибка: минус жизнь, запись в разбор
      mistake(info) {
        s.lives--;
        s.streak = 0;
        s.roundMistakes++;
        s.mistakes.push(info);
        const l = el.querySelector("[data-lives]");
        if (l) l.textContent = hearts();
        msg(info.right ? `Мимо. Правильно: ${stripTags(info.right)}` : "Мимо", false);
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 350);
        if (s.lives <= 0) { stopTimer(); s.over = true; setTimeout(() => finish(false), 1400); }
      },
      // маленький успех внутри раунда (например, верная пара)
      good(text) { msg(text || "Верно!", true); },
      // раунд закончен
      done(ok) {
        if (s.locked) return;
        s.locked = true;
        stopTimer();
        if (s.lives <= 0) return;
        if (ok && s.roundMistakes === 0) {
          s.streak++;
          const gain = 10 + Math.round(s.left / 2) + Math.min(s.streak, 5) * 4;
          s.score += gain;
          msg(`Верно! +${gain}${s.streak >= 3 ? ` · серия ${s.streak}` : ""}`, true);
          el.querySelector(".game-task")?.classList.add("pop");
        } else if (ok) {
          s.score += 5;
        }
        el.querySelectorAll(".game-body button, .game-body input").forEach((b) => (b.disabled = true));
        setTimeout(next, ok && s.roundMistakes === 0 ? 1000 : 2200);
      },
    };

    function next() {
      s.i++;
      if (s.i >= s.rounds.length) finish(true);
      else showRound();
    }

    function finish(won) {
      stopTimer();
      s.over = true;
      setBest(id, s.score);
      const review = s.mistakes.map((m) => `
        <li>${m.what ? `${m.what}: ` : ""}твой ответ <span class="yours">${m.yours}</span>, правильно <span class="right">${m.right}</span>.
        ${m.why ? `<span class="muted">${m.why}</span>` : ""}</li>`).join("");
      el.innerHTML = `
        <div class="game-intro">
          <div class="game-intro-head">
            <img class="gif" src="${GIF(won ? "party" : "sad")}" alt="" width="96" height="96">
            <div>
              <span class="block-label game">${won ? "Победа" : "Игра окончена"}</span>
              <h3>${won ? "Все раунды пройдены!" : "Жизни закончились"}</h3>
            </div>
          </div>
          <p class="mono">Очки: <b>${s.score}</b> · рекорд: ${getBest(id)} · ошибок: ${s.mistakes.length}</p>
          ${review ? `<p><b>Разбор ошибок</b></p><ol class="review">${review}</ol>` : `<p>Ни одной ошибки. Бит доволен.</p>`}
          <div class="game-row"><button class="btn" data-act="start">Ещё раз, новые задания</button></div>
        </div>`;
      // страница урока ловит это событие и открывает следующую часть
      if (won) el.dispatchEvent(new CustomEvent("minigame:won", { bubbles: true, detail: { id, score: s.score } }));
    }

    el.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (act && act.dataset.act === "start") start();
    });

    intro();
  }

  MiniGame.start = Game;
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".minigame[data-config]").forEach(Game);
  });
})();
