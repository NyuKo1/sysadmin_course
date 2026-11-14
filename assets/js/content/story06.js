// Сезон 2, урок 6 «Что бывает после кнопки: POST, BIOS, UEFI»: Глюк.exe спрятался в прошивке платы.
// Герои те же, что в уроке 5 (спрайты в assets/js/sprites-hd.js): Матрёна Плата, Радик, Клава, Глюк.exe и Байты.
//
// Выборы (localStorage «story-choices»):
//   l06-key    (del | f12 | all)        как попасть в BIOS                       (intro)
//   l06-radik  (test | max | no)        Радик хочет разогнать всё                 (g2)
//   l06-liked  (yes | meh | no)         понравился ли урок                         (finale)
// Финал вспоминает l06-radik и l05-role из прошлого урока.
(function () {
  const S = (window.STORIES = window.STORIES || {});
  const CAST2 = {
    plata: { name: "Матрёна Плата", sprite: "plata", x: 70, scale: 1.35, color: "#5cf29a", voice: "plata" },
    radik: { name: "Радик", sprite: "radik", x: 84, scale: 1.25, color: "#ff8a5c", voice: "radik" },
    klava: { name: "Клава", sprite: "klava", x: 54, scale: 1.15, color: "#6cc7ff", voice: "klava" },
    boss: { name: "Глюк.exe", sprite: "glitchBoss", x: 80, scale: 2.2, color: "#c58bff", voice: "boss", idle: "float" },
    px1: { name: "Битый пиксель", sprite: "deadPixel", x: 62, scale: 0.95, color: "#ff8a8a", voice: "glitch" },
  };

  // Перед теорией 1: компьютер собран, а Глюк поселился в прошивке
  S["l06-intro"] = {
    title: "Призрак в прошивке",
    cast: CAST2,
    beats: [
      { bg: "lab:on", title: { kicker: "Сезон 2 · серия 2", text: "Призрак в прошивке", sub: "Компьютер собран. Но кто включается раньше Windows?" } },
      { show: { bit: { x: 26, sprite: "bitHappy" }, plata: { x: 70, sprite: "plataHappy" }, klava: { x: 50, sprite: "klava" } },
        say: "Подвал сопротивления. На столе стоит компьютер, который класс собрал на прошлом уроке. Он прошёл POST. Все гордятся им, как первым котёнком." },
      { do: "radik enter right 88; radik as radikHappy", who: "radik",
        say: "Отлично! Теперь ставим Windows, качаем игры, разгоняем до шести гигагерц и..." },
      { sfx: "boot", fx: "flash", bg: "boot", do: "radik as radikShock; bit as bitShock",
        say: "Экран мигнул. Вместо привычного логотипа по нему поползли фиолетовые буквы." },
      { fx: "glitch shake", sfx: "glitch", do: "boss enter right 80; boss as glitchBossLaugh", who: "boss", tone: "shout",
        say: "Сюрприз! Вы разбили моё войско, а я переехал. В ПРОШИВКУ! Теперь я включаюсь раньше Windows, раньше антивируса, раньше всех!" },
      { who: "boss",
        say: "Я перепутал ваш порядок загрузки, выключил защиту и выкрутил вентиляторы на ноль. Спокойной ночи, Памятьвиль!" },
      { fx: "smoke:80", do: "boss poof", bg: "lab:on",
        say: "Глюк.exe рассыпался на пиксели и спрятался где-то в микросхеме на плате." },
      { do: "nibble enter left 10; nibble as nibbleShock", who: "nibble",
        say: "Он что, живёт в компьютере, который мы собрали? Я туда больше пальцем не полезу." },
      { do: "plata as plata", who: "plata",
        say: "Спокойно. Где он прячется, мы знаем. Это BIOS, а точнее UEFI: первая программа, которая просыпается после кнопки. Она проверяет железо, а потом решает, кого запустить." },
      { who: "mega", do: "mega enter left 40",
        say: "В моё время BIOS был синий, страшный и без мышки. И мы были счастливы! Ну, почти." },
      { do: "bit as bit", who: "bit", to: "reader",
        say: "Чтобы выгнать Глюка, надо попасть в настройки BIOS. Ты знаешь, как туда войти?",
        choice: [
          { label: "Жать Delete при включении", go: "key-del", value: "del" },
          { label: "Жать F12, вроде так", go: "key-f12", value: "f12" },
          { label: "Жать все клавиши сразу", go: "key-all", value: "all" },
        ],
        remember: "l06-key", after: "go" },
      { label: "key-del", do: "bit as bitHappy; bit jump", who: "bit", goto: "go",
        say: "Точно! На большинстве настольных плат это Delete, иногда F2. Жать нужно сразу, пока горит логотип." },
      { label: "key-f12", who: "klava", goto: "go",
        say: "Почти. F12 часто открывает не настройки, а меню загрузки: выбрать, с чего загрузиться один раз. Настройки обычно на Delete или F2. Разберём, чем они отличаются." },
      { label: "key-all", do: "radik as radikHappy", who: "radik",
        say: "Мой метод! Иногда даже работает." },
      { who: "plata", goto: "go",
        say: "Иногда. А иногда попадёшь в три меню сразу и ни в одно нормально. Клавиша пишется внизу экрана при старте, её просто надо успеть прочитать." },
      { label: "go", do: "plata as plataHappy", who: "plata", sign: "ЗАДАЧА: ВЕРНУТЬ ПОРЯДОК ЗАГРУЗКИ",
        say: "Начнём с того, что Глюк испортил первым: порядок загрузки. Слушайте, что происходит с компьютером после нажатия кнопки." },
    ],
  };

  // После игры 1, перед теорией 2 (Secure Boot и TPM)
  S["l06-g1"] = {
    title: "Чужой загрузчик",
    cast: CAST2,
    beats: [
      { bg: "boot:uefi", show: { bit: { x: 24, sprite: "bitCool" }, klava: { x: 46, sprite: "klavaHappy" } },
        say: "Порядок загрузки вернули: первым снова идёт диск с Windows. Экран настроек сияет синим." },
      { do: "klava bounce", who: "klava",
        say: "Красота. Флешка вторая, сеть выключена. Глюк, где ты теперь?" },
      { sfx: "alarm", fx: "glitch", do: "px1 enter right 70", who: "px1",
        say: "Посылка! Новый загрузчик для Windows, очень быстрый, очень честный. Подписи нет, но вы же мне верите?" },
      { do: "bit as bitAngry", who: "bit",
        say: "Это же его загрузчик! Если он запустится раньше Windows, никакой антивирус его не увидит." },
      { do: "plata enter right 86", who: "plata",
        say: "Для этого и придумали Secure Boot. Плата проверяет подпись каждого загрузчика. Нет подписи, или она поддельная, или загрузчик в чёрном списке: не пускаем." },
      { fx: "boom:px1", do: "px1 poof", sfx: "zap",
        say: "Ворота Secure Boot захлопнулись. Пиксель-курьер разлетелся вместе с посылкой." },
      { who: "plata", sign: "ЗАДАЧА: ВКЛЮЧИТЬ ЗАЩИТУ",
        say: "Но Глюк выключил Secure Boot ещё и в настройках. Разберёмся, как работают подписи и что за сейф живёт на плате, TPM." },
    ],
  };

  // После игры 2, перед теорией 3 (полезные настройки и разгон)
  S["l06-g2"] = {
    title: "Шесть гигагерц",
    cast: CAST2,
    beats: [
      { bg: "boot:uefi", show: { radik: { x: 70, sprite: "radikHappy" }, bit: { x: 26, sprite: "bit" } },
        say: "Защита включена. Пока все радовались, Радик тихо подкрался к клавиатуре." },
      { do: "radik jump", who: "radik", tone: "shout",
        say: "Раз уж мы в BIOS... Частота процессора: шесть гигагерц! Напряжение: полтора вольта! Вентиляторы: кому они нужны?" },
      { do: "bit as bitShock", who: "bit", to: "reader",
        say: "Стой! Что скажешь Радику?",
        choice: [
          { label: "Разгоняй, но маленькими шагами и с тестом", go: "r-test", value: "test" },
          { label: "Давай на максимум, что может пойти не так?", go: "r-max", value: "max" },
          { label: "Нет. Не трогай разгон вообще", go: "r-no", value: "no" },
        ],
        remember: "l06-radik", after: "after" },
      { label: "r-test", do: "radik as radik", who: "radik",
        say: "Маленькими шагами... это скучно. Но ладно. Шаг, тест, шаг, тест. Как настоящий оверклокер." },
      { who: "plata", goto: "after",
        say: "Именно так разгоняют взрослые. Каждый шаг проверяют стресс-тестом и следят за температурой." },
      { label: "r-max", sfx: "boom", fx: "shake smoke:70", do: "radik as radikShock",
        say: "Радик нажал F10. Компьютер пискнул, вентиляторы молча стоят, из-под кулера поднялась тоненькая струйка дыма." },
      { who: "radik", do: "radik shake", goto: "after",
        say: "Это... это пар. От скорости. Ладно, это дым. Плата сама сбросила настройки. Кажется, нам повезло." },
      { label: "r-no", do: "radik as radikAngry", who: "radik",
        say: "Вообще? Ну хоть память! У нас DDR5-6000, а работает на 4800!" },
      { who: "klava", goto: "after",
        say: "А вот это честно. Профиль памяти EXPO можно включить: это не самодеятельность, а паспортная частота планки." },
      { label: "after", do: "radik as radik", who: "plata", sign: "ЗАДАЧА: НАСТРОИТЬ С УМОМ",
        say: "В BIOS десятки полезных настроек, которые дома можно и нужно трогать. И пара таких, которые трогать без понимания нельзя. Разберёмся, где какие." },
    ],
  };

  // После практики на настоящем ПК: перед теорией 4 и боссом
  S["l06-storm"] = {
    title: "Гроза над Памятьвилем",
    cast: CAST2,
    beats: [
      { bg: "lab", mood: "dark", sfx: "alarm", fx: "flash",
        show: { plata: { x: 70, sprite: "plataShock" }, bit: { x: 26, sprite: "bitShock" }, mega: { x: 44, sprite: "mega" } },
        say: "Настройки поправили, но Глюк всё ещё сидит в старой прошивке. Выгнать его можно только одним способом: обновить BIOS. А за окном началась гроза." },
      { who: "mega", do: "mega as megaHappy",
        say: "Обновлять BIOS в грозу? Помню, в девяносто восьмом мы так обновляли. Мигнул свет, и плата больше никогда не проснулась. Мы её похоронили под кактусом." },
      { do: "bit as bitShock", who: "bit",
        say: "Почему? Это же просто программа." },
      { who: "plata",
        say: "Программа, которую стирают и пишут заново прямо в микросхему. Если питание пропадёт на середине, там останется половина старой и половина новой. Плате не с чего стартовать." },
      { fx: "glitch", sfx: "glitch", do: "boss enter right 84; boss as glitchBossLaugh", who: "boss",
        say: "Обновляйте, обновляйте! А я тут подожду, у выключателя. И у кота. И у вашего младшего брата." },
      { do: "klava enter left 56; klava as klavaHappy", who: "klava",
        say: "А у нас бесперебойник. И плата с двумя BIOS. И кнопка Flashback на задней панели. Мы подготовились, Глюк." },
      { who: "plata", sign: "ФИНАЛЬНАЯ БИТВА: ПРОШИВКА",
        say: "Сначала теория: как обновлять безопасно и как откатиться, если всё-таки не повезло. Потом битва." },
    ],
  };

  // Финал: после победы над боссом
  S["l06-finale"] = {
    title: "Свежая прошивка",
    cast: CAST2,
    beats: [
      { bg: "boot:flash", say: "Полоска прогресса дошла до конца. Плата перезагрузилась на новой прошивке." },
      { bg: "lab:on", mood: null, fx: "confetti", sfx: "fanfare",
        show: { bit: { x: 26, sprite: "bitHappy" }, nibble: { x: 10, sprite: "nibbleHappy" }, plata: { x: 70, sprite: "plataHappy" }, klava: { x: 50, sprite: "klavaHappy" }, radik: { x: 86, sprite: "radikHappy" } },
        say: "Глюка.exe в прошивке больше нет. Secure Boot включён, TPM на месте, порядок загрузки правильный, а вентиляторы снова крутятся." },
      { if: { "l06-radik": "max" }, who: "radik",
        say: "И я больше не ставлю полтора вольта. Теперь только шаг и тест. Дым мне не понравился, он пах грустью." },
      { if: { "l06-radik": "test" }, who: "radik",
        say: "Плюс двенадцать процентов, стабильно, семьдесят девять градусов! Всё по-честному, как ты сказал." },
      { if: { "l06-radik": "no" }, who: "radik",
        say: "Память на 6000, как на коробке. Ладно, ты был прав: это тоже разгон, только честный." },
      { if: { "l05-role": "diag" }, who: "klava",
        say: "Ты же у нас диагност. Теперь знаешь, что проверять, если компьютер вдруг «не видит» флешку: CSM, порядок загрузки и меню загрузки." },
      { who: "mega",
        say: "А я обновил бы BIOS ещё раз. Просто посмотреть на полоску. Красивая." },
      { do: "bit as bit", who: "bit", to: "reader",
        say: "Слушай, честно: тебе этот урок зашёл?",
        choice: [
          { label: "Да, было круто", go: "liked-yes", value: "yes" },
          { label: "Так себе", go: "liked-meh", value: "meh" },
          { label: "Скучно", go: "liked-no", value: "no" },
        ],
        remember: "l06-liked", after: "hook" },
      { label: "liked-yes", do: "bit as bitHappy; bit jump", who: "bit", goto: "hook",
        say: "Ура! Тогда дома загляни в BIOS своего компьютера со взрослыми. Только смотри и ничего не прошивай без плана." },
      { label: "liked-meh", who: "plata", goto: "hook",
        say: "Скажи учителю, что было интересно, а что нет. Так уроки становятся лучше." },
      { label: "liked-no", sfx: "sad", do: "bit as bitCry", who: "bit", goto: "hook",
        say: "Эх. Спасибо, что честно. Расскажи учителю, где было скучно. Это не жалоба, это баг-репорт." },
      { label: "hook", sign: "СЛЕДУЮЩАЯ СЕРИЯ: ДИСКИ И РАЗДЕЛЫ", fx: "bits", do: "bit as bit",
        say: "BIOS готов. Теперь ему нужно, куда загружаться. Продолжение следует: «Диски и разделы»." },
    ],
  };
})();
