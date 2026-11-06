// Игры урока 5 «Как собирают ПК» (движок assets/js/games/arena.js, формат конфига описан там).
// 1. l05-compat: магазин деталей, собери совместимый ПК под заказ.
// 2. l05-build: собери ПК на столе и в корпусе в правильном порядке.
// 3. l05-fix: «Не включается!», найди причину по уликам.
// Цены условные (порядок цен 2025–2026 года), характеристики реальных моделей округлены.
(function () {
  const A = (window.Arena = window.Arena || { data: {}, kinds: {} });
  A.data = A.data || {};
  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ============================================================
  // 1. Совместимость
  // ============================================================
  // cpu: socket, mem (что умеет контроллер памяти), watt (тепло и потребление под нагрузкой), igpu, tier
  // mb: socket, ff, mem, m2, slots;  ram: type, gb, sticks;  gpu: watt, len, tier
  // disk: kind (m2|sata|hdd), tb;  psu: watt, gold, noname, ff;  case: ff[], gpuMax, coolerMax, bays, rad, psu, quiet
  // cooler: tdp, h, sockets, aio
  const P = [];
  const add = (cat, from, id, name, price, o) => P.push(Object.assign({ cat, from, id, name, price }, o));

  // процессоры
  add("cpu", 1, "r5-5600g", "AMD Ryzen 5 5600G", 10500, { socket: "AM4", mem: ["DDR4"], watt: 88, igpu: true, tier: 2 });
  add("cpu", 1, "i3-12100f", "Intel Core i3-12100F", 7000, { socket: "LGA1700", mem: ["DDR4", "DDR5"], watt: 89, igpu: false, tier: 1 });
  add("cpu", 1, "i5-12400", "Intel Core i5-12400", 12500, { socket: "LGA1700", mem: ["DDR4", "DDR5"], watt: 117, igpu: true, tier: 2 });
  add("cpu", 1, "r5-7600", "AMD Ryzen 5 7600", 17000, { socket: "AM5", mem: ["DDR5"], watt: 88, igpu: true, tier: 3 });
  add("cpu", 2, "r5-5600", "AMD Ryzen 5 5600", 8500, { socket: "AM4", mem: ["DDR4"], watt: 76, igpu: false, tier: 2 });
  add("cpu", 2, "i5-13400f", "Intel Core i5-13400F", 15000, { socket: "LGA1700", mem: ["DDR4", "DDR5"], watt: 148, igpu: false, tier: 3 });
  add("cpu", 3, "r7-7800x3d", "AMD Ryzen 7 7800X3D", 38000, { socket: "AM5", mem: ["DDR5"], watt: 120, igpu: true, tier: 4 });
  add("cpu", 3, "i5-14600k", "Intel Core i5-14600K", 25000, { socket: "LGA1700", mem: ["DDR4", "DDR5"], watt: 181, igpu: true, tier: 4 });
  add("cpu", 4, "r7-9700x", "AMD Ryzen 7 9700X", 29000, { socket: "AM5", mem: ["DDR5"], watt: 88, igpu: true, tier: 4 });
  add("cpu", 4, "u5-245k", "Intel Core Ultra 5 245K", 24000, { socket: "LGA1851", mem: ["DDR5"], watt: 159, igpu: true, tier: 4 });

  // материнские платы
  add("mb", 1, "a520m", "MSI A520M-A PRO", 5500, { socket: "AM4", ff: "mATX", mem: "DDR4", m2: 1, slots: 2 });
  add("mb", 1, "h610m", "ASUS PRIME H610M-E D4", 6500, { socket: "LGA1700", ff: "mATX", mem: "DDR4", m2: 1, slots: 2 });
  add("mb", 1, "b650m", "ASUS PRIME B650M-A", 13500, { socket: "AM5", ff: "mATX", mem: "DDR5", m2: 2, slots: 4 });
  add("mb", 2, "b550", "Gigabyte B550 GAMING X V2", 10500, { socket: "AM4", ff: "ATX", mem: "DDR4", m2: 2, slots: 4 });
  add("mb", 2, "b760m-d4", "MSI PRO B760M-A DDR4", 10500, { socket: "LGA1700", ff: "mATX", mem: "DDR4", m2: 2, slots: 4 });
  add("mb", 2, "b760-d5", "MSI PRO B760-P (DDR5)", 12500, { socket: "LGA1700", ff: "ATX", mem: "DDR5", m2: 2, slots: 4 });
  add("mb", 3, "b650-tom", "MSI MAG B650 TOMAHAWK", 19000, { socket: "AM5", ff: "ATX", mem: "DDR5", m2: 3, slots: 4 });
  add("mb", 4, "b860m", "ASUS PRIME B860M-A", 15000, { socket: "LGA1851", ff: "mATX", mem: "DDR5", m2: 2, slots: 4 });
  add("mb", 5, "b650i", "ASRock B650I Lightning", 19500, { socket: "AM5", ff: "Mini-ITX", mem: "DDR5", m2: 2, slots: 2 });
  add("mb", 5, "b760i-d4", "Gigabyte B760I AORUS PRO DDR4", 17000, { socket: "LGA1700", ff: "Mini-ITX", mem: "DDR4", m2: 2, slots: 2 });

  // память
  add("ram", 1, "d4-8", "8 ГБ DDR4-2666 (1×8)", 1600, { type: "DDR4", gb: 8, sticks: 1 });
  add("ram", 1, "d4-16", "16 ГБ DDR4-3200 (2×8)", 3200, { type: "DDR4", gb: 16, sticks: 2 });
  add("ram", 1, "d5-16", "16 ГБ DDR5-5600 (1×16)", 4200, { type: "DDR5", gb: 16, sticks: 1 });
  add("ram", 1, "d5-32", "32 ГБ DDR5-6000 (2×16)", 9500, { type: "DDR5", gb: 32, sticks: 2 });
  add("ram", 2, "d4-32", "32 ГБ DDR4-3600 (2×16)", 6500, { type: "DDR4", gb: 32, sticks: 2 });
  add("ram", 4, "d5-64", "64 ГБ DDR5-6000 (2×32)", 19000, { type: "DDR5", gb: 64, sticks: 2 });

  // видеокарты (длина конкретной модели)
  add("gpu", 1, "gtx1650", "GeForce GTX 1650 4 ГБ", 13000, { watt: 75, len: 170, tier: 1, pwr: "без доп. питания" });
  add("gpu", 1, "rtx5060", "GeForce RTX 5060 8 ГБ", 32000, { watt: 145, len: 240, tier: 2, pwr: "8-pin" });
  add("gpu", 2, "rtx3050", "GeForce RTX 3050 6 ГБ", 17000, { watt: 70, len: 175, tier: 1, pwr: "без доп. питания" });
  add("gpu", 2, "rx7600", "Radeon RX 7600 8 ГБ", 27000, { watt: 165, len: 250, tier: 2, pwr: "8-pin" });
  add("gpu", 3, "rtx5070", "GeForce RTX 5070 12 ГБ", 62000, { watt: 250, len: 300, tier: 3, pwr: "16-pin" });
  add("gpu", 3, "rx9070xt", "Radeon RX 9070 XT 16 ГБ", 72000, { watt: 304, len: 330, tier: 3, pwr: "2×8-pin" });
  add("gpu", 4, "rtx5080", "GeForce RTX 5080 16 ГБ", 120000, { watt: 360, len: 340, tier: 4, pwr: "16-pin" });
  add("gpu", 5, "rtx5070-sff", "GeForce RTX 5070 SFF 12 ГБ", 64000, { watt: 250, len: 250, tier: 3, pwr: "16-pin" });

  // накопители
  add("disk", 1, "sata512", "SSD SATA 2,5\" 512 ГБ", 3500, { kind: "sata", tb: 0.5 });
  add("disk", 1, "nvme1", "SSD NVMe M.2 1 ТБ PCIe 4.0", 6500, { kind: "m2", tb: 1 });
  add("disk", 2, "nvme2", "SSD NVMe M.2 2 ТБ PCIe 4.0", 12000, { kind: "m2", tb: 2 });
  add("disk", 3, "hdd4", "HDD 3,5\" 4 ТБ 7200 об/мин", 9000, { kind: "hdd", tb: 4 });

  // блоки питания
  add("psu", 1, "noname500", "Noname «500 Вт» без сертификата", 1900, { watt: 500, noname: true, ff: "ATX" });
  add("psu", 1, "b550w", "550 Вт 80 PLUS Bronze", 4800, { watt: 550, ff: "ATX" });
  add("psu", 2, "b650w", "650 Вт 80 PLUS Bronze", 5800, { watt: 650, ff: "ATX" });
  add("psu", 3, "g750w", "750 Вт 80 PLUS Gold, ATX 3.1", 9500, { watt: 750, gold: true, ff: "ATX" });
  add("psu", 4, "g850w", "850 Вт 80 PLUS Gold, ATX 3.1", 12000, { watt: 850, gold: true, ff: "ATX" });
  add("psu", 4, "g1000w", "1000 Вт 80 PLUS Gold, ATX 3.1", 16500, { watt: 1000, gold: true, ff: "ATX" });
  add("psu", 5, "sfx650", "SFX 650 Вт 80 PLUS Gold", 11000, { watt: 650, gold: true, ff: "SFX" });

  // корпуса
  add("case", 1, "case-matx", "Мини-башня mATX, 1 вентилятор", 3200, { ff: ["mATX", "Mini-ITX"], gpuMax: 280, coolerMax: 155, bays: 1, rad: false, psu: "ATX" });
  add("case", 1, "case-cheap", "ATX бюджетный, глухая передняя панель", 3500, { ff: ["ATX", "mATX", "Mini-ITX"], gpuMax: 300, coolerMax: 150, bays: 2, rad: false, psu: "ATX" });
  add("case", 2, "case-air", "ATX Midi Tower, сетчатый перед", 6500, { ff: ["ATX", "mATX", "Mini-ITX"], gpuMax: 360, coolerMax: 165, bays: 2, rad: true, psu: "ATX", airflow: true });
  add("case", 4, "case-quiet", "ATX тихий, шумоизоляция", 9500, { ff: ["ATX", "mATX", "Mini-ITX"], gpuMax: 340, coolerMax: 168, bays: 2, rad: true, psu: "ATX", quiet: true, airflow: true });
  add("case", 5, "case-itx", "Компактный Mini-ITX, 12 л", 8000, { ff: ["Mini-ITX"], gpuMax: 270, coolerMax: 67, bays: 0, rad: false, psu: "SFX", airflow: true });

  // кулеры
  const ALL = ["AM4", "AM5", "LGA1700", "LGA1851"];
  add("cooler", 1, "se214", "ID-COOLING SE-214-XT", 1700, { tdp: 180, h: 150, sockets: ALL });
  add("cooler", 1, "gammaxx", "DeepCool GAMMAXX 300 (старая модель)", 1200, { tdp: 130, h: 136, sockets: ["AM4", "AM5"] });
  add("cooler", 2, "ak400", "DeepCool AK400", 2800, { tdp: 220, h: 155, sockets: ALL });
  add("cooler", 3, "pa120", "Thermalright Peerless Assassin 120 SE", 3600, { tdp: 245, h: 157, sockets: ALL, quiet: true });
  add("cooler", 3, "aio240", "Водянка (СЖО) 240 мм", 7500, { tdp: 260, h: 0, aio: true, sockets: ALL, quiet: true });
  add("cooler", 5, "is40x", "ID-COOLING IS-40X V3 (низкий, 45 мм)", 1500, { tdp: 100, h: 45, sockets: ALL });
  add("cooler", 5, "axp90", "Thermalright AXP90-X53 (низкий, 53 мм)", 3000, { tdp: 120, h: 53, sockets: ALL });

  // короткие подписи на карточках
  P.forEach((p) => {
    const t = {
      cpu: () => [p.socket, p.mem.join("/"), `${p.watt} Вт`, p.igpu ? "есть встройка" : "без встройки"],
      mb: () => [p.socket, p.ff, p.mem, `M.2 × ${p.m2}`, `слотов ОЗУ: ${p.slots}`],
      ram: () => [p.type, `${p.gb} ГБ`, p.sticks === 1 ? "1 планка" : `${p.sticks} планки`],
      gpu: () => [`${p.watt} Вт`, `${p.len} мм`, p.pwr],
      disk: () => [p.kind === "m2" ? "M.2 NVMe" : p.kind === "sata" ? "SATA 2,5\"" : "3,5\" HDD", `${String(p.tb).replace(".", ",")} ТБ`],
      psu: () => [`${p.watt} Вт`, p.ff, p.gold ? "Gold" : p.noname ? "без сертификата" : "Bronze"],
      case: () => [p.ff.join("/"), `GPU до ${p.gpuMax} мм`, `кулер до ${p.coolerMax} мм`, p.rad ? "СЖО 240" : "", `3,5": ${p.bays}`, `БП ${p.psu}`],
      cooler: () => [`до ${p.tdp} Вт`, p.aio ? "радиатор 240 мм" : `высота ${p.h} мм`, p.sockets.join("/")],
    }[p.cat]();
    p.tags = t.filter(Boolean).join(" · ");
  });

  function err(key, text, why, slots) { return { sev: "err", key, text, why, slots }; }
  function warn(key, text, why, slots) { return { sev: "warn", key, text, why, slots }; }
  const disks = (b) => [b.ssd, b.extra].filter(Boolean);
  const totalTb = (b) => disks(b).reduce((a, d) => a + d.tb, 0);

  function power(b) {
    if (!Object.keys(b).length) return 0;
    return (b.cpu ? b.cpu.watt : 0) + (b.gpu ? b.gpu.watt : 0) + 50 + disks(b).length * 8;
  }

  function checks(b, c) {
    const out = [];
    const { cpu, mb, ram, gpu, ssd, psu, cooler } = b;
    const cs = b.case;
    if (cpu && mb && cpu.socket !== mb.socket) out.push(err("socket", `Сокет: процессор ${cpu.socket}, плата ${mb.socket}`, `Процессор ${cpu.name} сделан под сокет ${cpu.socket}, а плата под ${mb.socket}. Другое число и расположение контактов: он просто не встанет.`, ["cpu", "mb"]));
    if (ram && mb && ram.type !== mb.mem) out.push(err("ramtype", `Память ${ram.type}, а плата под ${mb.mem}`, `У ${ram.type} и ${mb.mem} вырез (ключ) на планке в разных местах, в чужой слот она не войдёт. Читай название платы: B760 бывает в версии DDR4 и в версии DDR5.`, ["ram", "mb"]));
    if (ram && cpu && !mb && !cpu.mem.includes(ram.type)) out.push(err("cpumem", `${cpu.name} не умеет ${ram.type}`, `Контроллер памяти сидит в процессоре. ${cpu.socket === "AM4" ? "AM4 работает только с DDR4." : "AM5 и LGA1851 работают только с DDR5."}`, ["ram", "cpu"]));
    if (ram && mb && ram.sticks > mb.slots) out.push(err("slots", `Планок ${ram.sticks}, слотов ${mb.slots}`, "Планок больше, чем слотов на плате.", ["ram", "mb"]));
    if (mb && cs && !cs.ff.includes(mb.ff)) out.push(err("ff", `Плата ${mb.ff} не влезет в корпус`, `Корпус принимает ${cs.ff.join(", ")}. Размеры плат: ATX 305×244 мм, mATX 244×244, Mini-ITX 170×170. Маленькая плата в большой корпус встаёт, большая в маленький нет.`, ["mb", "case"]));
    if (gpu && cs && gpu.len > cs.gpuMax) out.push(err("gpulen", `Видеокарта ${gpu.len} мм, а влезает до ${cs.gpuMax} мм`, `Видеокарта длиной ${gpu.len} мм упрётся в переднюю стенку или корзину дисков: корпус берёт карты до ${cs.gpuMax} мм. Длину ищи в характеристиках и корпуса, и конкретной модели карты.`, ["gpu", "case"]));
    if (cpu && cooler && !cooler.sockets.includes(cpu.socket)) out.push(err("mount", `У кулера нет крепления под ${cpu.socket}`, `Крепления кулеров зависят от сокета. AM5 повторяет крепление AM4, а у LGA1700 и LGA1851 отверстия расставлены шире, чем у старых Intel. Старый кулер без нового крепления не поставить.`, ["cooler", "cpu"]));
    if (cpu && cooler && cooler.tdp < cpu.watt) out.push(err("tdp", `Кулер до ${cooler.tdp} Вт, процессор греется на ${cpu.watt} Вт`, `Под нагрузкой ${cpu.name} выделяет около ${cpu.watt} Вт тепла, а кулер рассчитан на ${cooler.tdp} Вт. Процессор упрётся в предельную температуру и начнёт сбрасывать частоты (троттлинг).`, ["cooler", "cpu"]));
    if (cooler && cs && cooler.aio && !cs.rad) out.push(err("rad", "Некуда поставить радиатор 240 мм", "Водянке нужно место под радиатор 240 мм (два вентилятора 120 мм) сверху или спереди. В этом корпусе его нет.", ["cooler", "case"]));
    if (cooler && cs && !cooler.aio && cooler.h > cs.coolerMax) out.push(err("height", `Кулер ${cooler.h} мм, а влезает до ${cs.coolerMax} мм`, `Башня высотой ${cooler.h} мм упрётся в боковую крышку, она не закроется. Корпус берёт кулеры до ${cs.coolerMax} мм.`, ["cooler", "case"]));
    if (psu && cs && cs.psu === "SFX" && psu.ff !== "SFX") out.push(err("psuff", "Обычный ATX-блок не влезет", "Компактный корпус рассчитан на маленький блок формата SFX. ATX-блок больше и в него не встанет.", ["psu", "case"]));
    if (psu && psu.noname) out.push(err("noname", "Блок без сертификата и защит", "На наклейке «500 Вт», а честно он выдаёт около 300 и не имеет нормальных защит. При перегрузке или скачке может утянуть за собой плату и видеокарту. На блоке питания не экономят.", ["psu"]));
    if (psu && c.power) {
      const need = Math.ceil((c.power * 1.3) / 10) * 10;
      if (psu.watt < c.power) out.push(err("psuw", `БП ${psu.watt} Вт, а нужно ≈ ${c.power} Вт`, `Сборка под нагрузкой берёт около ${c.power} Вт, блок на ${psu.watt} Вт её не потянет.`, ["psu"]));
      else if (psu.watt < need) out.push(err("headroom", `БП без запаса: нужно от ${need} Вт`, `Нагрузка около ${c.power} Вт, с запасом 30% нужно от ${need} Вт. Видеокарта и процессор дают короткие пики выше среднего, блок впритык уходит в защиту и выключает ПК, а ещё громко шумит.`, ["psu"]));
    }
    if (cpu && !gpu && !cpu.igpu) out.push(err("video", "Нет видеовыхода: у процессора нет встройки", `${cpu.name} без встроенной графики (у Intel это буква F, у Ryzen 5000 нет встройки без буквы G). Без видеокарты монитор покажет «Нет сигнала».`, ["cpu", "gpu"]));
    const m2n = disks(b).filter((d) => d.kind === "m2").length;
    if (mb && m2n > mb.m2) out.push(err("m2", `Дисков M.2: ${m2n}, слотов M.2 на плате: ${mb.m2}`, `На плате ${mb.m2} слот M.2. Второй NVMe-диск некуда вставить: возьми плату с двумя слотами или второй диск SATA.`, ["ssd", "extra", "mb"]));
    const hdd = disks(b).filter((d) => d.kind === "hdd").length;
    if (cs && hdd > cs.bays) out.push(err("bays", "Нет места под 3,5\" HDD", "В этом корпусе нет корзины под 3,5-дюймовый жёсткий диск. Бери SSD.", ["extra", "ssd", "case"]));
    if (ram && ram.sticks === 1) out.push(warn("single", "Одна планка: одноканальный режим", "С одной планкой память работает в одноканальном режиме, пропускная способность вдвое ниже. Встройке и играм это заметно.", ["ram"]));
    if (ssd && ssd.kind === "hdd") out.push(warn("hddsys", "Система на HDD будет тормозить", "Windows состоит из тысяч мелких файлов, а HDD медленно читает вразброс. Систему ставят на SSD.", ["ssd"]));
    if (cs && !cs.airflow && c.power > 330) out.push(warn("air", "Глухой перед и горячая сборка", "Глухая передняя панель плохо пропускает воздух: при такой мощности внутри будет жарко и шумно.", ["case"]));
    return out;
  }

  const need = {
    ram: (b, gb, two) => {
      const o = [];
      if (b.ram && b.ram.gb < gb) o.push(err("n-ram", `Нужно от ${gb} ГБ памяти`, `Заказчику нужно от ${gb} ГБ оперативной памяти, а в сборке ${b.ram.gb}.`, ["ram"]));
      if (two && b.ram && b.ram.sticks < 2) o.push(err("n-dual", "Нужен двухканальный режим (2 планки)", "Для игр нужны две планки: двухканальный режим, вдвое шире канал к памяти.", ["ram"]));
      return o;
    },
    gpu: (b, tier, what) => (b.cpu && (!b.gpu || b.gpu.tier < tier) ? [err("n-gpu", `Видеокарта слабовата для ${what}`, `Для ${what} нужна видеокарта уровня ${tier === 2 ? "RTX 5060 / RX 7600" : tier === 3 ? "RTX 5070 / RX 9070 XT" : "RTX 5080"} или выше. Встройка и младшие карты не потянут.`, ["gpu"])] : []),
    cpu: (b, tier, what) => (b.cpu && b.cpu.tier < tier ? [err("n-cpu", "Процессор слабоват для заказа", `${b.cpu.name} будет тормозить ${what}. Нужен процессор помощнее.`, ["cpu"])] : []),
    nvme: (b) => (b.ssd && b.ssd.kind !== "m2" ? [err("n-nvme", "Система должна стоять на NVMe", "Заказчик просит быструю загрузку игр и проектов: системный диск нужен NVMe (M.2).", ["ssd"])] : []),
  };

  A.data["l05-compat"] = {
    kind: "slots",
    title: "Собери совместимую сборку",
    intro: "Ты консультант в магазине деталей. Заказчик называет задачу и бюджет, ты собираешь ПК. Перетащи детали в слоты (или нажми на деталь, потом на слот). Следи за сокетом, типом памяти, размерами, мощностью блока питания и деньгами. Процессоры продаются без кулера.",
    gif: "think",
    lives: 4,
    passLevel: 3,
    headroom: 1.3,
    powerLabel: "Нагрузка на БП",
    cats: [
      { id: "cpu", label: "CPU" }, { id: "mb", label: "Платы" }, { id: "ram", label: "ОЗУ" }, { id: "gpu", label: "Видео" },
      { id: "disk", label: "Диски" }, { id: "psu", label: "БП" }, { id: "case", label: "Корпуса" }, { id: "cooler", label: "Кулеры" },
    ],
    slots: [
      { id: "cpu", label: "Процессор", cat: "cpu" },
      { id: "mb", label: "Материнская плата", cat: "mb" },
      { id: "ram", label: "Память", cat: "ram" },
      { id: "gpu", label: "Видеокарта", cat: "gpu", optional: true },
      { id: "ssd", label: "Системный диск", cat: "disk" },
      { id: "extra", label: "Второй диск", cat: "disk", optional: true },
      { id: "psu", label: "Блок питания", cat: "psu" },
      { id: "case", label: "Корпус", cat: "case" },
      { id: "cooler", label: "Кулер", cat: "cooler" },
    ],
    parts: P,
    power,
    capacity: (b) => (b.psu ? b.psu.watt : 0),
    checks,
    levels: [
      {
        name: "Офисный ПК", hints: "live", time: 150, budget: 40000, reward: 300,
        goal: "Бухгалтерии нужен ПК для браузера, таблиц и видеозвонков. Бюджет 40 000 ₽. Игры не нужны.",
        brief: ["Видеокарта не обязательна, если у процессора есть встроенная графика.", "Проблемы совместимости подсвечиваются сразу.", "Памяти нужно от 16 ГБ: браузер с десятком вкладок съедает много."],
        need: (b) => need.ram(b, 16, false),
      },
      {
        name: "Игровой под 1080p", hints: "live", time: 150, budget: 85000, reward: 350,
        goal: "Школьник хочет играть в Full HD на высоких настройках. Бюджет 85 000 ₽.",
        brief: ["Нужна видеокарта уровня RTX 5060 / RX 7600 и выше.", "Память: от 16 ГБ двумя планками (двухканал).", "Блок питания берут с запасом 30% к нагрузке."],
        need: (b) => [...need.gpu(b, 2, "игр в 1080p"), ...need.ram(b, 16, true), ...need.cpu(b, 2, "в играх")],
      },
      {
        name: "Игровой под 1440p", hints: "quiet", time: 180, budget: 140000, reward: 400,
        goal: "Стример хочет 1440p и высокий FPS. Бюджет 140 000 ₽. Система на NVMe.",
        brief: ["С этого уровня подсказок о совместимости нет: только шкалы бюджета и нагрузки. Ошибки увидишь после проверки.", "Нужна видеокарта уровня RTX 5070 / RX 9070 XT, процессор не слабее Ryzen 5 7600, 32 ГБ памяти.", "Сверяй длину видеокарты с корпусом."],
        need: (b) => [...need.gpu(b, 3, "1440p"), ...need.cpu(b, 3, "в играх на высоком FPS"), ...need.ram(b, 32, true), ...need.nvme(b)],
      },
      {
        name: "Тихий ПК для монтажа", hints: "quiet", time: 180, budget: 160000, reward: 450,
        goal: "Видеомонтажёр: 4K-проекты, много памяти и места, ночью ПК должен быть почти беззвучным. Бюджет 160 000 ₽.",
        brief: ["Процессор топового уровня (8 ядер или мощный Intel), от 64 ГБ памяти.", "Система на NVMe, всего дисков от 3 ТБ.", "Тихий корпус с шумоизоляцией, блок Gold, кулер с запасом 30% по теплу: тогда вентиляторы крутятся медленно.", "Видеокарта уровня RTX 5060 и выше: она ускоряет кодирование видео."],
        need: (b) => {
          const o = [...need.cpu(b, 4, "на рендере 4K"), ...need.ram(b, 64, true), ...need.nvme(b), ...need.gpu(b, 2, "ускорения монтажа")];
          if (b.ssd && totalTb(b) < 3) o.push(err("n-tb", "Мало места: нужно от 3 ТБ", `Сейчас дисков на ${String(totalTb(b)).replace(".", ",")} ТБ. 4K-исходники занимают сотни гигабайт: добавь второй диск.`, ["extra"]));
          if (b.case && !b.case.quiet) o.push(err("n-quiet", "Корпус не тихий", "Для тихого ПК нужен корпус с шумоизоляцией.", ["case"]));
          if (b.psu && !b.psu.gold) o.push(err("n-gold", "Нужен блок Gold", "Блок 80 PLUS Gold меньше греется, его вентилятор крутится медленнее и тише.", ["psu"]));
          if (b.cooler && b.cpu && b.cooler.tdp < b.cpu.watt * 1.3) o.push(err("n-cool", "Кулер без запаса: будет шуметь", `Нужен кулер от ${Math.ceil(b.cpu.watt * 1.3)} Вт: с запасом вентиляторы крутятся медленно и тихо.`, ["cooler"]));
          return o;
        },
      },
      {
        name: "Компактный ПК для гостиной", hints: "quiet", time: 180, budget: 150000, reward: 500,
        goal: "Игровой ПК размером с приставку под телевизором: корпус Mini-ITX 12 л, игры в 1440p. Бюджет 150 000 ₽.",
        brief: ["Корпус только компактный Mini-ITX: проверь плату, блок питания (SFX), высоту кулера и длину видеокарты.", "Видеокарта уровня RTX 5070, 32 ГБ памяти, система на NVMe.", "Места под 3,5\" HDD в маленьком корпусе нет."],
        need: (b) => {
          const o = [...need.gpu(b, 3, "1440p"), ...need.ram(b, 32, true), ...need.nvme(b)];
          if (b.case && b.case.id !== "case-itx") o.push(err("n-itx", "Нужен компактный корпус", "Заказчик хочет ПК размером с приставку: только компактный Mini-ITX корпус.", ["case"]));
          return o;
        },
      },
    ],
  };

  // ============================================================
  // 2. Сборка на столе
  // ============================================================
  const ICON = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">${inner}</svg>`;
  const ITEMS = {
    esd: { label: "Антистатический браслет", icon: ICON('<circle cx="12" cy="9" r="6" fill="none" stroke="#6cc7ff" stroke-width="3"/><path d="M12 15v8" stroke="#e0a458" stroke-width="2"/>') },
    cpu: { label: "Процессор", rotate: true, icon: ICON('<rect x="2" y="2" width="20" height="20" fill="#c0c6cc" stroke="#14161c"/><rect x="7" y="7" width="10" height="10" fill="#8a929c"/><path d="M3 21V14L10 21Z" fill="#e0a458"/>') },
    paste: { label: "Термопаста", icon: ICON('<rect x="3" y="9" width="13" height="6" fill="#d8dde3"/><rect x="16" y="10" width="4" height="4" fill="#9aa1b2"/><rect x="20" y="11" width="3" height="2" fill="#e6efe9"/>') },
    cooler: { label: "Кулер", icon: ICON('<rect x="2" y="2" width="20" height="20" rx="3" fill="#39424b"/><circle cx="12" cy="12" r="8" fill="#1d2a23"/><path d="M12 12L12 4L16 6ZM12 12L20 12L18 16ZM12 12L12 20L8 18ZM12 12L4 12L6 8Z" fill="#9aa1b2"/><circle cx="12" cy="12" r="2" fill="#e0a458"/>') },
    fan: { label: "Кабель вентилятора кулера", icon: ICON('<path d="M2 20C8 4 14 22 19 7" stroke="#e0a458" fill="none" stroke-width="2"/><rect x="16" y="2" width="7" height="5" fill="#14161c" stroke="#e6efe9"/>') },
    ram: { label: "Планка памяти", icon: ICON('<rect x="1" y="7" width="22" height="9" fill="#2d6cdf"/><rect x="3" y="9" width="4" height="4" fill="#14161c"/><rect x="9" y="9" width="4" height="4" fill="#14161c"/><rect x="15" y="9" width="4" height="4" fill="#14161c"/><rect x="1" y="16" width="22" height="2" fill="#e0a458"/>') },
    m2: { label: "SSD M.2", icon: ICON('<rect x="1" y="9" width="22" height="6" fill="#1d2a23" stroke="#5cf29a"/><rect x="5" y="10" width="5" height="4" fill="#3a4a42"/><rect x="12" y="10" width="5" height="4" fill="#3a4a42"/>') },
    screw: { label: "Винт M.2", icon: ICON('<circle cx="12" cy="12" r="7" fill="#c0c6cc" stroke="#14161c"/><path d="M8 12h8M12 8v8" stroke="#3a4a42" stroke-width="2"/>') },
    standoffs: { label: "Стойки платы", icon: ICON('<circle cx="6" cy="7" r="3" fill="#e0a458"/><circle cx="17" cy="7" r="3" fill="#e0a458"/><circle cx="6" cy="17" r="3" fill="#e0a458"/><circle cx="17" cy="17" r="3" fill="#e0a458"/>') },
    io: { label: "Заглушка I/O", icon: ICON('<rect x="7" y="1" width="10" height="22" fill="#c0c6cc"/><rect x="9" y="3" width="6" height="3" fill="#14161c"/><rect x="9" y="8" width="6" height="5" fill="#14161c"/><rect x="9" y="15" width="6" height="2" fill="#14161c"/>') },
    board: { label: "Материнская плата", icon: ICON('<rect x="2" y="1" width="20" height="22" fill="#2f7a50"/><rect x="7" y="5" width="7" height="7" fill="#c0c6cc"/><rect x="16" y="4" width="2" height="9" fill="#14161c"/><rect x="5" y="15" width="12" height="2" fill="#14161c"/>') },
    psu: { label: "Блок питания", icon: ICON('<rect x="1" y="5" width="22" height="14" fill="#3a4a42" stroke="#14161c"/><circle cx="10" cy="12" r="5" fill="#14161c"/><path d="M6 12h8M10 8v8" stroke="#9aa1b2"/>') },
    gpu: { label: "Видеокарта", icon: ICON('<rect x="1" y="7" width="22" height="10" fill="#39424b"/><circle cx="7" cy="12" r="4" fill="#14161c"/><circle cx="17" cy="12" r="4" fill="#14161c"/><rect x="3" y="17" width="12" height="2" fill="#e0a458"/>') },
    ssd25: { label: "SSD SATA 2,5\"", icon: ICON('<rect x="3" y="4" width="18" height="16" fill="#6e7482" stroke="#14161c"/><rect x="6" y="8" width="12" height="5" fill="#e6efe9"/>') },
    c24: { label: "Кабель 24-pin (ATX)", icon: ICON('<rect x="8" y="1" width="9" height="16" fill="#14161c" stroke="#e6efe9"/><path d="M10 17v6M12 17v6M14 17v6" stroke="#ffe066"/>') },
    eps: { label: "Кабель CPU 8-pin (EPS)", icon: ICON('<rect x="5" y="3" width="14" height="9" fill="#14161c" stroke="#e6efe9"/><text x="12" y="10" font-size="6" text-anchor="middle" fill="#ffe066" font-family="monospace">CPU</text><path d="M9 12v10M15 12v10" stroke="#ffe066"/>') },
    pcie: { label: "Кабель PCIe 8-pin (6+2)", icon: ICON('<rect x="5" y="3" width="14" height="9" fill="#14161c" stroke="#e6efe9"/><text x="12" y="10" font-size="5" text-anchor="middle" fill="#6cc7ff" font-family="monospace">PCIe</text><path d="M9 12v10M15 12v10" stroke="#6cc7ff"/>') },
    sata: { label: "Кабель SATA (данные)", icon: ICON('<path d="M3 21V9h14" stroke="#ff6b6b" stroke-width="3" fill="none"/><rect x="15" y="5" width="7" height="7" fill="#ff6b6b" stroke="#14161c"/>') },
    satapwr: { label: "Питание SATA от БП", icon: ICON('<path d="M3 21V12h12" stroke="#14161c" stroke-width="4" fill="none"/><rect x="13" y="8" width="10" height="7" fill="#14161c" stroke="#e6efe9"/>') },
    fp: { label: "Провода передней панели", icon: ICON('<path d="M3 3c4 8 2 14 6 18M8 3c3 8 3 14 6 18M13 3c2 8 4 14 7 18" stroke-width="2" fill="none" stroke="#ff8fa3"/><path d="M5 3c3 8 3 14 6 18" stroke="#e6efe9" stroke-width="2" fill="none"/>') },
  };

  // Сцена: вид сбоку на открытый корпус (задняя стенка слева) и та же плата крупно.
  const T = (id, x, y, w, h, label, when) => `<rect data-target="${id}" data-label="${label}" x="${x}" y="${y}" width="${w}" height="${h}"${when ? ` data-when="${when}"` : ""}/>`;
  const L = (x, y, t, a) => `<text class="sc-l" x="${x}" y="${y}"${a ? ` text-anchor="${a}"` : ""}>${t}</text>`;
  const SCENE = `
  <g data-when="!board&view:board"><rect x="0" y="0" width="320" height="400" fill="#2b2118"/><rect x="34" y="34" width="222" height="272" fill="#5a4630"/>${L(145, 318, "плата лежит на коробке", "middle")}</g>
  <g data-when="board|view:case">
    <rect x="6" y="6" width="308" height="388" rx="6" fill="#1a1f24" stroke="#59636e" stroke-width="3"/>
    <rect x="14" y="14" width="292" height="300" fill="#22282e"/>
    <rect x="16" y="48" width="14" height="64" fill="#0b0d10"/>
    <rect x="14" y="318" width="292" height="70" fill="#2d343b"/>
    <rect x="262" y="20" width="40" height="120" fill="#8b949e"/>${L(282, 84, "металл", "middle")}
    <rect x="280" y="2" width="22" height="8" rx="3" fill="#59636e"/><circle cx="291" cy="6" r="3" fill="#5cf29a" data-when="power"/>${L(270, 8, "кнопка", "end")}
    <g fill="#59636e" data-when="!standoffs">${[[50, 50], [150, 50], [240, 50], [50, 170], [150, 170], [240, 170], [50, 290], [150, 290], [240, 290]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join("")}</g>
    <g fill="#e0a458" data-when="standoffs">${[[50, 50], [150, 50], [240, 50], [50, 170], [150, 170], [240, 170], [50, 290], [150, 290], [240, 290]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join("")}</g>
    <rect x="16" y="48" width="14" height="64" fill="#c0c6cc" data-when="io"/>
    <g data-when="psu"><rect x="20" y="326" width="120" height="58" fill="#3a4a42" stroke="#14161c"/><circle cx="80" cy="355" r="22" fill="#14161c"/>${L(80, 358, "БП", "middle")}</g>
    <g data-when="sata-ssd"><rect x="206" y="340" width="70" height="34" fill="#6e7482" stroke="#14161c"/>${L(241, 360, "SSD", "middle")}</g>
    ${L(80, 352, "место под БП", "middle").replace("<text", '<text data-when="!psu"')}
    ${L(250, 360, "корзина дисков", "middle").replace("<text", '<text data-when="!sata-ssd"')}
    ${T("case-frame", 262, 20, 40, 120, "Металл корпуса")}
    ${T("case-io", 12, 44, 24, 72, "Окно для заглушки I/O")}
    ${T("case-tray", 40, 40, 210, 260, "Место под плату (стойки)", "!board")}
    ${T("case-psu", 18, 322, 126, 64, "Отсек блока питания")}
    ${T("case-bay", 200, 330, 104, 52, "Корзина дисков", "!sata-ssd")}
    ${T("ssd-pwr", 276, 334, 28, 46, "Разъём питания SSD", "sata-ssd")}
    ${T("power-btn", 272, 0, 40, 18, "Кнопка питания")}
  </g>
  <g data-when="board|view:board">
    <rect x="40" y="40" width="210" height="260" fill="#1d4a33" stroke="#0f2e1e" stroke-width="2"/>
    <rect x="40" y="50" width="22" height="60" fill="#7a828c"/>
    <rect x="66" y="58" width="24" height="12" fill="#3a4a42"/><rect x="66" y="74" width="12" height="46" fill="#3a4a42"/>
    <rect x="95" y="75" width="50" height="50" fill="#b9c0c7"/><rect x="100" y="80" width="40" height="40" fill="#d4a648" data-when="!cpu"/>
    <path d="M97 123L97 113L107 123Z" fill="#fff4e0"/>
    <path d="M150 126L150 76" stroke="#e6efe9" stroke-width="3" data-when="!lever-open|lever-close"/>
    <path d="M150 126L172 84" stroke="#e6efe9" stroke-width="3" data-when="lever-open&!lever-close"/>
    <g data-when="cpu"><rect x="100" y="80" width="40" height="40" fill="#c0c6cc" stroke="#14161c"/><path d="M101 119L101 111L109 119Z" fill="#e0a458"/>${L(120, 103, "CPU", "middle")}</g>
    <circle cx="120" cy="100" r="5" fill="#9aa1b2" data-when="paste&!cooler"/>
    <g data-when="cooler"><circle cx="120" cy="100" r="33" fill="#39424b" stroke="#14161c"/><circle cx="120" cy="100" r="27" fill="#1a1f24"/><path d="M120 100L120 76L132 80ZM120 100L144 100L140 112ZM120 100L120 124L108 120ZM120 100L96 100L100 88Z" fill="#9aa1b2"/><circle cx="120" cy="100" r="5" fill="#e0a458"/></g>
    <path d="M140 76C150 66 152 56 157 48" stroke="#e0a458" stroke-width="2" fill="none" data-when="cpufan"/>
    <rect x="56" y="43" width="26" height="9" fill="#14161c"/>${L(69, 62, "CPU_PWR", "middle")}
    <rect x="150" y="44" width="14" height="6" fill="#14161c"/>${L(157, 41, "CPU_FAN", "middle")}
    <rect x="140" y="288" width="14" height="6" fill="#14161c"/>${L(147, 285, "SYS_FAN", "middle")}
    ${[["A1", 172, "#3a4a42"], ["A2", 186, "#6e7482"], ["B1", 200, "#3a4a42"], ["B2", 214, "#6e7482"]].map(([n, x, c]) => `<rect x="${x}" y="58" width="8" height="120" fill="${c}"/>${L(x + 4, 54, n, "middle")}`).join("")}
    <rect x="185" y="60" width="10" height="116" fill="#2d6cdf" data-when="ram-a2"/>
    <rect x="213" y="60" width="10" height="116" fill="#2d6cdf" data-when="ram-b2"/>
    <rect x="236" y="90" width="11" height="60" fill="#14161c"/>${L(241, 160, "ATX 24", "middle")}
    <rect x="80" y="145" width="8" height="12" fill="#14161c"/><circle cx="168" cy="151" r="2" fill="#e0a458"/>${L(70, 154, "M.2", "middle")}
    <g data-when="m2"><rect x="86" y="146" width="82" height="10" fill="#14161c" stroke="#5cf29a"/><rect x="96" y="148" width="16" height="6" fill="#3a4a42"/><rect x="120" y="148" width="16" height="6" fill="#3a4a42"/></g>
    <circle cx="168" cy="151" r="4" fill="#c0c6cc" stroke="#14161c" data-when="m2screw"/>
    <rect x="70" y="180" width="130" height="7" fill="#14161c"/>${L(135, 176, "PCIEX16_1", "middle")}
    <rect x="70" y="238" width="130" height="7" fill="#14161c"/>${L(135, 256, "PCIEX16_2 (x4)", "middle")}
    <rect x="205" y="195" width="25" height="30" fill="#3a4a42"/>
    <rect x="238" y="248" width="10" height="28" fill="#14161c"/>${L(243, 244, "SATA", "end")}
    <rect x="199" y="287" width="34" height="8" fill="#14161c"/>${L(216, 283, "F_PANEL", "middle")}
    <g data-when="gpu"><rect x="60" y="182" width="6" height="44" fill="#c0c6cc"/><rect x="66" y="186" width="232" height="36" fill="#2a2f36" stroke="#14161c"/><circle cx="130" cy="204" r="15" fill="#14161c"/><circle cx="210" cy="204" r="15" fill="#14161c"/><rect x="226" y="188" width="18" height="8" fill="#14161c"/>${L(180, 230, "видеокарта", "middle")}</g>
    <path d="M22 330C22 200 24 60 60 47" stroke="#ffe066" stroke-width="3" fill="none" stroke-dasharray="6 3" data-when="ceps"/>
    <path d="M120 326C200 300 290 200 247 150" stroke="#ffe066" stroke-width="5" fill="none" data-when="c24"/>
    <path d="M60 326C80 300 260 270 235 196" stroke="#6cc7ff" stroke-width="3" fill="none" data-when="cpcie"/>
    <path d="M243 276C250 300 240 320 236 340" stroke="#ff6b6b" stroke-width="2" fill="none" data-when="csata"/>
    <path d="M140 350C200 340 280 330 290 356" stroke="#9aa1b2" stroke-width="3" fill="none" data-when="csatapwr"/>
    <path d="M216 295C240 310 300 300 296 20" stroke="#ff8fa3" stroke-width="2" fill="none" data-when="fpanel"/>
    ${T("socket", 92, 72, 54, 56, "Сокет процессора")}
    ${T("lever", 146, 66, 30, 64, "Рычаг сокета")}
    ${T("hdr-eps", 50, 36, 38, 30, "Разъём CPU_PWR 8-pin")}
    ${T("hdr-cpufan", 146, 34, 24, 18, "Разъём CPU_FAN")}
    ${T("hdr-sysfan", 134, 280, 26, 18, "Разъём SYS_FAN")}
    ${T("ram-a1", 169, 50, 14, 130, "Слот DIMM A1")}
    ${T("ram-a2", 183, 50, 14, 130, "Слот DIMM A2")}
    ${T("ram-b1", 197, 50, 14, 130, "Слот DIMM B1")}
    ${T("ram-b2", 211, 50, 14, 130, "Слот DIMM B2")}
    ${T("hdr-24", 230, 86, 20, 80, "Разъём ATX 24-pin")}
    ${T("m2", 76, 140, 82, 28, "Слот M.2", "!m2")}
    ${T("m2screw", 158, 140, 22, 22, "Отверстие под винт M.2", "m2")}
    ${T("pcie1", 66, 170, 138, 22, "Верхний слот PCIe x16", "!gpu")}
    ${T("pcie2", 66, 230, 138, 30, "Нижний слот PCIe x16 (x4)")}
    ${T("gpu-pwr", 218, 178, 34, 22, "Разъём питания видеокарты", "gpu")}
    ${T("hdr-sata", 236, 244, 22, 36, "Порты SATA")}
    ${T("hdr-fp", 194, 276, 42, 26, "Разъём F_PANEL (передняя панель)")}
  </g>`;

  const RAM_WHY = "Для двух планок нужны A2 и B2 (второй и четвёртый слот от процессора). Так написано в инструкции почти любой платы: так работает двухканальный режим и лучше держится частота.";
  const RAM_WRONG = { "ram-a1": RAM_WHY, "ram-b1": RAM_WHY };
  const RAM_WHERE = "Память идёт в слоты DIMM справа от сокета.";
  const BOARD_WORK = ["lever-open", "cpu", "lever-close", "paste", "cooler", "cpufan", "ram-a2", "ram-b2", "m2", "m2screw"];
  const CASE_WORK = ["esd", "standoffs", "io", "board", "psu", "gpu", "c24", "ceps", "cpcie", "fpanel", "power"];
  const SATA = ["sata-ssd", "csata", "csatapwr"];

  A.data["l05-build"] = {
    kind: "assembly",
    title: "Сборка на столе",
    intro: "Собери ПК, как на настоящем уроке: сначала всё, что удобно поставить на плату на столе, потом корпус, видеокарта и кабели. Тащи детали на сцену или нажми деталь, потом место. Неправильный порядок или место стоит жизни, зато сразу объясним почему. Переключай вид: «Корпус» и «Плата крупно».",
    gif: "laptop",
    lives: 5,
    passLevel: 2,
    scene: { svg: SCENE, views: { case: "0 0 320 400", board: "34 30 226 276" }, viewNames: { case: "Корпус", board: "Плата крупно" }, start: "case" },
    items: ITEMS,
    steps: [
      { id: "esd", title: "Сними статику: коснись металла корпуса", item: "esd", target: "case-frame", view: "case", hint: "Надень браслет и прицепи его к голому металлу корпуса.", wrong: {}, where: "Браслет цепляют к некрашеному металлу корпуса." },
      { id: "lever-open", title: "Открой рычаг сокета", target: "lever", need: ["esd"], view: "board", hint: "Нажми на рычаг справа от сокета: отожми и подними.", early: "Сначала сними статику: заряд с пальцев может убить контакты сокета и процессор." },
      { id: "cpu", title: "Поставь процессор по треугольнику", item: "cpu", target: "socket", need: ["lever-open"], rotate: 0, view: "board", hint: "Поверни процессор кнопкой ⟳, чтобы золотой треугольник совпал с меткой сокета (левый нижний угол).", early: "Рычаг сокета закрыт: сначала открой его, иначе процессор не ляжет, а ножки сокета погнутся.", rotateWhy: "Золотой треугольник на процессоре должен совпасть с треугольником на сокете. Процессор кладут ровно сверху, без нажима: он встаёт только в одном положении.", where: "Процессор ставят в сокет." },
      { id: "lever-close", title: "Закрой рычаг сокета", target: "lever", need: ["cpu"], view: "board", hint: "Нажми на рычаг ещё раз: он прижмёт процессор. Небольшое усилие нормально.", early: "Процессор ещё не стоит в сокете." },
      { id: "paste", title: "Нанеси термопасту", item: "paste", target: "socket", need: ["lever-close"], view: "board", hint: "Тащи тюбик на процессор и выбери количество.", early: "Пасту наносят на процессор, который уже стоит в сокете и прижат рычагом.", where: "Паста идёт на крышку процессора.",
        choice: { q: "Сколько пасты?", options: [
          { t: "Горошину в центр: кулер сам разровняет", ok: true },
          { t: "Толстым слоем на всю крышку и на сокет", why: "Лишняя паста лезет по краям на плату. Паста проводит тепло хуже металла: нужен тонкий слой, который только заполняет микронеровности." },
          { t: "Без пасты: кулер же плотно прижат", why: "Между металлами остаются микрозазоры с воздухом, а воздух плохо проводит тепло. Процессор перегреется за минуты." },
        ] } },
      { id: "cooler", title: "Поставь кулер", item: "cooler", target: "socket", need: ["paste"], view: "board", hint: "Тащи кулер на процессор.", early: "Кулер ставят после процессора и пасты.", where: "Кулер ставят на процессор.",
        choice: { q: "Перед тем как поставить кулер:", options: [
          { t: "Снять защитную плёнку с подошвы", ok: true },
          { t: "Оставить плёнку, она защитит подошву от царапин", why: "Плёнка работает как одеяло: процессор упрётся в предельную температуру и начнёт тормозить или выключаться. Это одна из самых частых ошибок первой сборки." },
          { t: "Протереть подошву пальцем от пыли", why: "Жир с пальцев ухудшает контакт. Подошву не трогают руками, а если надо, протирают спиртом." },
        ] } },
      { id: "cpufan", title: "Подключи вентилятор кулера в CPU_FAN", item: "fan", target: "hdr-cpufan", need: ["cooler"], view: "board", hint: "Разъём CPU_FAN у верхнего края платы.", early: "Сначала поставь кулер.", wrong: { "hdr-sysfan": "SYS_FAN для корпусных вентиляторов. Кулер процессора идёт в CPU_FAN: плата следит за его оборотами и без него выдаст ошибку «CPU Fan Error»." }, where: "Ищи разъём CPU_FAN у верхнего края платы." },
      { id: "ram-a2", title: "Вставь первую планку памяти", item: "ram", target: "ram-a2", need: ["esd"], view: "board", hint: "Для двух планок производитель велит слоты A2 и B2: второй и четвёртый от процессора. Защёлки должны щёлкнуть.", early: "Сначала сними статику.", wrong: RAM_WRONG, where: RAM_WHERE },
      { id: "ram-b2", title: "Вставь вторую планку памяти", item: "ram", target: "ram-b2", need: ["esd"], view: "board", hint: "Вторая планка в B2: четвёртый слот от процессора.", early: "Сначала сними статику.", wrong: RAM_WRONG, where: RAM_WHERE },
      { id: "m2", title: "Вставь SSD M.2", item: "m2", target: "m2", need: ["esd"], view: "board", hint: "SSD входит в слот под углом около 30 градусов, потом его прижимают.", early: "Сначала сними статику.", where: "SSD M.2 ставят в слот M.2 между сокетом и видеокартой." },
      { id: "m2screw", title: "Закрепи SSD винтом", item: "screw", target: "m2screw", need: ["m2"], view: "board", hint: "Винт (или защёлка) на дальнем конце диска.", early: "Сначала вставь SSD в слот.", where: "Винт прижимает дальний конец SSD M.2." },
      { id: "standoffs", title: "Вкрути стойки в корпус", item: "standoffs", target: "case-tray", need: ["esd"], view: "case", hint: "Стойки ставят под отверстия платы: плата не должна касаться металла.", early: "Сначала сними статику." },
      { id: "io", title: "Поставь заглушку I/O", item: "io", target: "case-io", need: ["esd"], view: "case", hint: "Заглушка защёлкивается в окно на задней стенке. На многих новых платах она уже встроена.", early: "Сначала сними статику.", where: "Заглушку I/O вставляют в прямоугольное окно на задней стенке корпуса." },
      { id: "board", title: "Установи плату в корпус", item: "board", target: "case-tray", need: ["standoffs", "io"], view: "case", hint: "Совмести порты с заглушкой и отверстия со стойками, закрути винты.", early: "Плату ставят на стойки и после заглушки I/O: без стоек плата закоротит на корпус, а заглушку потом уже не вставить.", where: "Плату ставят на стойки в корпусе." },
      { id: "psu", title: "Поставь блок питания", item: "psu", target: "case-psu", need: ["esd"], view: "case", hint: "Отсек внизу, вентилятором к решётке.", early: "Сначала сними статику.", where: "Блок питания живёт в нижнем отсеке." },
      { id: "sata-ssd", title: "Поставь SSD 2,5\" в корзину", item: "ssd25", target: "case-bay", need: ["esd"], view: "case", hint: "Корзина дисков в нижней части.", early: "Сначала сними статику.", where: "Диски 2,5\" ставят в корзину дисков." },
      { id: "gpu", title: "Поставь видеокарту в верхний PCIe x16", item: "gpu", target: "pcie1", need: ["board"], view: "board", hint: "Сначала снимают заглушки слотов на задней стенке. Карта щёлкает защёлкой слота.", early: "Видеокарту ставят, когда плата уже в корпусе: иначе плату не вставить, а слот легко сломать.", wrong: { pcie2: "Нижний длинный слот часто подключён к чипсету всего четырьмя линиями (x4). Верхний PCIe x16 идёт прямо от процессора всеми 16 линиями." }, where: "Видеокарта идёт в верхний длинный слот PCIe x16." },
      { id: "c24", title: "Подключи 24-pin к плате", item: "c24", target: "hdr-24", need: ["board", "psu"], view: "board", hint: "Самый широкий разъём на правом краю платы. Дави до щелчка защёлки.", early: "Нужны и плата в корпусе, и блок питания на месте.", where: "24-pin вставляют в длинный разъём на правом краю платы." },
      { id: "ceps", title: "Подключи CPU 8-pin (EPS)", item: "eps", target: "hdr-eps", need: ["board", "psu"], view: "board", hint: "Разъём CPU_PWR в левом верхнем углу платы, возле процессора.", early: "Нужны и плата в корпусе, и блок питания на месте.", wrong: { "gpu-pwr": "Это кабель EPS (подписан CPU) для процессора. Видеокарте нужен PCIe 6+2. Разъёмы похожи, но распиновка разная: путать их опасно." }, where: "EPS 8-pin идёт в разъём CPU_PWR в левом верхнем углу." },
      { id: "cpcie", title: "Подключи питание видеокарты", item: "pcie", target: "gpu-pwr", need: ["gpu", "psu"], view: "board", hint: "Разъём на торце видеокарты.", early: "Сначала поставь видеокарту и блок питания.", wrong: { "hdr-eps": "Это кабель PCIe (подписан PCI-E) для видеокарты. Процессору нужен EPS с надписью CPU. Разъёмы похожи, но распиновка разная." }, where: "Кабель PCIe идёт в разъём на видеокарте." },
      { id: "csata", title: "Подключи SATA-кабель к плате", item: "sata", target: "hdr-sata", need: ["board", "sata-ssd"], view: "board", hint: "Порты SATA на правом краю внизу.", early: "Нужны и плата в корпусе, и SSD в корзине.", where: "SATA-кабель идёт в порт SATA на плате." },
      { id: "csatapwr", title: "Подключи питание SATA к SSD", item: "satapwr", target: "ssd-pwr", need: ["psu", "sata-ssd"], view: "case", hint: "Плоский разъём от блока питания на торец диска.", early: "Нужны и блок питания, и SSD на месте.", where: "Питание SATA идёт к самому диску." },
      { id: "fpanel", title: "Подключи переднюю панель", item: "fp", target: "hdr-fp", need: ["board"], view: "board", hint: "F_PANEL в правом нижнем углу. Сверься с подписями или инструкцией.", early: "Сначала поставь плату в корпус.", where: "Провода кнопок идут в F_PANEL в правом нижнем углу платы.",
        map: {
          title: "Передняя панель F_PANEL",
          text: "Перетащи каждый разъём на его пару пинов. У кнопок полярности нет, у светодиодов плюс обычно цветной провод.",
          legend: "Схема из инструкции: 1 HDD_LED+, 3 HDD_LED−, 5 и 7 RESET, 9 не используется · 2 PLED+, 4 PLED−, 6 и 8 POWER SW, 10 нет пина (ключ). Верхний ряд чётный, нижний нечётный.",
          zones: [
            { id: "z-pled", silk: "PLED+ PLED−", pins: "2 · 4", row: 0, col: 0 },
            { id: "z-pwr", silk: "PWR PWR", pins: "6 · 8", row: 0, col: 1 },
            { id: "z-key", silk: "ключ", pins: "10", row: 0, col: 2, dead: true, pinsList: [1] },
            { id: "z-hdd", silk: "HDD+ HDD−", pins: "1 · 3", row: 1, col: 0 },
            { id: "z-rst", silk: "RST RST", pins: "5 · 7", row: 1, col: 1 },
            { id: "z-nc", silk: "NC", pins: "9", row: 1, col: 2, dead: true, pinsList: [1] },
          ],
          chips: [
            { id: "c-pwr", label: "POWER SW", zone: "z-pwr", why: "POWER SW идёт на пины 6 и 8. Если надеть его на RESET, кнопка питания будет только перезагружать, а включить ПК не получится." },
            { id: "c-rst", label: "RESET SW", zone: "z-rst", why: "RESET SW идёт на пины 5 и 7, в нижний ряд." },
            { id: "c-pled", label: "POWER LED", zone: "z-pled", why: "Светодиод питания (PLED) идёт на пины 2 (+) и 4 (−) в верхнем ряду." },
            { id: "c-hdd", label: "HDD LED", zone: "z-hdd", why: "Светодиод диска (HDD LED) идёт на пины 1 (+) и 3 (−) в нижнем ряду." },
          ],
        } },
      { id: "power", title: "Нажми кнопку питания", target: "power-btn", need: "*", view: "case", hint: "Кнопка на крыше корпуса.", early: "Рано включать: ещё не всё собрано и подключено. Включение недособранного ПК может что-нибудь спалить или просто ничего не покажет." },
    ],
    levels: [
      { name: "Плата на столе", hints: "guided", view: "board", time: 150, steps: ["esd", ...BOARD_WORK],
        goal: "Подготовь плату вне корпуса: процессор, паста, кулер, память, SSD. Подсказки ведут по шагам.",
        brief: ["Сначала сними статику: браслет к металлу корпуса (вид «Корпус»).", "Процессор поворачивай кнопкой ⟳ до совпадения треугольников.", "Подсвеченное место показывает, куда ставить."] },
      { name: "Плата в корпус", hints: "list", time: 180, pre: BOARD_WORK, steps: CASE_WORK,
        goal: "Плата готова. Поставь её в корпус, добавь блок питания и видеокарту, подключи все кабели и кнопки, включи.",
        brief: ["Подсказка показывает только список дел. Порядок думай сам.", "Переключай вид «Плата крупно», чтобы попасть в мелкие разъёмы.", "Передняя панель подписана на плате."] },
      { name: "Полная сборка", hints: "none", labels: false, time: 300, steps: ["esd", ...BOARD_WORK, ...CASE_WORK.slice(1, -1), ...SATA, "power"],
        goal: "Вся сборка с нуля, плюс SATA-диск. Подсказок нет.",
        brief: ["Подписи F_PANEL стёрлись: читай схему из инструкции.", "Каждая ошибка стоит жизни."] },
      { name: "Спидран", hints: "none", labels: false, limit: true, time: 240, timeBonus: 6, steps: ["esd", ...BOARD_WORK, ...CASE_WORK.slice(1, -1), ...SATA, "power"],
        goal: "Та же полная сборка на время: 4 минуты. Не успел: минус жизнь и заново.",
        brief: ["Бонус за каждую оставшуюся секунду удвоен.", "Тащи сразу в вид «Плата крупно»: держи деталь над кнопкой вида, и он переключится."] },
    ],
  };

  // ============================================================
  // 3. «Не включается!»
  // ============================================================
  const CHECKS = [
    { id: "power", verb: "жать", label: "Нажать кнопку питания", cost: 1 },
    { id: "psu-back", verb: "смотреть", label: "Осмотреть БП сзади и розетку", cost: 1, normal: "Кабель 220 В на месте, клавиша на БП в положении I, сетевой фильтр горит." },
    { id: "standby", verb: "смотреть", label: "Дежурный светодиод на плате", cost: 1, normal: "Светодиод на плате горит: дежурное питание 5 В есть." },
    { id: "debug", verb: "смотреть", label: "Лампочки Debug LED", cost: 1, needs: "power", normal: "CPU, DRAM, VGA, BOOT по очереди загорелись и погасли: самотест (POST) пройден.", blocked: "ПК не включается, лампочкам нечего показать." },
    { id: "beep", verb: "слушать", label: "Послушать спикер", cost: 1, needs: "power", normal: "Один короткий писк: POST пройден.", blocked: "Тишина: ПК вообще не стартует." },
    { id: "monitor", verb: "смотреть", label: "Куда подключён монитор", cost: 1, normal: "Кабель монитора в видеокарте, на мониторе выбран нужный вход." },
    { id: "ram", verb: "смотреть", label: "Осмотреть память", cost: 2, normal: "Две планки в A2 и B2, обе защёлки закрыты." },
    { id: "eps", verb: "смотреть", label: "Разъём CPU 8-pin", cost: 1, normal: "EPS 8-pin в углу платы вставлен до щелчка." },
    { id: "atx24", verb: "смотреть", label: "Разъём 24-pin", cost: 1, normal: "24-pin вставлен ровно, защёлка на месте." },
    { id: "gpupwr", verb: "смотреть", label: "Питание видеокарты", cost: 1, normal: "Кабель PCIe в видеокарте, вставлен до щелчка." },
    { id: "fp", verb: "сверить", label: "Провода передней панели", cost: 2, normal: "POWER SW, RESET SW и светодиоды на своих пинах по схеме." },
    { id: "jump", verb: "пробовать", label: "Замкнуть пины POWER SW отвёрткой", cost: 1, normal: "ПК реагирует так же, как на кнопку." },
    { id: "cooler", verb: "смотреть", label: "Осмотреть кулер", cost: 2, normal: "Кулер прижат ровно, вентилятор подключён к CPU_FAN." },
    { id: "temp", verb: "мерить", label: "Температура CPU в BIOS", cost: 2, needs: "screen", normal: "В BIOS около 40 °C в простое: норма.", blocked: "Не получится: на экране нет картинки, BIOS не увидеть." },
    { id: "stress", verb: "мерить", label: "Нагрузка: игра 10 минут", cost: 4, needs: "os", normal: "10 минут в игре: стабильно, процессор около 75 °C.", blocked: "Не получится: система даже не загружается." },
    { id: "label", verb: "читать", label: "Наклейка на блоке питания", cost: 1, normal: "80 PLUS Gold, 750 Вт: с запасом для этой сборки." },
    { id: "bios", verb: "читать", label: "Версия BIOS и список CPU", cost: 3, normal: "Процессор есть в списке поддержки, BIOS свежий." },
  ];
  const DEAD = { power: "Тишина. Ни вентиляторов, ни лампочек.", jump: "Никакой реакции." };
  const NOPOST = { power: "Вентиляторы закрутились, подсветка горит, а монитор пишет «Нет сигнала». Через минуту ничего не меняется." };

  A.data["l05-fix"] = {
    kind: "detective",
    title: "Не включается!",
    intro: "Ты в сервисе Памятьвиля. Приносят свежесобранные ПК, которые не работают. Выбирай проверки: каждая даёт улику, но стоит времени. Потом назови причину. Меньше проверок и быстрее ответ: больше очков. Неверная причина стоит жизни.",
    gif: "bit-facepalm",
    lives: 4,
    passLevel: 3,
    reach: ["off", "power", "post", "screen", "os", "ok"],
    powerCheck: "power",
    reachText: {
      off: "Тишина.",
      power: NOPOST.power,
      post: "Вентиляторы крутятся, один короткий писк, но монитор пишет «Нет сигнала».",
      screen: "Картинка есть, но дальше BIOS не идёт.",
      os: "Включился, Windows загрузилась. Пока всё хорошо.",
      ok: "Всё работает: Windows загружается, игры идут.",
    },
    screens: { off: "Нет сигнала", power: "Нет сигнала", post: "Нет сигнала", screen: "BIOS", os: "Windows", ok: "Windows" },
    checks: CHECKS,
    faults: [
      { id: "psu-switch", group: "mains", reach: "off", name: "Выключена клавиша на блоке питания", complaint: "Собрал, нажимаю кнопку: ноль реакции. Вообще.",
        clues: Object.assign({}, DEAD, { "psu-back": "Клавиша на блоке питания в положении O (выключено).", standby: "Светодиод на плате не горит: дежурного питания нет." }),
        fix: "Перевели клавишу в положение I.", looks: "Тогда не было бы даже дежурного питания, а клавиша на БП стояла бы в положении O." },
      { id: "mains", group: "mains", reach: "off", name: "Не включён кабель 220 В в розетку или фильтр", complaint: "Мертвый. Ни вентилятора, ни лампочки.",
        clues: Object.assign({}, DEAD, { "psu-back": "Кабель в блоке питания есть, а вилка лежит рядом с фильтром. Фильтр не горит.", standby: "Светодиод на плате не горит: дежурного питания нет." }),
        fix: "Включили вилку в фильтр и включили фильтр.", looks: "Тогда не горел бы дежурный светодиод, а вилка или фильтр оказались бы выключены." },
      { id: "atx24", group: "power", reach: "off", name: "24-pin вставлен не до конца", complaint: "Иногда мигает подсветка, но не включается.",
        clues: Object.assign({}, DEAD, { standby: "Светодиод на плате то загорается, то гаснет, если пошевелить толстый кабель.", atx24: "Защёлка 24-pin не защёлкнулась, разъём сидит наполовину." }),
        fix: "Вставили 24-pin до щелчка.", looks: "Тогда дежурка мигала бы при шевелении кабеля, а защёлка 24-pin была бы не закрыта." },
      { id: "fp", group: "button", reach: "off", name: "Провода кнопки на неправильных пинах", complaint: "Жму кнопку, ничего. А на плате что-то светится.",
        clues: { power: "Нажимаешь кнопку: ничего. Хотя на плате горит дежурный светодиод.", jump: "Замкнул пины POWER SW отвёрткой: ПК завёлся!", fp: "POWER SW надет на пины RESET, а RESET на POWER." },
        fix: "Переставили провода по схеме F_PANEL.", looks: "Тогда кнопка не работала бы, дежурка горела, а замыкание пинов POWER SW запускало бы ПК." },
      { id: "eps", group: "cpu", reach: "power", name: "Не подключён CPU 8-pin (EPS)", complaint: "Вентиляторы крутятся, подсветка есть, а картинки нет.", led: "CPU",
        clues: { debug: "Горит CPU и не гаснет.", beep: "Тишина: процессор не стартовал.", eps: "Разъём CPU_PWR в углу платы пустой, кабель свёрнут у блока питания." },
        fix: "Подключили EPS 8-pin.", looks: "Тогда на Debug LED горел бы CPU, а разъём CPU_PWR был бы пуст." },
      { id: "ram", group: "ram", reach: "power", name: "Память не вставлена до щелчка", complaint: "Крутится, светится, пищит, но не показывает.", led: "DRAM",
        clues: { debug: "Горит DRAM и не гаснет.", beep: "Длинные повторяющиеся писки: так BIOS жалуется на память.", ram: "Защёлка на B2 открыта, планка сидит с перекосом." },
        fix: "Вставили планку ровно до щелчка обеих защёлок.", looks: "Тогда горел бы DRAM, спикер пищал бы длинными сигналами, а защёлка памяти была бы открыта." },
      { id: "bios", group: "cpu", reach: "power", name: "Старый BIOS не знает этот процессор", complaint: "Всё проверил, всё вставлено. Крутится, но не стартует.", led: "CPU",
        clues: { debug: "Горит CPU и не гаснет.", beep: "Тишина: процессор не стартовал.", bios: "Процессор вышел позже, чем эта версия BIOS. Нужно обновить BIOS, многие платы умеют это кнопкой Flashback прямо с флешки." },
        fix: "Обновили BIOS через Flashback.", looks: "Тогда при подключённом EPS горел бы CPU, а версия BIOS была бы старше процессора." },
      { id: "gpupwr", group: "gpu", reach: "power", name: "Видеокарта без дополнительного питания", complaint: "Шумит, светится, монитор чёрный.", led: "VGA",
        clues: { debug: "Горит VGA и не гаснет.", beep: "Один длинный и три коротких: видеокарта не найдена.", gpupwr: "На видеокарте пустой разъём 8-pin, рядом светится красный диод." },
        fix: "Подключили кабель PCIe к видеокарте.", looks: "Тогда горел бы VGA, а разъём питания на видеокарте был бы пуст." },
      { id: "monitor", group: "display", reach: "post", name: "Монитор подключён к плате, а не к видеокарте", complaint: "Всё крутится, пискнул один раз, а монитор пишет «Нет сигнала».",
        clues: { monitor: "HDMI воткнут в разъём на задней панели материнской платы, а видеокарта стоит ниже. Когда есть видеокарта, встройка обычно выключена, а у F-процессора её нет вовсе." },
        fix: "Переткнули кабель монитора в видеокарту.", looks: "Тогда POST проходил бы (один писк, лампочки гаснут), а кабель монитора торчал бы из платы." },
      { id: "film", group: "cooling", reach: "os", name: "Не снята плёнка с подошвы кулера", complaint: "Включается нормально, но в игре через пару минут выключается.",
        clues: { temp: "В BIOS уже 88 °C и растёт, хотя нагрузки нет.", stress: "Частота упала вдвое, через пару минут ПК выключился сам.", cooler: "Из-под подошвы кулера торчит прозрачная плёнка с надписью «Remove before use»." },
        fix: "Сняли кулер, убрали плёнку, нанесли свежую пасту.", looks: "Тогда процессор грелся бы даже в BIOS, а под кулером нашлась бы плёнка." },
      { id: "fanhdr", group: "cooling", reach: "os", name: "Вентилятор кулера не подключён", complaint: "При включении пишет про какой-то fan error.", screen: "CPU Fan Error!",
        clues: { power: "Включился, но на экране: «CPU Fan Error! Press F1 to Resume».", cooler: "Вентилятор кулера стоит: его кабель свисает, в CPU_FAN ничего нет.", temp: "70 °C в простое и медленно растёт.", stress: "Через пару минут троттлинг и аварийное выключение." },
        fix: "Подключили вентилятор кулера в CPU_FAN.", looks: "Тогда при старте была бы надпись «CPU Fan Error», а вентилятор кулера стоял бы." },
      { id: "weakpsu", group: "power2", reach: "os", name: "Слабый блок питания", complaint: "В простое всё летает, а в игре ПК резко перезагружается.",
        clues: { stress: "Через минуту игры ПК мгновенно перезагрузился, без синего экрана. Температуры нормальные.", label: "Noname «500 Вт» без сертификата, а производитель видеокарты просит блок от 650 Вт." },
        fix: "Поставили блок 750 Вт Gold.", looks: "Тогда ПК перезагружался бы только под нагрузкой при нормальных температурах, а на наклейке БП было бы меньше рекомендованного." },
    ],
    levels: [
      { name: "Первые заявки", cases: 2, faults: 1, options: 4, time: 120, pool: ["psu-switch", "mains", "fp", "monitor", "eps"],
        goal: "Две заявки, по одной неисправности. Начни с кнопки питания: что крутится, что светится.",
        brief: ["Каждая проверка добавляет минуты. Повторно смотреть улику бесплатно.", "Вариантов причины 4."] },
      { name: "Не стартует", cases: 2, faults: 1, options: 6, time: 120, pool: ["eps", "ram", "gpupwr", "fp", "atx24", "monitor"],
        goal: "Две заявки посложнее: ПК шумит, а картинки нет. Тут помогут Debug LED и спикер.",
        brief: ["Debug LED показывает, на чём застрял самотест: CPU, DRAM, VGA или BOOT.", "Вариантов причины 6."] },
      { name: "Падает под нагрузкой", cases: 3, faults: 1, options: 8, time: 150, pool: ["film", "fanhdr", "weakpsu", "bios", "ram", "atx24", "monitor"],
        goal: "Три заявки. Бывает, что ПК включается, но падает в игре.",
        brief: ["Перегрев и слабый БП выглядят похоже. Разница в температуре.", "Вариантов причины 8."] },
      { name: "Две беды сразу", cases: 2, faults: 2, options: 12, time: 180, base: 200,
        goal: "Две заявки, в каждой по две неисправности. Починишь одну, включаем снова и ищем вторую.",
        brief: ["Первая поломка может прятать вторую: улики проверки, которые требуют загрузки, появятся после ремонта.", "Все 12 вариантов причин."] },
    ],
    scene(st) {
      const on = st.reach !== "off";
      const spin = on ? " ar-spin" : "";
      const leds = ["CPU", "DRAM", "VGA", "BOOT"].map((n, i) => `<rect x="${152 + i * 9}" y="70" width="6" height="4" fill="${st.led === n ? "#ff6b6b" : "#3a4a42"}"/><text x="${155 + i * 9}" y="80" font-size="4" text-anchor="middle" fill="#9bb0a4" font-family="monospace">${n[0]}</text>`).join("");
      const scr = st.screen || "Нет сигнала";
      const desk = scr === "Windows";
      return `<svg class="ar-pc" viewBox="0 0 200 110" role="img" aria-label="Компьютер: ${on ? "включён" : "выключен"}, экран: ${scr}">
        <rect x="4" y="6" width="116" height="74" rx="3" fill="#14161c" stroke="#59636e" stroke-width="2"/>
        <rect x="9" y="11" width="106" height="64" fill="${desk ? "#1f5a8a" : "#050607"}"/>
        ${desk ? `<rect x="9" y="69" width="106" height="6" fill="#0d1210"/><rect x="12" y="70" width="6" height="4" fill="#6cc7ff"/>` : ""}
        <text x="62" y="46" font-size="${scr.length > 12 ? 7 : 9}" text-anchor="middle" fill="${desk ? "#e6efe9" : scr === "Нет сигнала" ? "#6e7482" : "#ff6b6b"}" font-family="monospace">${desk ? "" : scr}</text>
        <rect x="52" y="80" width="20" height="10" fill="#3a4a42"/><rect x="40" y="90" width="44" height="4" fill="#3a4a42"/>
        <rect x="140" y="8" width="54" height="96" rx="3" fill="#1a1f24" stroke="#59636e" stroke-width="2"/>
        <circle cx="185" cy="15" r="2.5" fill="${on ? "#5cf29a" : "#3a4a42"}"/>
        <g transform="translate(167 34)"><g class="${spin}"><circle r="12" fill="#14161c" stroke="#39424b"/><path d="M0 0L0-10L5-8ZM0 0L10 0L8 5ZM0 0L0 10L-5 8ZM0 0L-10 0L-8-5Z" fill="#6e7482"/></g></g>
        ${leds}
        <g transform="translate(167 92)"><g class="${spin}"><circle r="7" fill="#14161c" stroke="#39424b"/><path d="M0 0L0-6L3-5ZM0 0L6 0L5 3ZM0 0L0 6L-3 5ZM0 0L-6 0L-5-3Z" fill="#6e7482"/></g></g>
      </svg>`;
    },
  };
})();
