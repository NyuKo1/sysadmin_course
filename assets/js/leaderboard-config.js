// Рейтинг класса. Учитель вставляет сюда URL веб-приложения Apps Script (см. tools/leaderboard.gs):
//   window.LEADERBOARD_URL = "https://script.google.com/macros/s/…/exec";
// Пока пусто, рейтинг работает только на этом устройстве (свои рекорды).
// URL не секрет: записать очки можно только с PIN ученика, а PIN живут только в Google Таблице.
window.LEADERBOARD_URL = "";

// Игры уроков для вкладок рейтинга (id как в Arena.data и в MAX_SCORE в tools/leaderboard.gs).
window.LEADERBOARD_GAMES = {
  l05: [
    { id: "l05-compat", title: "Совместимость" },
    { id: "l05-build", title: "Сборка" },
    { id: "l05-fix", title: "Диагностика" },
  ],
};
