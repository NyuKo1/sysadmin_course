/**
 * Рейтинг игр Памятьвиля: Google Apps Script + Google Таблица.
 *
 * ===== Как подключить (один раз, 10 минут) =====
 * 1. Создай новую Google Таблицу (например, «Памятьвиль: рейтинг»).
 *    Открой Расширения → Apps Script. (Или script.google.com → Новый проект,
 *    тогда в функции setup() таблица создастся сама, см. SHEET_ID ниже.)
 * 2. Удали всё в редакторе и вставь этот файл целиком. Сохрани (значок дискеты).
 * 3. Вверху выбери функцию setup и нажми «Выполнить». Google спросит разрешения:
 *    «Проверить разрешения» → свой аккаунт → «Дополнительно» → «Перейти к проекту» → «Разрешить».
 *    Появятся листы «Ученики» (13 строк s01…s13 со случайными PIN) и «Очки».
 * 4. На листе «Ученики» впиши настоящие ники учеников (колонка «ник»). PIN можно оставить
 *    случайные или поменять на свои (ровно 4 цифры). Раздай каждому его PIN лично.
 *    Колонка «активен»: ИСТИНА/FALSE, выключенный ученик не может отправлять очки и не виден в рейтинге.
 * 5. Развернуть → Новое развёртывание → шестерёнка «Выберите тип» → Веб-приложение.
 *    Описание: любое. «Выполнять от имени: меня». «У кого есть доступ: все».
 *    Нажми «Развернуть» и скопируй URL веб-приложения (заканчивается на /exec).
 * 6. Вставь этот URL в файл assets/js/leaderboard-config.js:
 *        window.LEADERBOARD_URL = "https://script.google.com/macros/s/…/exec";
 *    и опубликуй сайт. Проверка: открой URL в браузере, должен прийти JSON с "ok":true.
 * Если потом поменяешь код здесь: Развернуть → Управление развёртываниями → карандаш →
 * Версия: «Новая версия» → Развернуть. URL останется прежним.
 *
 * ===== Почему в репозитории нет секретов =====
 * URL веб-приложения публичный: его видит любой, кто откроет сайт, и это нормально.
 * Читать рейтинг может кто угодно (там только ники и очки). А чтобы записать очки,
 * нужен PIN ученика, который лежит ТОЛЬКО в этой таблице и никогда не отдаётся наружу.
 * Сервер проверяет PIN, отбрасывает неизвестные игры и нереальные очки (MAX_SCORE),
 * не даёт отправлять чаще раза в MIN_SECONDS секунд и блокирует перебор PIN.
 * Если кто-то сжульничал: удали его строки на листе «Очки» и смени PIN на листе «Ученики»
 * (или запусти resetPin("s05")). Все попытки хранятся, рейтинг считает лучшую по каждой игре.
 */

// Если скрипт создан отдельно (script.google.com), а не из таблицы: впиши сюда ID таблицы
// (из её адреса: docs.google.com/spreadsheets/d/ВОТ_ЭТО/edit) или оставь пустым: setup() создаст новую.
var SHEET_ID = "";

// Игры и максимально возможные очки (выше не бывает, значит подделка).
var MAX_SCORE = {
  "l05-compat": 20000,
  "l05-build": 20000,
  "l05-fix": 20000,
  "l06-boot": 20000,
  "l06-guard": 20000,
  "l06-uefi": 20000,
  "l06-boss": 25000,
};
// Какие игры входят в урок (для «Общего зачёта» по уроку).
var LESSONS = {
  l05: ["l05-compat", "l05-build", "l05-fix"],
  l06: ["l06-boot", "l06-guard", "l06-uefi", "l06-boss"],
};
var MIN_SECONDS = 15;    // не чаще одной отправки за столько секунд на ученика
var MAX_PIN_FAILS = 5;   // столько неверных PIN за 10 минут, потом пауза
var MAX_ITEMS = 10;      // сколько результатов можно прислать одной пачкой (офлайн-очередь)

var STUDENTS_SHEET = "Ученики";
var SCORES_SHEET = "Очки";
var STUDENT_HEAD = ["id", "ник", "PIN", "активен"];
var SCORE_HEAD = ["время", "id", "игра", "очки", "уровень", "детали"];

// ---------- таблица ----------
function book_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  throw new Error("Нет таблицы: запусти setup()");
}

function setup() {
  var ss;
  try { ss = book_(); } catch (e) {
    ss = SpreadsheetApp.create("Памятьвиль: рейтинг");
    PropertiesService.getScriptProperties().setProperty("SHEET_ID", ss.getId());
  }
  var st = ss.getSheetByName(STUDENTS_SHEET);
  if (!st) {
    st = ss.insertSheet(STUDENTS_SHEET);
    var rows = [STUDENT_HEAD];
    for (var i = 1; i <= 13; i++) {
      var sid = "s" + (i < 10 ? "0" : "") + i;
      rows.push([sid, "Игрок " + i, randomPin_(), true]);
    }
    st.getRange(1, 1, rows.length, 4).setValues(rows);
    st.getRange(2, 3, rows.length - 1, 1).setNumberFormat("@"); // PIN как текст: 0042 не превратится в 42
    st.getRange(2, 3, rows.length - 1, 1).setValues(rows.slice(1).map(function (r) { return [r[2]]; }));
    st.setFrozenRows(1);
  }
  var sc = ss.getSheetByName(SCORES_SHEET);
  if (!sc) {
    sc = ss.insertSheet(SCORES_SHEET);
    sc.getRange(1, 1, 1, SCORE_HEAD.length).setValues([SCORE_HEAD]);
    sc.setFrozenRows(1);
  }
  Logger.log("Готово. Таблица: " + ss.getUrl());
  return ss.getUrl();
}

function randomPin_() {
  var p = String(Math.floor(Math.random() * 10000));
  while (p.length < 4) p = "0" + p;
  return p;
}

// Учитель: новый PIN одному ученику. Пример: resetPin("s05")
function resetPin(id) {
  var st = book_().getSheetByName(STUDENTS_SHEET);
  var data = st.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      var pin = randomPin_();
      st.getRange(i + 1, 3).setNumberFormat("@").setValue(pin);
      Logger.log(id + ": новый PIN " + pin);
      return pin;
    }
  }
  throw new Error("Нет ученика " + id);
}

function students_() {
  var st = book_().getSheetByName(STUDENTS_SHEET);
  var data = st ? st.getDataRange().getValues() : [];
  var out = {};
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0]).trim();
    if (!id) continue;
    var pin = String(data[i][2]).trim();
    while (pin && pin.length < 4) pin = "0" + pin; // если таблица съела ведущие нули
    var act = data[i][3];
    out[id] = { id: id, nick: String(data[i][1] || id).trim(), pin: pin, active: !(act === false || String(act).toLowerCase() === "false" || act === "нет" || act === 0) };
  }
  return out;
}

// ---------- ответ ----------
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- чтение рейтинга ----------
// GET ?lesson=l05 → { ok, lesson, games, boards: { game: [{id,nick,score,level}] }, total: [{id,nick,score,games}] }
// GET ?game=l05-compat → то же, но по одной игре. Без параметров: { ok, games }.
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.lesson || p.game) return json_(board_(p.lesson, p.game));
    return json_({ ok: true, games: Object.keys(MAX_SCORE), lessons: LESSONS });
  } catch (err) {
    return json_({ ok: false, error: "server", message: String(err && err.message || err) });
  }
}

function board_(lesson, game) {
  var games = lesson && LESSONS[lesson] ? LESSONS[lesson] : game && MAX_SCORE[game] ? [game] : null;
  if (!games) return { ok: false, error: "game" };
  var key = "board:" + (lesson || game);
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var studs = students_();
  var sc = book_().getSheetByName(SCORES_SHEET);
  var data = sc ? sc.getDataRange().getValues() : [];
  var best = {}; // game → id → {score, level}
  games.forEach(function (g) { best[g] = {}; });
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][1]).trim(), g = String(data[i][2]).trim(), s = Number(data[i][3]) || 0;
    if (!best[g] || !studs[id] || !studs[id].active) continue;
    if (s > MAX_SCORE[g]) continue;
    var cur = best[g][id];
    if (!cur || s > cur.score) best[g][id] = { score: s, level: Number(data[i][4]) || 0 };
  }
  var boards = {}, totals = {};
  games.forEach(function (g) {
    boards[g] = Object.keys(best[g]).map(function (id) {
      var t = totals[id] || (totals[id] = { id: id, nick: studs[id].nick, score: 0, games: 0 });
      t.score += best[g][id].score;
      t.games++;
      return { id: id, nick: studs[id].nick, score: best[g][id].score, level: best[g][id].level };
    }).sort(function (a, b) { return b.score - a.score; });
  });
  var total = Object.keys(totals).map(function (k) { return totals[k]; }).sort(function (a, b) { return b.score - a.score; });
  var out = { ok: true, lesson: lesson || null, games: games, boards: boards, total: total, updated: new Date().toISOString() };
  cache.put(key, JSON.stringify(out), 30);
  return out;
}

// ---------- запись ----------
// POST (Content-Type: text/plain, тело JSON, чтобы браузер не делал CORS-preflight):
//   { action: "whoami", id, pin }                       → { ok, id, nick }
//   { action: "submit", id, pin, items: [{ game, score, level, time, mistakes, at }] } → { ok, saved, best }
//   (старый формат: { action: "submit", id, pin, game, score, level, ... } тоже принимается)
function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { return json_({ ok: false, error: "json" }); }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return json_({ ok: false, error: "busy" }); }
  try {
    return json_(handle_(body));
  } catch (err) {
    return json_({ ok: false, error: "server", message: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function handle_(b) {
  var id = String(b.id || "").trim();
  var pin = String(b.pin || "").trim();
  if (!/^s\d{2,3}$/.test(id) || !/^\d{4}$/.test(pin)) return { ok: false, error: "auth" };
  var cache = CacheService.getScriptCache();
  var failKey = "fail:" + id;
  var fails = Number(cache.get(failKey)) || 0;
  if (fails >= MAX_PIN_FAILS) return { ok: false, error: "locked", retry: 600 };
  var st = students_()[id];
  if (!st || st.pin !== pin) {
    cache.put(failKey, String(fails + 1), 600);
    return { ok: false, error: "auth" };
  }
  if (!st.active) return { ok: false, error: "inactive" };
  if (fails) cache.remove(failKey);
  if (b.action === "whoami") return { ok: true, id: id, nick: st.nick };
  if (b.action !== "submit") return { ok: false, error: "action" };

  var lastKey = "last:" + id;
  var now = Date.now();
  var last = Number(cache.get(lastKey)) || 0;
  if (now - last < MIN_SECONDS * 1000) return { ok: false, error: "rate", retry: Math.ceil((MIN_SECONDS * 1000 - (now - last)) / 1000) };

  var items = Array.isArray(b.items) ? b.items : [b];
  if (!items.length || items.length > MAX_ITEMS) return { ok: false, error: "items" };
  var rows = [], rejected = [];
  items.forEach(function (it, i) {
    var g = String(it.game || "");
    var s = Number(it.score);
    if (!MAX_SCORE.hasOwnProperty(g)) { rejected.push({ i: i, error: "game" }); return; }
    if (!isFinite(s) || s < 0 || s !== Math.floor(s) || s > MAX_SCORE[g]) { rejected.push({ i: i, error: "score" }); return; }
    var level = clampInt_(it.level, 0, 20);
    var meta = { time: clampInt_(it.time, 0, 36000), mistakes: clampInt_(it.mistakes, 0, 999) };
    if (it.at) meta.at = String(it.at).slice(0, 30);
    rows.push([new Date(), id, g, s, level, JSON.stringify(meta)]);
  });
  if (rows.length) {
    var sc = book_().getSheetByName(SCORES_SHEET);
    sc.getRange(sc.getLastRow() + 1, 1, rows.length, SCORE_HEAD.length).setValues(rows);
    cache.put(lastKey, String(now), 600);
    Object.keys(LESSONS).forEach(function (l) { cache.remove("board:" + l); });
    Object.keys(MAX_SCORE).forEach(function (g) { cache.remove("board:" + g); });
  }
  return { ok: rows.length > 0 || !rejected.length, saved: rows.length, rejected: rejected, nick: st.nick };
}

function clampInt_(v, min, max) {
  v = Math.round(Number(v) || 0);
  return Math.max(min, Math.min(max, v));
}

// Для node-тестов (в Apps Script module не существует).
if (typeof module !== "undefined") module.exports = { doGet: doGet, doPost: doPost, setup: setup, resetPin: resetPin, MAX_SCORE: MAX_SCORE };
