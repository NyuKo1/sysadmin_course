// Типы мини-игр: викторина, пары, сортировка, биты.
(function () {
  const MG = window.MiniGame;
  const U = MG.util;

  // ---------- Викторина: вопрос и 4 варианта ----------
  // cfg.pool: [{ q, a, wrong: [...], why }], cfg.gen: [() => ({ q, a, wrong, why })]
  MG.types.quiz = {
    makeRounds(cfg) {
      const n = cfg.rounds;
      const gens = cfg.gen || [];
      const fromGen = gens.length ? Math.min(n, Math.round(n * (cfg.genShare || 0.4))) : 0;
      const items = U.sample(cfg.pool || [], n - fromGen);
      for (let i = 0; i < fromGen || items.length < n; i++) items.push(U.pick(gens)());
      return U.shuffle(items).slice(0, n).map((it) => ({
        prompt: it.q,
        what: it.q,
        right: it.a,
        why: it.why || "",
        options: U.shuffle([it.a, ...U.sample([...new Set(it.wrong.map(String))].filter((w) => w !== String(it.a)), 3)]),
      }));
    },
    mount(root, r, api) {
      root.innerHTML = `<div class="choices">${r.options.map((o) => `<button class="choice">${o}</button>`).join("")}</div>`;
      root.addEventListener("click", (e) => {
        const b = e.target.closest(".choice");
        if (!b || b.disabled) return;
        const ok = b.innerHTML === r.right;
        root.querySelectorAll(".choice").forEach((c) => {
          c.disabled = true;
          if (c.innerHTML === r.right) c.classList.add("right");
        });
        if (!ok) {
          b.classList.add("wrong");
          api.mistake({ what: r.what, yours: b.innerHTML, right: r.right, why: r.why });
        }
        api.done(ok);
      });
    },
  };

  // ---------- Пары: соедини левое с правым ----------
  // cfg.pairs: [[левое, правое, почему]], cfg.perRound: сколько пар в раунде
  MG.types.match = {
    makeRounds(cfg) {
      const per = cfg.perRound || 4;
      const rounds = [];
      let bag = U.shuffle(cfg.pairs);
      for (let i = 0; i < cfg.rounds; i++) {
        if (bag.length < per) bag = U.shuffle(cfg.pairs);
        const pairs = bag.splice(0, per);
        rounds.push({
          prompt: cfg.prompt || "Соедини пары: нажми слева, потом справа",
          what: "пары",
          right: pairs.map((p) => `${p[0]} → ${p[1]}`).join("; "),
          pairs,
          time: cfg.time,
        });
      }
      return rounds;
    },
    mount(root, r, api) {
      const left = U.shuffle(r.pairs.map((p, i) => ({ t: p[0], i })));
      const right = U.shuffle(r.pairs.map((p, i) => ({ t: p[1], i })));
      root.innerHTML = `
        <div class="match">
          <div class="col">${left.map((x) => `<button class="choice" data-side="l" data-i="${x.i}">${x.t}</button>`).join("")}</div>
          <div class="col">${right.map((x) => `<button class="choice" data-side="r" data-i="${x.i}">${x.t}</button>`).join("")}</div>
        </div>`;
      let sel = null;
      let left2 = r.pairs.length;
      root.addEventListener("click", (e) => {
        const b = e.target.closest(".choice");
        if (!b || b.disabled) return;
        if (!sel || sel.dataset.side === b.dataset.side) {
          if (sel) sel.classList.remove("sel");
          sel = b;
          b.classList.add("sel");
          return;
        }
        const a = sel;
        sel = null;
        a.classList.remove("sel");
        const l = a.dataset.side === "l" ? a : b;
        const rr = a.dataset.side === "l" ? b : a;
        if (l.dataset.i === rr.dataset.i) {
          [l, rr].forEach((x) => { x.disabled = true; x.classList.add("right"); });
          left2--;
          api.good(left2 ? "Пара найдена!" : "");
          if (!left2) api.done(true);
        } else {
          const p = r.pairs[Number(l.dataset.i)];
          rr.classList.add("wrong");
          setTimeout(() => rr.classList.remove("wrong"), 600);
          api.mistake({ what: p[0], yours: rr.innerHTML, right: p[1], why: p[2] || "" });
        }
      });
    },
  };

  // ---------- Сортировка: разложи по корзинам ----------
  // cfg.buckets: ["Кэш", "RAM", "Диск"], cfg.items: [[текст, номер корзины, почему]]
  MG.types.sort = {
    makeRounds(cfg) {
      const per = cfg.perRound || 5;
      const rounds = [];
      let bag = U.shuffle(cfg.items);
      for (let i = 0; i < cfg.rounds; i++) {
        if (bag.length < per) bag = U.shuffle(cfg.items);
        const items = bag.splice(0, per);
        rounds.push({
          prompt: cfg.prompt || "Куда это относится?",
          what: "сортировка",
          right: items.map((it) => `${it[0]} → ${cfg.buckets[it[1]]}`).join("; "),
          items,
          time: cfg.time,
        });
      }
      return rounds;
    },
    mount(root, r, api, cfg) {
      let k = 0;
      function show() {
        const it = r.items[k];
        root.innerHTML = `
          <div class="sort-card"><span class="muted mono">${k + 1}/${r.items.length}</span><div>${it[0]}</div></div>
          <div class="choices buckets">${cfg.buckets.map((b, i) => `<button class="choice" data-b="${i}">${b}</button>`).join("")}</div>`;
      }
      show();
      root.addEventListener("click", (e) => {
        const b = e.target.closest(".choice");
        if (!b || b.disabled) return;
        const it = r.items[k];
        const ok = Number(b.dataset.b) === it[1];
        root.querySelectorAll(".choice").forEach((c) => {
          c.disabled = true;
          if (Number(c.dataset.b) === it[1]) c.classList.add("right");
        });
        if (ok) api.good(it[2] ? "Верно! " + it[2] : "Верно!");
        else {
          b.classList.add("wrong");
          api.mistake({ what: it[0], yours: b.innerHTML, right: cfg.buckets[it[1]], why: it[2] || "" });
        }
        k++;
        setTimeout(() => {
          if (k >= r.items.length) api.done(true);
          else if (root.isConnected) show();
        }, ok ? 700 : 1600);
      });
    },
  };

  // ---------- Биты ----------
  // cfg.levels: [{ bits, count, kinds: ["toBits","toDec","toHex","hexToBits"], hints }]
  const bin = (n, b) => n.toString(2).padStart(b, "0");
  const hex = (n) => n.toString(16).toUpperCase().padStart(2, "0");
  function explain(n, bits) {
    const parts = [];
    for (let i = bits - 1; i >= 0; i--) if (n & (1 << i)) parts.push(1 << i);
    return parts.length ? parts.join(" + ") + " = " + n : "0";
  }
  function near(n, max) {
    const set = new Set([n]);
    const tries = [n + 1, n - 1, n + 2, n - 2, n ^ 1, n ^ 2, n ^ 4, n ^ 8, n + 8, n - 8];
    for (const t of U.shuffle(tries)) if (t >= 0 && t <= max && set.size < 4) set.add(t);
    while (set.size < 4) set.add(U.rand(0, max));
    return [...set];
  }

  MG.types.bits = {
    makeRounds(cfg) {
      const rounds = [];
      const used = new Set();
      cfg.levels.forEach((lvl) => {
        for (let i = 0; i < lvl.count; i++) {
          const kind = U.pick(lvl.kinds);
          const max = (1 << lvl.bits) - 1;
          let n;
          let guard = 0;
          do { n = U.rand(1, max); } while (used.has(kind + n) && guard++ < 50);
          used.add(kind + n);
          const r = { kind, n, bits: lvl.bits, hints: lvl.hints, time: lvl.time || cfg.time };
          if (kind === "toBits") { r.prompt = `Включи биты для числа <span class="target">${n}</span>`; r.right = bin(n, r.bits); r.why = explain(n, r.bits); r.what = `число ${n}`; }
          if (kind === "toDec") { r.prompt = `Какое число записано? <span class="target">${bin(n, r.bits)}</span>`; r.right = String(n); r.why = explain(n, r.bits); r.what = `код ${bin(n, r.bits)}`; r.options = U.shuffle(near(n, max).map(String)); }
          if (kind === "toHex") { r.bits = 8; r.prompt = `Как это записать в HEX? <span class="target">${bin(n, 8).slice(0, 4)} ${bin(n, 8).slice(4)}</span>`; r.right = hex(n); r.why = `${bin(n, 8).slice(0, 4)} = ${(n >> 4).toString(16).toUpperCase()}, ${bin(n, 8).slice(4)} = ${(n & 15).toString(16).toUpperCase()}`; r.what = `код ${bin(n, 8)}`; r.options = U.shuffle(near(n, 255).map(hex)); }
          if (kind === "hexToBits") { r.bits = 8; r.prompt = `Включи биты для HEX <span class="target">${hex(n)}</span>`; r.right = bin(n, 8); r.why = `${hex(n)[0]} = ${bin(n >> 4, 4)}, ${hex(n)[1]} = ${bin(n & 15, 4)}`; r.what = `HEX ${hex(n)}`; }
          rounds.push(r);
        }
      });
      return rounds;
    },
    mount(root, r, api) {
      if (r.options) {
        MG.types.quiz.mount(root, r, api);
        return;
      }
      const w = (i) => 1 << (r.bits - 1 - i);
      const showWeights = r.hints !== false;
      root.innerHTML = `
        <div class="bits" style="--n:${r.bits}">
          ${Array.from({ length: r.bits }, (_, i) => `<button class="bit" aria-pressed="false" data-w="${w(i)}" aria-label="бит ${w(i)}">0</button>`).join("")}
        </div>
        <div class="bit-weights" style="--n:${r.bits}">${Array.from({ length: r.bits }, (_, i) => `<span>${showWeights ? w(i) : "?"}</span>`).join("")}</div>
        <div class="game-row">
          <button class="btn" data-check>Проверить</button>
          <span class="readout mono" ${showWeights ? "" : 'style="visibility:hidden"'}>= <b data-sum>0</b></span>
        </div>`;
      const sum = () => [...root.querySelectorAll(".bit")].reduce((a, b) => a + (b.getAttribute("aria-pressed") === "true" ? Number(b.dataset.w) : 0), 0);
      root.addEventListener("click", (e) => {
        const bit = e.target.closest(".bit");
        if (bit && !bit.disabled) {
          const on = bit.getAttribute("aria-pressed") !== "true";
          bit.setAttribute("aria-pressed", String(on));
          bit.textContent = on ? "1" : "0";
          root.querySelector("[data-sum]").textContent = sum();
          return;
        }
        if (e.target.closest("[data-check]")) {
          const v = sum();
          if (v === r.n) api.done(true);
          else {
            api.mistake({ what: r.what, yours: bin(v, r.bits), right: r.right, why: r.why });
            api.done(false);
          }
        }
      });
    },
  };
})();
