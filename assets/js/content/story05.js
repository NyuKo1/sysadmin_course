// Сезон 2, урок 5 «Как собирают ПК»: Глюк захватил Памятьвиль, город спасает правильно собранный компьютер.
// Новые главные герои (спрайты в assets/js/sprites-hd.js):
//   plata  Матрёна Плата: черепаха, панцирь из текстолита, командир сопротивления (наставник)
//   radik  Радик: ёж-оверклокер, вместо иголок рёбра радиатора (соперник, всё бы разогнал)
//   klava  Клава: мышь-инженер, хвост-кабель USB, гогглы на лбу («не клавиатура»)
//   boss   Глюк.exe: финальная форма Глюка; армия: битые пиксели (px1..px5) и мусорные процессы (tr1, tr2)
// Бит, Нибл и Дедушка Мега остаются, но уже на втором плане.
// В финале выходят все 13 учеников из assets/js/students.js (кадр roll, перекличка, и crowd, толпа).
//
// Выборы (localStorage «story-choices»):
//   l05-join   (in | deal | tea)            ответ Биту: поможешь городу?            (intro)
//   l05-role   (builder | diag | cable)     роль в команде                          (intro)
//   l05-esd    (touch | fast | me)          Радик и статическое электричество      (g1)
//   l05-post   (power | ram | hit)          компьютер молчит: что проверить первым  (g2)
//   l05-ready  (go | scared | auto)         готовность к настоящей сборке           (build)
//   l05-liked  (yes | meh | no)             понравился ли урок                       (finale)
// Финал вспоминает l05-join, l05-role, l05-esd, l05-post (и l04-rescue из прошлого урока в g2).
(function () {
  const S = (window.STORIES = window.STORIES || {});

  // Новые герои и армия Глюка: общий cast для всех серий урока.
  const CAST2 = {
    plata: { name: "Матрёна Плата", sprite: "plata", x: 70, scale: 1.35, color: "#5cf29a", voice: "plata" },
    radik: { name: "Радик", sprite: "radik", x: 84, scale: 1.25, color: "#ff8a5c", voice: "radik" },
    klava: { name: "Клава", sprite: "klava", x: 54, scale: 1.15, color: "#6cc7ff", voice: "klava" },
    boss: { name: "Глюк.exe", sprite: "glitchBoss", x: 80, scale: 2.2, color: "#c58bff", voice: "boss", idle: "float" },
    px1: { name: "Битый пиксель", sprite: "deadPixel", x: 62, scale: 0.95, color: "#ff8a8a", voice: "glitch" },
    px2: { name: "Битый пиксель", sprite: "deadPixelG", x: 72, scale: 0.95, color: "#7af0a8", voice: "glitch" },
    px3: { name: "Битый пиксель", sprite: "deadPixelB", x: 90, scale: 0.95, color: "#8fb0ff", voice: "glitch" },
    px4: { name: "Битый пиксель", sprite: "deadPixel", x: 68, scale: 0.8, color: "#ff8a8a", voice: "glitch" },
    px5: { name: "Битый пиксель", sprite: "deadPixelG", x: 96, scale: 0.8, color: "#7af0a8", voice: "glitch" },
    tr1: { name: "Мусорный процесс", sprite: "junkProc", x: 80, scale: 1.05, color: "#b8c2d0", voice: "glitch" },
    tr2: { name: "Мусорный процесс", sprite: "junkProc", x: 56, scale: 0.9, color: "#b8c2d0", voice: "glitch" },
  };

  // В начале урока, перед теорией 1 (компоненты и совместимость).
  S["l05-intro"] = {
    title: "Осада Памятьвиля",
    cast: CAST2,
    beats: [
      { bg: "street:siege", mood: "glitch", sfx: "alarm",
        title: { kicker: "Сезон 2", text: "Осада Памятьвиля", sub: "Новые герои. Старый враг. Компьютер, который придётся собрать руками." } },
      { fx: "glitch", do: "px1 enter right 62; px2 enter right 74; tr1 enter right 88",
        say: "Памятьвиль, вечер. Глюк вернулся из Процессорска не один, а с армией. На экранах битые пиксели, по улицам ползают мусорные процессы." },
      { fx: "glitch shake", do: "glitch enter right 84; glitch as glitchLaugh; tr1 move 94", who: "glitch",
        say: "Внимание, Памятьвиль! Говорит ваш новый администратор. Все компьютеры города разобраны. На винтики. Винтики я съел." },
      { do: "px1 jump", who: "px1",
        say: "Красный! Я красный! Я навсегда красный! Это лучший день моей жизни!" },
      { do: "tr1 shake", who: "tr1",
        say: "Ням. Съел всю оперативку в квартале. Хочу ещё. Я процесс, я никогда не завершаюсь." },
      { do: "bit enter left 30; bit as bitShock; nibble enter left 12; mega enter left 46",
        say: "За мусорным баком, который пока ещё был просто мусорным баком, прятались трое Байтов." },
      { do: "nibble as nibbleShock", who: "nibble", tone: "whisper",
        say: "Бит, мой компьютер тоже разобрали. А там была недописанная песня про тебя. Хорошая. Почти без обидных слов." },
      { who: "mega",
        say: "Не зря разобрали. Собранный и работающий компьютер для Глюка как солнце для вампира. Поэтому город держится на одном: никто не умеет собирать." },
      { do: "bit as bit", who: "bit", to: "reader",
        say: "Эй. Да, ты. Мы вместе спасали фото, помнишь? Теперь всё хуже: город захвачен, моя семья сидит за мусоркой. Ты с нами?",
        choice: [
          { label: "Конечно. Я в деле", go: "join-in", value: "in" },
          { label: "А что мне за это будет?", go: "join-deal", value: "deal" },
          { label: "Сейчас, только чай допью", go: "join-tea", value: "tea" },
        ],
        remember: "l05-join", after: "joined" },

      { label: "join-in", do: "bit as bitHappy; bit jump", who: "bit", to: "reader", goto: "joined",
        say: "Я знал! То есть надеялся. То есть знал. Нибл, у нас пополнение, ставь чайник. Тихо ставь." },

      { label: "join-deal", do: "bit as bitCool", who: "bit", to: "reader",
        say: "Честно? Слава, благодарность трёх поколений Байтов и навык, за который взрослым платят деньги: сборка компьютера. По рукам?" },
      { do: "nibble as nibbleHappy", who: "nibble", goto: "joined",
        say: "И печенька от меня. Одна. Я жадная, но справедливая." },

      { label: "join-tea", do: "mega as megaHappy", who: "mega",
        say: "Правильно. Сисадмин без чая как процессор без термопасты: работает, но недолго и очень горячо." },
      { do: "bit as bit", who: "bit", to: "reader", goto: "joined",
        say: "Только допивай быстрее. Глюк чай не пьёт. Ему некогда, он всё ломает." },

      { label: "joined", bg: "lab", mood: null, fx: "shake", sfx: "whoosh",
        show: { glitch: { hide: true }, px1: { hide: true }, px2: { hide: true }, tr1: { hide: true },
          bit: { x: 30, sprite: "bitShock" }, nibble: { x: 12, sprite: "nibble" }, mega: { x: 46, sprite: "mega" } },
        say: "Вдруг крышка люка рядом с баком отъехала, и чья-то лапа утянула всех вниз. В подвале пахло канифолью и горячим кофе." },
      { do: "plata enter right 72", sign: "МАТРЁНА ПЛАТА · командир сопротивления", who: "plata",
        say: "Тише. Наверху их сто сорок штук, а нас, раз, два, три... Пятеро. Уже лучше, чем вчера." },
      { do: "plata as plataHappy", who: "plata",
        say: "Матрёна Плата. Панцирь из текстолита, характер тоже. Дорожки на спине не татуировка, а схема. Не разглядывай." },
      { do: "klava enter left 56; klava jump; bit as bit", sign: "КЛАВА · инженер. Не клавиатура", who: "klava",
        say: "Клава. Инженер. Нет, не клавиатура, хотя печатаю быстрее. Хвост не трогать: это кабель USB. Он под напряжением. Шучу. Наверное." },
      { do: "radik enter right 88; radik as radik", fx: "smoke:radik", sign: "РАДИК · разгоняет всё, что включается", who: "radik",
        say: "Радик. Лучший сборщик Памятьвиля. Зачем нам новенький? Дайте старый ПК, разгоню его до шести гигагерц и снесу Глюка сам." },
      { sign: null, do: "plata as plata", who: "plata",
        say: "В прошлый раз ты разогнал чайник. Он улетел. Мы его до сих пор ищем." },
      { do: "radik as radikAngry", fx: "smoke:radik", who: "radik",
        say: "Он не улетел! Он вышел на орбиту. Это разные вещи." },
      { do: "mega as megaHappy", who: "mega",
        say: "Я его помню ещё ежонком. Он разгонял погремушку. Погремушка, кстати, тоже не вернулась." },
      { do: "radik as radik; mega as mega", who: "plata", sign: "ОРУЖИЕ: РАБОЧИЙ КОМПЬЮТЕР",
        say: "План такой. Глюк боится одного: компьютера, который собран правильно и работает. Такой компьютер находит его сбои и стирает, как ластик." },
      { sign: null, do: "klava as klavaHappy", who: "klava",
        say: "Детали у нас есть, я спасала их по одной. Процессор, плата, память, диски, видеокарта, блок питания. Осталось понять, что с чем дружит. Иначе соберём красивый кирпич." },
      { do: "plata as plata; klava as klava", who: "plata", to: "reader",
        say: "Новенький, у каждого в команде своя роль. Выбирай свою.",
        choice: [
          { label: "Сборщик: ставлю детали", go: "role-builder", value: "builder" },
          { label: "Диагност: ищу, почему не работает", go: "role-diag", value: "diag" },
          { label: "Кабельный маг: всё подключаю", go: "role-cable", value: "cable" },
        ],
        remember: "l05-role", after: "roles" },

      { label: "role-builder", do: "radik as radikAngry; radik shake", who: "radik", goto: "roles",
        say: "Сборщик? Это моя роль! Ладно. Будем соперниками. Посмотрим, кто первым поставит процессор и ничего не погнёт." },

      { label: "role-diag", do: "plata as plataHappy", who: "plata", goto: "roles",
        say: "Диагност. Мне нравится. Ты тот, кто не паникует, когда не включилось, а спокойно спрашивает: что именно не включилось?" },

      { label: "role-cable", do: "klava as klavaHappy; klava jump", who: "klava", goto: "roles",
        say: "Кабельный маг! Наконец-то! Тут кабелей больше, чем макарон в столовой, и у всех разные концы. Будешь моим учеником. Или я твоим, разберёмся." },

      { label: "roles", do: "plata as plata; radik as radik; klava as klava; bit as bit", who: "bit", to: "reader",
        say: "Отлично. Но любую роль начинают одинаково: сначала разбираются, какие детали бывают и какая к какой подходит." },
      { do: "radik as radikHappy", who: "radik",
        say: "Совместимость для слабаков. Если деталь не лезет, надо нажать сильнее." },
      { do: "klava as klavaShock; klava shake", who: "klava", tone: "shout",
        say: "НЕТ! Процессор не встанет в чужой сокет никогда. Я пробовала. Плоскогубцами. Не спрашивай." },
      { do: "klava as klava; radik as radik", who: "plata",
        say: "Значит, учимся. Детали, разъёмы, кто с кем дружит. А потом соберём оружие против Глюка. Своими руками." },
    ],
  };

  // После игры 1 (совместимость), в начале теории 2 (порядок сборки, статика, кабели).
  S["l05-g1"] = {
    title: "Искра Радика",
    cast: CAST2,
    beats: [
      { bg: "lab", fx: "confetti", show: { klava: { x: 46, sprite: "klavaHappy" }, radik: { x: 76 }, plata: { x: 20 }, bit: { x: 92, sprite: "bitHappy" } }, who: "klava",
        say: "Детали разобраны! Процессор к своей плате, память к своим слотам, ничего не перепутано. Радик, а ты что делаешь?" },
      { do: "radik as radikHappy; radik bounce", who: "radik",
        say: "Ставлю процессор. Прямо сейчас. Стою на ковре, в шерстяном свитере, шаркаю ногами. Для скорости." },
      { do: "plata as plataShock", who: "plata",
        say: "Ты сейчас маленькая грозовая туча. Статическое электричество: ты разряд почти не почувствуешь, а микросхема почувствует. Один раз. Последний." },
      { do: "plata as plata; bit as bit", who: "bit", to: "reader",
        say: "Скажи ему ты. Меня он не слушает, я для него «рыжий с отвёрткой».",
        choice: [
          { label: "Сначала коснись металла корпуса", go: "esd-touch", value: "touch" },
          { label: "Да ладно, так быстрее", go: "esd-fast", value: "fast" },
          { label: "Отойди, дай мне", go: "esd-me", value: "me" },
        ],
        remember: "l05-esd", after: "esd-done" },

      { label: "esd-touch", do: "radik as radik", who: "radik",
        say: "Коснулся корпуса. Ничего не произошло. Скукота." },
      { do: "plata as plataHappy", who: "plata", goto: "esd-done",
        say: "Вот именно. В сборке скучно значит правильно. Весёлая сборка обычно заканчивается походом в магазин." },

      { label: "esd-fast", fx: "flash shake", sfx: "zap", do: "radik as radikShock; radik jump",
        say: "Щёлк! Искра прыгнула с пальца Радика. Все рёбра радиатора на его голове встали дыбом." },
      { do: "klava as klavaShock", who: "klava",
        say: "Процессор жив, повезло: искра ушла в корпус. Но в следующий раз сначала касаемся металла. Договорились?" },
      { do: "radik as radik", who: "radik", goto: "esd-done",
        say: "Договорились. Только иголки обратно не ложатся. Это теперь моя причёска." },

      { label: "esd-me", do: "radik as radikAngry", who: "radik",
        say: "Эй! Это мой процессор! Ну ладно. Твой. Временно." },
      { do: "plata as plataHappy", who: "plata", goto: "esd-done",
        say: "Смело. Тогда правило тебе: сначала коснись голого металла корпуса, а детали держи за края, не за контакты." },

      { label: "esd-done", if: { "l05-role": "cable" }, do: "klava as klavaHappy; plata as plata; radik as radik", who: "klava", to: "reader",
        say: "Кабельный маг, дальше твоя часть. Большой разъём питания на плату, отдельный на процессор, свои на видеокарту и диски. Перепутать трудно, но люди стараются." },
      { if: { "l05-role": "builder" }, do: "radik as radikHappy; plata as plata", who: "radik",
        say: "Сборщик, давай так: я ставлю кулер, ты память. Кто первый, тот молодец. Второй тоже молодец, но поменьше." },
      { if: { "l05-role": "diag" }, do: "plata as plata; radik as radik", who: "plata", to: "reader",
        say: "Диагност, запоминай порядок сборки. Когда что-то не включится, именно порядок подскажет, где искать." },
      { if: { "l05-role": null }, do: "plata as plata; radik as radik", who: "plata",
        say: "Сборщикам, диагностам и кабельным магам одно и то же: сначала порядок, потом скорость." },
      { do: "klava as klava; bit as bitCool", who: "bit",
        say: "Значит так: в каком порядке собирать, как не убить детали статикой и что куда подключается. Это следующая теория." },
      { fx: "glitch", who: "glitch", name: "Глюк (из вентиляции)",
        say: "Собирайте, собирайте. Всё равно забудете подключить какой-нибудь проводок. Все забывают. Это мой любимый момент." },
      { do: "klava as klavaHappy", who: "klava",
        say: "Глюк прав: все забывают. Поэтому у нас будет порядок и чек-лист. Спасибо за подсказку!" },
      { fx: "glitch", who: "glitch", name: "Глюк (из вентиляции)", tone: "shout",
        say: "ЭТО БЫЛА НЕ ПОДСКАЗКА!" },
    ],
  };

  // После игры 2 (сборка), в начале теории 3 (первый запуск, POST, диагностика).
  S["l05-g2"] = {
    title: "Тишина в корпусе",
    cast: CAST2,
    beats: [
      { bg: "lab", show: { radik: { x: 66 }, klava: { x: 44 }, plata: { x: 20 }, bit: { x: 88 } },
        say: "Первый компьютер собран. Корпус закрыт, кабели уложены, винтики в коробочке. Почти все. Радик торжественно тянется к кнопке." },
      { do: "radik as radikHappy; radik bounce", sfx: "click", who: "radik",
        say: "Три, два, один... Запуск!" },
      { do: "radik as radikShock; nibble enter left 8", who: "nibble",
        say: "Тишина. Ни писка, ни вентилятора. Только я громко жую печенье. Что? Я переживаю." },
      { if: { "l04-rescue": "hit" }, do: "nibble as nibbleShock", who: "nibble",
        say: "И сразу: по корпусу не стучим. Я помню склад. Я всё помню." },
      { do: "bit as bit; nibble as nibble", who: "bit", to: "reader",
        say: "Полная тишина. Ты в команде, говори: что проверяем первым?",
        choice: [
          { label: "Питание: розетку, кабель, кнопку на блоке", go: "post-power", value: "power" },
          { label: "Переставлю оперативку", go: "post-ram", value: "ram" },
          { label: "Стукну по корпусу", go: "post-hit", value: "hit" },
        ],
        remember: "l05-post", after: "post-fix" },

      { label: "post-power", do: "klava as klavaHappy; klava jump", who: "klava", goto: "post-fix",
        say: "Точно! Выключатель на самом блоке питания стоит на нуле. Классика. Самая частая поломка в мире называется «не включили»." },

      { label: "post-ram", do: "plata as plata", who: "plata",
        say: "Мысль хорошая, но не первая. Когда тишина полная, даже вентиляторы молчат, сначала питание. Память проверяют, когда кулеры крутятся, а экран чёрный." },
      { do: "klava as klavaHappy", who: "klava", goto: "post-fix",
        say: "Вот: выключатель на блоке питания на нуле. Сейчас щёлкнем." },

      { label: "post-hit", fx: "shake", do: "plata as plataAngry; plata shake", who: "plata", tone: "shout",
        say: "Стоп! Мы не в кино про девяностые. Компьютер не телевизор, от ударов он не умнеет." },
      { if: { "l04-rescue": "hit" }, do: "nibble as nibbleShock; nibble jump", who: "nibble",
        say: "Второй раз за месяц! Я записываю. У меня отдельная тетрадь." },
      { do: "plata as plata; klava as klava", who: "klava", goto: "post-fix",
        say: "Сначала питание. Ага: выключатель на самом блоке на нуле. Щёлк." },

      { label: "post-fix", bg: "lab:on", fx: "flash", sfx: "boot", do: "radik as radikHappy; klava as klava; nibble as nibbleHappy",
        say: "Вентиляторы зашумели. Один короткий писк. Монитор загорелся." },
      { label: "post-ok", do: "plata as plataHappy", who: "plata",
        say: "Один короткий писк, это POST: компьютер сам проверил процессор, память и видеокарту и доложил, что всё в порядке." },
      { if: { "l05-esd": "fast" }, do: "radik as radik", who: "radik",
        say: "И процессор жив, после моей искры. Я его даже немножко зауважал." },
      { bg: "lab", fx: "glitch shake", do: "plata as plataShock; radik as radikShock", who: "glitch", name: "Глюк (с монитора)",
        say: "Один компьютер? Против моей армии? Я знаю все коды писков! Три длинных! Пять коротких! Сейчас ваша железка запищит от ужаса!" },
      { do: "klava as klavaShock", who: "klava",
        say: "Он знает коды писков. Это плохо. Писк это язык, на котором плата говорит, что у неё сломалось." },
      { do: "plata as plata; radik as radik; klava as klava", who: "plata",
        say: "Значит, выучим этот язык лучше него. Первый запуск, POST, коды ошибок и как искать поломку по шагам." },
      { if: { "l05-role": "diag" }, do: "bit as bitCool", who: "bit", to: "reader",
        say: "Диагност, это твой звёздный час. Смотри внимательно, дальше твоя теория." },
      { do: "radik as radikHappy", who: "radik",
        say: "А потом соберём настоящий. Руками. Чур, я держу отвёртку." },
    ],
  };

  // Перед настоящей сборкой в классе: построение и инструктаж.
  S["l05-build"] = {
    title: "Сборка. По-настоящему",
    cast: CAST2,
    beats: [
      { bg: "lab", sfx: "alarm", show: { plata: { x: 50 }, bit: { x: 18 }, klava: { x: 32 }, radik: { x: 82 } },
        title: { kicker: "Перед сборкой", text: "Всё по-настоящему", sub: "Экранные тренировки закончились." } },
      { do: "plata as plata", who: "plata",
        say: "Слушай мою команду. Все компьютеры города разобраны. Теперь собираем настоящий: руками, на столе, всем классом." },
      { do: "plata jump", who: "plata",
        say: "Этот компьютер и есть оружие против Глюка. Как только он пройдёт POST, сигнал полетит по всему Памятьвилю, и мы пойдём в бой." },
      { sign: "КОСНИСЬ КОРПУСА · ДЕРЖИ ЗА КРАЯ · БЕЗ СИЛЫ", do: "klava as klavaHappy", who: "klava",
        say: "Три правила. Коснись металла корпуса. Детали держи за края. Ничего не вставляй силой: если не лезет, ты что-то перепутал." },
      { sign: null, do: "klava as klava; radik as radik", who: "radik",
        say: "И без разгона. Я серьёзно. Сначала чтобы просто заработало. Разгон потом. Может быть. Ну, чуть-чуть." },
      { if: { "l05-role": "builder" }, who: "plata", to: "reader",
        say: "Сборщик, твоё место у платы. Процессор кладёшь по треугольнику-ключу, без нажима. Память вставляешь до щелчка защёлок." },
      { if: { "l05-role": "diag" }, who: "plata", to: "reader",
        say: "Диагност, ты смотришь и сверяешь с чек-листом. Если не включится, ты первым говоришь, что проверяем." },
      { if: { "l05-role": "cable" }, do: "klava as klavaHappy", who: "klava", to: "reader",
        say: "Кабельный маг, твоё: питание платы, питание процессора и кнопки корпуса. Там крошечные штырьки, держись." },
      { if: { "l05-role": null }, who: "plata",
        say: "Дела хватит всем: ставить, подключать, проверять. Договоритесь в команде, кто что делает." },
      { do: "klava as klava; bit as bit", who: "bit", to: "reader",
        say: "Ну что, готов?",
        choice: [
          { label: "Погнали собирать", go: "ready-go", value: "go" },
          { label: "Страшновато, но иду", go: "ready-scared", value: "scared" },
          { label: "А где кнопка «собрать автоматически»?", go: "ready-auto", value: "auto" },
        ],
        remember: "l05-ready", after: "ready-done" },

      { label: "ready-go", do: "bit as bitCool", who: "bit", to: "reader", goto: "ready-done",
        say: "Вот это настрой. Дал бы тебе пять, но у меня лапа в термопасте." },

      { label: "ready-scared", do: "nibble enter left 6; nibble as nibbleHappy", who: "nibble",
        say: "В первый раз страшно всем. Даже Радику. Он просто говорит громче." },
      { do: "radik as radikAngry", who: "radik", goto: "ready-done",
        say: "Я не боюсь! Я... осторожничаю. Профессионально." },

      { label: "ready-auto", do: "klava as klavaHappy", who: "klava",
        say: "Такая кнопка есть. Она называется «ты». Других пока не изобрели." },

      { label: "ready-done", do: "plata as plataHappy; radik as radik; bit as bit", who: "plata",
        say: "Когда компьютер пройдёт POST, учитель даст код сборки. Введи его ниже, и мы пойдём в бой. Всем классом." },
      { who: "bit",
        say: "Иди. Мы будем болеть за тебя. Нибл, не ешь термопасту, это не паста." },
      { who: "nibble", name: "Нибл (за кадром)",
        say: "Я только понюхала!" },
    ],
  };

  // Финал: большая битва. Все ученики в бою, Глюк удалён, город строится с нуля.
  S["l05-finale"] = {
    title: "Битва за Памятьвиль",
    cast: CAST2,
    beats: [
      { bg: "street:siege", mood: "glitch", fx: "rumble", sfx: "alarm",
        do: "glitch enter right 82; glitch as glitchLaugh; px1 enter right 60; px2 enter right 70; tr2 enter right 52; px4 enter right 64; px3 enter right 92",
        say: "Ночь. Площадь Памятьвиля. Вся армия Глюка собралась в одном месте. Пиксели мигают, процессы чавкают." },
      { do: "glitch as glitch", who: "glitch",
        say: "Слышал, вы собрали компьютер. Мило. Тогда я соберу себя! Армия, ко мне!" },
      { fx: "glitch flash rumble", do: "px1 poof; px2 poof; px3 poof; px4 poof; tr2 poof; glitch poof",
        say: "Битые пиксели и мусорные процессы втянулись в Глюка, как спагетти в пылесос." },
      { fx: "flash rumble", sfx: "boom", do: "boss enter right 80; boss as glitchBoss", who: "boss",
        say: "Я ГЛЮК.EXE! Версия финальная! Обновления не принимаю! Синий экран смерти у меня прямо на груди, для красоты!" },
      { do: "plata enter left 16; bit enter left 30; klava enter left 42; radik enter left 54", who: "plata",
        say: "Красиво. А теперь посмотри, что умеет один правильно собранный компьютер." },
      { if: { "l05-join": "in" }, do: "bit as bitCool", who: "bit", to: "reader",
        say: "Ты сказал «я в деле» в самом начале. Вот оно, дело. Самое большое." },
      { if: { "l05-join": "deal" }, do: "bit as bitHappy", who: "bit", to: "reader",
        say: "Ты спрашивал, что тебе за это. Вот: лучшая битва в истории Памятьвиля. Печенька от Нибл тоже в силе." },
      { if: { "l05-join": "tea" }, do: "bit as bitHappy", who: "bit", to: "reader",
        say: "Чай допит? Отлично. Сейчас будет горячо." },
      { if: { "l05-join": null }, do: "bit as bit", who: "bit", to: "reader",
        say: "Ты с нами с самого начала. Сейчас увидишь, что ты не один." },
      { sfx: "boot", fx: "flash", do: "plata exit left; bit exit left; klava exit left; radik exit left; bit as bit",
        say: "Компьютер, собранный на уроке, коротко пискнул. Один раз. По всему городу зажглись экраны, и на площадь начали выходить герои." },
      { roll: { from: "students", at: 50, back: [3, 44], fx: ["flash", "shake", "bits", "flash", "glitch shake"] } },
      { crowd: { from: "students", range: [4, 62], rows: 2, scale: 0.8, lift: 16 }, fx: "shake", do: "boss as glitchBossHurt; boss shake", who: "boss",
        say: "Тринадцать?! Это что, целый класс?! Так нечестно! Я требую модератора!" },
      { do: "boss as glitchBoss; px1 enter right 66; px2 enter right 72; px5 enter right 68; tr1 enter right 70", fx: "glitch", who: "boss",
        say: "Армия! Защищать меня! Битые пиксели, мусорные процессы, вперёд!" },
      { fx: "flash shake", do: "px1 poof; px2 poof; px5 poof; tr1 poof",
        say: "Пиксели лопались, как пупырки на плёнке. Мусорные процессы завершались один за другим, даже не попрощавшись." },
      { if: { "l05-role": "builder" }, fx: "boom:boss shake", do: "boss shake", who: "plata", name: "Матрёна Плата (по рации)", to: "reader",
        say: "Сборщик! Ты ставил память до щелчка. Этот щелчок слышно на весь город. Глюк, это тебе!" },
      { if: { "l05-role": "diag" }, fx: "boom:boss shake", do: "boss shake", who: "plata", name: "Матрёна Плата (по рации)",
        say: "Диагност нашёл слабое место: у Глюка.exe нет POST! Он ни разу себя не проверял! Бей туда!" },
      { if: { "l05-role": "cable" }, fx: "boom:boss shake", do: "boss shake", who: "klava", name: "Клава (по рации)",
        say: "Кабельный маг подключил компьютер к городской сети! Все разъёмы на месте! Ток пошёл!" },
      { if: { "l05-role": null }, fx: "boom:boss shake", do: "boss shake", who: "plata", name: "Матрёна Плата (по рации)",
        say: "Все отряды: огонь по синему экрану!" },
      { if: { "l05-esd": "fast" }, fx: "flash", who: "radik", name: "Радик (по рации)",
        say: "А я на этот раз сначала коснулся корпуса! Вся искра теперь только для Глюка!" },
      { if: { "l05-esd": ["touch", "me", null] }, fx: "flash", who: "radik", name: "Радик (по рации)",
        say: "Разгоняю атаку! Без перегрева, по инструкции. Чувствую себя странно взрослым." },
      { if: { "l05-post": "hit" }, who: "nibble", name: "Нибл (по рации)",
        say: "Глюка можно стукнуть. Его можно! Только его!" },
      { fx: "rumble flash", do: "boss as glitchBossHurt; boss shake", who: "boss", tone: "shout",
        say: "Ай! Ой! Подождите! Дайте хоть сохраниться! Ctrl+S! CTRL+S!" },
      { who: "klava", name: "Клава (по рации)",
        say: "Сохранение недоступно: диск только для чтения. Это я настроила. Пока ты кричал." },
      { do: "boss shake", fx: "glitch", who: "boss",
        say: "Тогда отмена! Ctrl+Z! Ctrl+Z! Верните всё как было!" },
      { who: "bit", name: "Бит (по рации)", tone: "shout",
        say: "Отмены не будет. Shift+Delete. Без корзины." },
      { fx: "boom:boss rumble flash", do: "boss poof",
        say: "Глюк.exe рассыпался на миллион пикселей. Каждый пиксель тихонько сказал «извините». Звучало почти искренне." },
      { fx: "confetti", sfx: "fanfare",
        say: "Площадь взорвалась криками. Тринадцать героев, черепаха, мышь, ёж и один очень гордый рыжий сисадмин." },

      // Утро после битвы: город пуст
      { bg: "street:ruins", mood: null, sfx: "sad", crowd: { from: "students", hide: true },
        say: "Утро. Тишина. Глюка больше нет. Но в битве стёрлось почти всё: дома пустые, экраны чёрные, ни одного огонька." },
      { do: "mega enter left 40; nibble enter left 22; bit enter left 58", who: "mega",
        say: "Как диск после форматирования. Чисто, пусто и немножко грустно." },
      { do: "nibble as nibbleShock", who: "nibble",
        say: "А мой компьютер с песней?" },
      { do: "klava enter right 76", who: "klava",
        say: "Железо целое, его мы спасли. А программ на нём нет. Ни одной. Даже системы." },
      { do: "radik enter right 90; radik as radikHappy", who: "radik",
        say: "Значит, строим с нуля! Чур, я первым ставлю игры!" },
      { do: "plata enter left 8; radik as radik", who: "plata",
        say: "Стоп. С чего начинают строить любой дом?" },
      { do: "bit as bitCool", who: "bit", to: "reader",
        say: "Ты знаешь ответ." },
      { sign: "СНАЧАЛА ФУНДАМЕНТ", do: "klava as klavaHappy", who: "klava",
        say: "С фундамента. А фундамент компьютера это операционная система. Без неё железо просто очень дорогой обогреватель." },
      { sign: null, do: "bit as bit; klava as klava", who: "bit", to: "reader",
        say: "Последнее. Только честно: тебе этот урок зашёл?",
        choice: [
          { label: "Да, зашло", go: "liked-yes", value: "yes" },
          { label: "Так себе", go: "liked-meh", value: "meh" },
          { label: "Честно? Было скучно", go: "liked-no", value: "no" },
        ],
        remember: "l05-liked", required: true },

      { label: "liked-yes", fx: "confetti", do: "bit as bitHappy; bit jump", who: "bit", to: "reader",
        say: "Есть! Нибл, записывай: классу зашло. Капслоком." },
      { do: "nibble as nibbleHappy; nibble bounce", who: "nibble", goto: "hook",
        say: "Записала. Рядом нарисовала Глюка в корзине. Он там хорошо смотрится." },

      { label: "liked-meh", who: "plata",
        say: "«Так себе» тоже честно. Скажи учителю, где было интересно, а где ждал звонка. Так чинят уроки." },
      { do: "radik as radikHappy", who: "radik", goto: "hook",
        say: "Я тоже «так себе». В следующий раз разгоним урок. Шучу. Наверное." },

      { label: "liked-no", sfx: "sad", do: "bit as bitCry", who: "bit", to: "reader",
        say: "Ох. Обидно. Но спасибо, что честно. Скажи учителю, что именно было скучно. Это не жалоба, это баг-репорт." },
      { do: "bit as bit", who: "klava", goto: "hook",
        say: "А баги мы чиним. Это вообще наша работа." },

      { label: "hook", sign: "СЛЕДУЮЩАЯ СЕРИЯ: ОПЕРАЦИОННАЯ СИСТЕМА", fx: "bits", do: "bit as bit; nibble as nibble; radik as radik; klava as klava",
        say: "Конец битвы. Начало стройки. Продолжение следует: «Сначала фундамент: операционная система»." },
    ],
  };
})();
