// Программа курса. Поле file: страница урока, когда она готова.
// Поле pass: отпечаток пароля к уроку, secret: тот же пароль, зашифрованный паролем учителя.
// Оба поля делает tools/password.html, там же можно прочитать пароли по secret.
// TEACHER_PASS открывает все уроки сразу.
window.TEACHER_PASS = "374a2317";
window.COURSE = [
  { month: 1, title: "Компьютер изнутри", district: "Центр Памятьвиля", lessons: [
    { n: 1, title: "Знакомство и обзор комплектующих", done: true },
    { n: 2, title: "Язык компьютера: биты и байты", file: "lessons/02.html", pass: "be93c9a2", secret: "z0aBRl1xgH2Ud4B5kiLTJGs77j/+OuM=" },
    { n: 3, title: "Мозг и память: процессор, RAM, плата", file: "lessons/03.html", pass: "3ea76f3d", secret: "dsKtwejzrA9R6a3Fw8ldrkim/lM+qchVTA==" },
    { n: 4, title: "Хранение и картинка: диски, видеокарта, порты", file: "lessons/04.html", pass: "81c35bab", secret: "HRL4fest+Gl3GfhhxBMJOT54kThUd6g37nWSN0Q=" },
  ]},
  { month: 2, title: "Сборка, BIOS и система", district: "Процессорск", lessons: [
    { n: 5, title: "Как собирают ПК" },
    { n: 6, title: "Что бывает после кнопки: POST, BIOS, UEFI" },
    { n: 7, title: "Диски и разделы" },
    { n: 8, title: "Установка Windows 10 LTSC и драйверы" },
  ]},
  { month: 3, title: "Как работают программы", district: "Драйверная улица", lessons: [
    { n: 9, title: "Что такое ОС" },
    { n: 10, title: "Файлы, пути, командная строка" },
    { n: 11, title: "Windows, Linux, macOS, Android" },
    { n: 12, title: "Как устроены приложения и игры" },
  ]},
  { month: 4, title: "Программирование и дизайн", district: "Пиксельный квартал", lessons: [
    { n: 13, title: "Как из 0 и 1 получается картинка" },
    { n: 14, title: "Цвет: RGB, CMYK, HEX" },
    { n: 15, title: "Как из кода получается программа" },
    { n: 16, title: "x86, ARM, MIPS: почему программа работает по-разному" },
  ]},
  { month: 5, title: "Сети и домашний интернет", district: "Сетевой порт", lessons: [
    { n: 17, title: "Как компьютеры разговаривают" },
    { n: 18, title: "IP-адреса, маски, DHCP, порты" },
    { n: 19, title: "Как устроен интернет" },
    { n: 20, title: "Домашний роутер по-взрослому" },
  ]},
  { month: 6, title: "Серверы, сервисы и твои данные", district: "Облачная гора", lessons: [
    { n: 21, title: "Клиент и сервер" },
    { n: 22, title: "Как работают YouTube и Telegram" },
    { n: 23, title: "Куки, трекеры и цифровой след" },
    { n: 24, title: "Если продукт бесплатный, продукт это ты" },
  ]},
  { month: 7, title: "Безопасность и атаки", district: "Крепость Файрвол", lessons: [
    { n: 25, title: "Вирусы и как работает антивирус" },
    { n: 26, title: "Пароли, 2FA, фишинг" },
    { n: 27, title: "Виды атак и почему они работают" },
    { n: 28, title: "Firewall, шифрование, VPN, бэкапы" },
  ]},
  { month: 8, title: "Этичный хакинг и ИТ в компаниях", district: "Офисный район", lessons: [
    { n: 29, title: "Этичный хакинг и закон" },
    { n: 30, title: "Радиоэфир и беспроводные сети" },
    { n: 31, title: "ИТ большой компании: AD, почта, firewall" },
    { n: 32, title: "Кто есть кто в ИТ" },
  ]},
  { month: 9, title: "ИИ и финал", district: "Нейрополис", lessons: [
    { n: 33, title: "Как устроен ИИ" },
    { n: 34, title: "Как работать с ИИ" },
    { n: 35, title: "Большое повторение" },
    { n: 36, title: "Экзамен и выпускной" },
  ]},
];

window.LEVELS = [
  { name: "Бит", xp: 0 },
  { name: "Байт", xp: 300 },
  { name: "Килобайт", xp: 1000 },
  { name: "Мегабайт", xp: 2200 },
  { name: "Гигабайт", xp: 3500 },
  { name: "Терабайт", xp: 5000 },
];
