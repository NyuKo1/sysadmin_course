// Мини-игра «Биты». У каждого игрока свои случайные задания.
// <div class="minigame" data-game="bits" data-mode="toBits|toDec|boss"></div>
(function () {
  const MODES = {
    toBits: {
      title: "Включи биты",
      intro: "Компьютер называет число, а ты включаешь нужные биты. С каждым уровнем битов больше, а времени меньше.",
      levels: [
        { bits: 4, tasks: 5, time: 30 },
        { bits: 6, tasks: 5, time: 30 },
        { bits: 8, tasks: 6, time: 25 },
        { bits: 8, tasks: 6, time: 15 },
      ],
      kinds: ["toBits"],
    },
    toDec: {
      title: "Расшифруй сигнал",
      intro: "Бит поймал сигнал из нулей и единиц. Переведи его в обычное число, пока сигнал не пропал.",
      levels: [
        { bits: 4, tasks: 5, time: 30 },
        { bits: 6, tasks: 5, time: 30 },
        { bits: 8, tasks: 6, time: 30 },
        { bits: 8, tasks: 6, time: 18 },
      ],
      kinds: ["toDec"],
    },
    boss: {
      title: "Босс урока: Сломанный байт",
      intro: "Задания вперемешку: двоичный код, обычные числа и шестнадцатеричный код. Три ошибки, и босс победил.",
      levels: [
        { bits: 8, tasks: 6, time: 30 },
        { bits: 8, tasks: 6, time: 25 },
        { bits: 8, tasks: 8, time: 20 },
      ],
      kinds: ["toBits", "toDec", "toHex", "hexToBits"],
    },
  };

  const LIVES = 3;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];
  const bin = (n, bits) => n.toString(2).padStart(bits, "0");
  const hex = (n) => n.toString(16).toUpperCase().padStart(2, "0");

  function explain(n, bits) {
    const parts = [];
    for (let i = bits - 1; i >= 0; i--) if (n & (1 << i)) parts.push(1 << i);
    return parts.length ? parts.join(" + ") + " = " + n : "все биты выключены = 0";
  }

  function makeTask(kind, bits, used) {
    let n;
    // не повторяем числа внутри одной игры и не даём слишком простые
    do { n = rand(bits >= 6 ? 3 : 1, (1 << bits) - 1); } while (used.has(kind + n) && used.size < (1 << bits) - 2);
    used.add(kind + n);
    return { kind, n, bits };
  }

  function Game(el) {
    const mode = MODES[el.dataset.mode] || MODES.toBits;
    const bestKey = "best-bits-" + (el.dataset.mode || "toBits");
    let state;

    function bestScore() {
      try { return Number(localStorage.getItem(bestKey)) || 0; } catch (e) { return 0; }
    }
    function saveBest(v) {
      try { if (v > bestScore()) localStorage.setItem(bestKey, String(v)); } catch (e) { /* без хранилища */ }
    }

    function intro() {
      clearInterval(state && state.timer);
      el.innerHTML = `
        <div class="game-intro">
          <span class="block-label game">Мини-игра</span>
          <h3>${mode.title}</h3>
          <p>${mode.intro}</p>
          <p class="muted mono">Уровней: ${mode.levels.length} · жизней: ${LIVES} · рекорд: ${bestScore()}</p>
          <button class="btn" data-act="start">Играть</button>
        </div>`;
    }

    function start() {
      state = { level: 0, taskIndex: 0, lives: LIVES, score: 0, used: new Set(), mistakes: [], streak: 0 };
      nextTask();
    }

    function nextTask() {
      const lvl = mode.levels[state.level];
      state.task = makeTask(pick(mode.kinds), lvl.bits, state.used);
      state.left = lvl.time;
      state.total = lvl.time;
      render();
      clearInterval(state.timer);
      state.timer = setInterval(tick, 1000);
    }

    function tick() {
      state.left--;
      const bar = el.querySelector(".game-timer i");
      if (bar) {
        bar.style.width = (100 * state.left / state.total) + "%";
        bar.classList.toggle("low", state.left <= 5);
      }
      if (state.left <= 0) answer(null);
    }

    function taskText(t) {
      switch (t.kind) {
        case "toBits": return `Включи биты для числа <span class="target">${t.n}</span>`;
        case "toDec": return `Какое это число? <span class="target">${bin(t.n, t.bits)}</span>`;
        case "toHex": return `Запиши в шестнадцатеричном виде <span class="target">${bin(t.n, 8)}</span>`;
        case "hexToBits": return `Включи биты для HEX-кода <span class="target">${hex(t.n)}</span>`;
      }
    }

    function render() {
      const t = state.task;
      const lvl = mode.levels[state.level];
      const usesBits = t.kind === "toBits" || t.kind === "hexToBits";
      const bitsHtml = usesBits ? `
        <div class="bits" style="--n:${t.bits}">
          ${Array.from({ length: t.bits }, (_, i) => `<button class="bit" aria-pressed="false" data-w="${1 << (t.bits - 1 - i)}" aria-label="бит ${1 << (t.bits - 1 - i)}">0</button>`).join("")}
        </div>
        <div class="bit-weights" style="--n:${t.bits}">
          ${state.level === 0
            ? Array.from({ length: t.bits }, (_, i) => `<span>${1 << (t.bits - 1 - i)}</span>`).join("")
            : Array.from({ length: t.bits }, () => `<span>?</span>`).join("")}
        </div>` : `
        <div class="game-row">
          <input type="text" inputmode="${t.kind === "toHex" ? "text" : "numeric"}" autocomplete="off" autocapitalize="characters" aria-label="Ответ" placeholder="${t.kind === "toHex" ? "например 1F" : "число"}">
        </div>`;

      el.innerHTML = `
        <div class="game-hud">
          <span>Уровень <b>${state.level + 1}/${mode.levels.length}</b></span>
          <span>Задание <b>${state.taskIndex + 1}/${lvl.tasks}</b></span>
          <span>Очки <b>${state.score}</b></span>
          <span class="lives" aria-label="Жизни: ${state.lives}">${"♥".repeat(state.lives)}${"♡".repeat(LIVES - state.lives)}</span>
        </div>
        <div class="game-task">${taskText(t)}</div>
        <div class="game-timer"><i style="width:100%"></i></div>
        ${bitsHtml}
        <div class="game-row">
          <button class="btn" data-act="check">Проверить</button>
          ${usesBits ? `<span class="readout mono" aria-live="polite">= <b data-sum>0</b></span>` : ""}
        </div>
        <div class="game-msg" aria-live="polite"></div>`;

      // На первом уровне сумма видна сразу, дальше считать придётся в уме
      const showSum = state.level === 0;
      const sumEl = el.querySelector("[data-sum]");
      if (sumEl && !showSum) sumEl.parentElement.style.visibility = "hidden";
      const input = el.querySelector("input");
      if (input) {
        input.focus({ preventScroll: true });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      }
    }

    function currentBits() {
      let v = 0;
      el.querySelectorAll(".bit").forEach((b) => { if (b.getAttribute("aria-pressed") === "true") v += Number(b.dataset.w); });
      return v;
    }

    function check() {
      const t = state.task;
      let given;
      if (t.kind === "toBits" || t.kind === "hexToBits") given = currentBits();
      else {
        const raw = (el.querySelector("input").value || "").trim().toUpperCase().replace(/^0X/, "");
        if (!raw) return;
        given = t.kind === "toHex" ? parseInt(raw, 16) : parseInt(raw, 10);
        if (Number.isNaN(given)) given = -1;
      }
      answer(given);
    }

    function formatAnswer(t, v) {
      if (v === null) return "время вышло";
      if (t.kind === "toHex") return v < 0 ? "?" : hex(v);
      if (t.kind === "toDec") return v < 0 ? "?" : String(v);
      return bin(v, t.bits);
    }

    function answer(given) {
      clearInterval(state.timer);
      const t = state.task;
      const ok = given === t.n;
      const msg = el.querySelector(".game-msg");
      const box = el.querySelector(".game-task");
      if (ok) {
        state.streak++;
        const gain = 10 + state.left * 2 + Math.min(state.streak, 5) * 5;
        state.score += gain;
        msg.className = "game-msg ok";
        msg.textContent = `Верно! +${gain}${state.streak >= 3 ? ` · серия ${state.streak}` : ""}`;
        box.classList.add("pop");
      } else {
        state.streak = 0;
        state.lives--;
        state.mistakes.push({ t, given });
        msg.className = "game-msg bad";
        msg.textContent = `Мимо. Правильно: ${formatAnswer(t, t.n)}`;
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 350);
      }
      el.querySelectorAll("button, input").forEach((b) => (b.disabled = true));
      setTimeout(advance, ok ? 900 : 1800);
    }

    function advance() {
      if (state.lives <= 0) return finish(false);
      const lvl = mode.levels[state.level];
      state.taskIndex++;
      if (state.taskIndex >= lvl.tasks) {
        state.level++;
        state.taskIndex = 0;
        if (state.level >= mode.levels.length) return finish(true);
      }
      nextTask();
    }

    function finish(won) {
      clearInterval(state.timer);
      saveBest(state.score);
      const review = state.mistakes.map(({ t, given }) => {
        let what = t.kind === "toBits" ? `число ${t.n}` :
          t.kind === "toDec" ? `код ${bin(t.n, t.bits)}` :
          t.kind === "toHex" ? `код ${bin(t.n, 8)} в HEX` : `HEX ${hex(t.n)}`;
        const why = t.kind === "toHex" || t.kind === "hexToBits"
          ? `${bin(t.n, 8).slice(0, 4)} = ${(t.n >> 4).toString(16).toUpperCase()}, ${bin(t.n, 8).slice(4)} = ${(t.n & 15).toString(16).toUpperCase()}`
          : explain(t.n, t.bits);
        return `<li>${what}: твой ответ <span class="yours">${formatAnswer(t, given)}</span>, правильно <span class="right">${formatAnswer(t, t.n)}</span>. <span class="muted">${why}</span></li>`;
      }).join("");
      el.innerHTML = `
        <div class="game-intro">
          <span class="block-label game">${won ? "Победа" : "Игра окончена"}</span>
          <h3>${won ? "Все уровни пройдены!" : "Жизни закончились"}</h3>
          <p class="mono">Очки: <b>${state.score}</b> · рекорд: ${bestScore()} · ошибок: ${state.mistakes.length}</p>
          ${review ? `<p><b>Разбор ошибок</b></p><ol class="review">${review}</ol>` : `<p>Ни одной ошибки. Бит доволен.</p>`}
          <div class="game-row">
            <button class="btn" data-act="start">Ещё раз, новые задания</button>
          </div>
        </div>`;
    }

    el.addEventListener("click", (e) => {
      const bit = e.target.closest(".bit");
      if (bit && !bit.disabled) {
        const on = bit.getAttribute("aria-pressed") !== "true";
        bit.setAttribute("aria-pressed", String(on));
        bit.textContent = on ? "1" : "0";
        const sum = el.querySelector("[data-sum]");
        if (sum) sum.textContent = currentBits();
        return;
      }
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "start") start();
      if (act.dataset.act === "check") check();
    });

    intro();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-game="bits"]').forEach(Game);
  });
})();
