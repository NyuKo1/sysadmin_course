// Урок 6: «Нажми кнопку и смотри». Пошаговая анимация от кнопки питания до Windows.
// <div data-bootchain> с <ol class="bc-steps"><li>…</li></ol>, экраном [data-bc-scr] и кнопками [data-bc-next], [data-bc-reset].
(function () {
  const SCR = ["⏻", "⚡ Power Good", "UEFI", "POST: CPU · RAM · VGA ✓", "Boot #1 → NVMe…", "🛡 подпись ✓", "Windows Boot Manager", "🪟 Добро пожаловать"];
  const BTN = ["Дальше: питание", "Дальше: прошивка", "Дальше: POST", "Дальше: поиск загрузчика", "Дальше: Secure Boot", "Дальше: загрузчик", "Дальше: Windows", "Готово! Ещё раз?"];
  function mount(box) {
    const steps = [...box.querySelectorAll(".bc-steps > li")];
    const scr = box.querySelector("[data-bc-scr]");
    const next = box.querySelector("[data-bc-next]");
    let i = -1;
    function show() {
      steps.forEach((li, k) => { li.classList.toggle("on", k === i); li.classList.toggle("done", k < i); });
      box.dataset.step = String(i);
      scr.textContent = i < 0 ? "⏻" : SCR[i] || "";
      scr.classList.remove("bc-pop"); void scr.offsetWidth; scr.classList.add("bc-pop");
      next.textContent = i < 0 ? "Нажать кнопку питания" : BTN[i];
      if (i >= 0 && steps[i] && window.innerWidth < 760) steps[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    next.addEventListener("click", () => { i = i >= steps.length - 1 ? -1 : i + 1; show(); });
    box.querySelector("[data-bc-reset]").addEventListener("click", () => { i = -1; show(); });
    show();
  }
  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("[data-bootchain]").forEach(mount));
})();
