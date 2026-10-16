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

  document.addEventListener("DOMContentLoaded", renderMap);
})();
