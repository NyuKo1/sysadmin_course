// Общее для страниц уроков: наглядные переключатели битов и встроенная форма ДЗ.
(function () {
  function updateExplorer(box) {
    let sum = 0;
    box.querySelectorAll(".bit").forEach((b) => {
      if (b.getAttribute("aria-pressed") === "true") sum += Number(b.dataset.w || 1);
    });
    const key = box.dataset.explorer;
    document.querySelectorAll(`[data-explorer-out="${key}"]`).forEach((o) => (o.textContent = sum));
    document.querySelectorAll(`[data-explorer-hex="${key}"]`).forEach((o) => (o.textContent = sum.toString(16).toUpperCase().padStart(2, "0")));
  }

  document.addEventListener("click", (e) => {
    const bit = e.target.closest("[data-explorer] .bit");
    if (!bit) return;
    const on = bit.getAttribute("aria-pressed") !== "true";
    bit.setAttribute("aria-pressed", String(on));
    bit.textContent = on ? "1" : "0";
    updateExplorer(bit.closest("[data-explorer]"));
  });

  // Форма ДЗ: показываем, только если ссылка задана и есть интернет
  function mountHomework() {
    document.querySelectorAll("[data-homework]").forEach((box) => {
      const url = box.dataset.form;
      if (!url) return;
      if (!navigator.onLine) {
        box.innerHTML = `<div class="hw-off">Сейчас нет интернета. Домашнее задание откроется, когда телефон подключится к сети.</div>`;
        return;
      }
      box.innerHTML = `<iframe class="hw-frame" src="${url}" title="Домашнее задание" loading="lazy">Загрузка…</iframe>
        <p class="muted">Форма не открылась? <a href="${url.replace("embedded=true", "")}" target="_blank" rel="noopener">Открыть в новой вкладке</a></p>`;
    });
  }

  document.addEventListener("DOMContentLoaded", mountHomework);
  window.addEventListener("online", mountHomework);
})();
