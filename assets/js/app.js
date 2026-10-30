// Общее для всех страниц: офлайн-режим и карта курса.
(function () {
  // Корень сайта относительно текущей страницы (страницы уроков лежат в lessons/)
  const ROOT = document.documentElement.dataset.root || "./";

  // ---------- офлайн ----------
  function setOfflineStatus(text, on) {
    document.querySelectorAll("[data-offline-status]").forEach((el) => {
      el.innerHTML = `<span class="status-dot${on ? " on" : ""}"></span>${text}`;
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(ROOT + "sw.js").then((reg) => {
      if (navigator.serviceWorker.controller) {
        setOfflineStatus("Сайт сохранён на устройстве и работает без интернета", true);
      }
      reg.addEventListener("updatefound", () => {
        setOfflineStatus("Сохраняю сайт на устройство…", false);
      });
    }).catch(() => setOfflineStatus("Браузер не дал сохранить сайт", false));

    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data && e.data.type === "cached") {
        setOfflineStatus("Готово: сайт работает без интернета", true);
      }
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      setOfflineStatus("Сайт сохранён на устройстве и работает без интернета", true);
    });
  } else {
    setOfflineStatus("Этот браузер не умеет сохранять сайты офлайн", false);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-save-offline]");
    if (!btn || !navigator.serviceWorker) return;
    setOfflineStatus("Сохраняю сайт на устройство…", false);
    navigator.serviceWorker.ready.then((reg) => {
      reg.active && reg.active.postMessage({ type: "cache-all" });
    });
  });

  // ---------- установка на главный экран ----------
  // Chrome и Android дают событие beforeinstallprompt и сами показывают окно установки.
  // Safari на iPhone так не умеет, там показываем, куда нажать.
  let installEvent = null;
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function laterUntil() { try { return Number(localStorage.getItem("install-later")) || 0; } catch (e) { return 0; } }

  function installHow() {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const share = `<svg class="ios-share" viewBox="0 0 24 24" aria-label="Поделиться"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8"/></svg>`;
    if (installEvent) return "";
    if (ios) return `<ol><li>Нажми ${share} «Поделиться» внизу экрана Safari (или в меню браузера).</li><li>Выбери «На экран "Домой"».</li><li>Нажми «Добавить». Иконка с котом появится среди приложений.</li></ol>`;
    if (/Android/.test(ua)) return `<ol><li>Открой меню браузера (три точки ⋮ вверху справа).</li><li>Выбери «Установить приложение» или «Добавить на главный экран».</li><li>Подтверди. Иконка с котом появится среди приложений.</li></ol>`;
    return `<ol><li>В Chrome или Edge нажми значок установки в адресной строке (монитор со стрелкой) или меню ⋮.</li><li>Выбери «Установить Памятьвиль».</li></ol>`;
  }

  function renderInstall(force) {
    const box = document.getElementById("install");
    if (!box) return;
    if (standalone() || (!force && laterUntil() > Date.now())) { box.hidden = true; return; }
    box.hidden = false;
    box.querySelector("[data-install]").hidden = !installEvent;
    box.querySelector("[data-install-how]").innerHTML = installHow();
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    renderInstall();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    const box = document.getElementById("install");
    if (box) box.hidden = true;
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-install]") && installEvent) {
      installEvent.prompt();
      installEvent.userChoice.finally(() => { installEvent = null; renderInstall(); });
    }
    if (e.target.closest("[data-install-later]")) {
      // Не напоминаем неделю
      try { localStorage.setItem("install-later", String(Date.now() + 7 * 864e5)); } catch (err) { /* без хранилища */ }
      document.getElementById("install").hidden = true;
    }
    if (e.target.closest("[data-install-show]")) renderInstall(true);
  });

  // ---------- карта курса на главной ----------
  function renderMap() {
    const el = document.getElementById("course-map");
    if (!el || !window.COURSE) return;
    el.innerHTML = window.COURSE.map((m) => `
      <li class="month">
        <span class="num">Месяц ${m.month} · ${m.district}</span>
        <h3>${m.title}</h3>
        <ol>
          ${m.lessons.map((l) => `
            <li class="${l.done ? "done" : ""}">
              <span class="n">${String(l.n).padStart(2, "0")}</span>
              ${l.file ? `<a href="${ROOT}${l.file}">${l.title}</a>` : `<span>${l.title}</span>`}
            </li>`).join("")}
        </ol>
      </li>`).join("");

    const lv = document.getElementById("levels");
    if (lv && window.LEVELS) {
      lv.innerHTML = window.LEVELS.map((l) => `<li><b>${l.name}</b> ${l.xp} XP</li>`).join("");
    }
  }

  document.addEventListener("DOMContentLoaded", () => { renderMap(); renderInstall(); });
})();
