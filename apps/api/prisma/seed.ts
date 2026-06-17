import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const REGIONS: Array<[string, string, string]> = [
  ['vinnytska-oblast', 'Вінницька область', 'Vinnytsia Oblast'],
  ['volynska-oblast', 'Волинська область', 'Volyn Oblast'],
  ['dnipropetrovska-oblast', 'Дніпропетровська область', 'Dnipropetrovsk Oblast'],
  ['donetska-oblast', 'Донецька область', 'Donetsk Oblast'],
  ['zhytomyrska-oblast', 'Житомирська область', 'Zhytomyr Oblast'],
  ['zakarpatska-oblast', 'Закарпатська область', 'Zakarpattia Oblast'],
  ['zaporizka-oblast', 'Запорізька область', 'Zaporizhzhia Oblast'],
  ['ivano-frankivska-oblast', 'Івано-Франківська область', 'Ivano-Frankivsk Oblast'],
  ['kyivska-oblast', 'Київська область', 'Kyiv Oblast'],
  ['kirovohradska-oblast', 'Кіровоградська область', 'Kirovohrad Oblast'],
  ['luhanska-oblast', 'Луганська область', 'Luhansk Oblast'],
  ['lvivska-oblast', 'Львівська область', 'Lviv Oblast'],
  ['mykolaivska-oblast', 'Миколаївська область', 'Mykolaiv Oblast'],
  ['odeska-oblast', 'Одеська область', 'Odesa Oblast'],
  ['poltavska-oblast', 'Полтавська область', 'Poltava Oblast'],
  ['rivnenska-oblast', 'Рівненська область', 'Rivne Oblast'],
  ['sumska-oblast', 'Сумська область', 'Sumy Oblast'],
  ['ternopilska-oblast', 'Тернопільська область', 'Ternopil Oblast'],
  ['kharkivska-oblast', 'Харківська область', 'Kharkiv Oblast'],
  ['khersonska-oblast', 'Херсонська область', 'Kherson Oblast'],
  ['khmelnytska-oblast', 'Хмельницька область', 'Khmelnytskyi Oblast'],
  ['cherkaska-oblast', 'Черкаська область', 'Cherkasy Oblast'],
  ['chernivetska-oblast', 'Чернівецька область', 'Chernivtsi Oblast'],
  ['chernihivska-oblast', 'Чернігівська область', 'Chernihiv Oblast'],
  ['kyiv', 'м. Київ', 'Kyiv (city)'],
  ['avtonomna-respublika-krym', 'Автономна Республіка Крим', 'Autonomous Republic of Crimea'],
  ['sevastopol', 'м. Севастополь', 'Sevastopol (city)'],
];

const FISH: Array<[string, string, string]> = [
  ['shchuka', 'Щука', 'Pike'],
  ['korop', 'Короп', 'Carp'],
  ['karas', 'Карась', 'Crucian carp'],
  ['sudak', 'Судак', 'Zander'],
  ['okun', 'Окунь', 'Perch'],
  ['som', 'Сом', 'Wels catfish'],
  ['lyn', 'Лин', 'Tench'],
  ['lyashch', 'Лящ', 'Bream'],
  ['plitka', 'Плітка', 'Roach'],
  ['krasnopirka', 'Краснопірка', 'Rudd'],
  ['tovstolob', 'Товстолоб', 'Silver carp'],
  ['bilyi-amur', 'Білий амур', 'Grass carp'],
  ['zherekh', 'Жерех', 'Asp'],
  ['holoven', 'Головень', 'Chub'],
  ['forel', 'Форель', 'Trout'],
  ['osetr', 'Осетер', 'Sturgeon'],
  ['sazan', 'Сазан', 'Wild carp'],
  ['yorzh', 'Йорж', 'Ruffe'],
];

const AMENITIES: Array<[string, string, string]> = [
  ['altanky', 'Альтанки', 'Gazebos'],
  ['nochivlia', 'Ночівля', 'Overnight stay'],
  ['chovny', 'Човни', 'Boats'],
  ['parkovka', 'Парковка', 'Parking'],
  ['kafe', 'Кафе', 'Café'],
  ['mahazyn', 'Магазин', 'Shop'],
  ['prokat-snastei', 'Прокат снастей', 'Tackle rental'],
  ['tualet', 'Туалет', 'Toilet'],
  ['dush', 'Душ', 'Shower'],
  ['elektryka', 'Електрика', 'Electricity'],
];

async function seedDictionaries() {
  for (const [slug, name, nameEn] of REGIONS) {
    await prisma.region.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  for (const [slug, name, nameEn] of FISH) {
    await prisma.fishSpecies.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  for (const [slug, name, nameEn] of AMENITIES) {
    await prisma.amenity.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  for (const [slug, name, nameEn] of RIVERS) {
    await prisma.river.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  console.log(`Rivers seeded: ${RIVERS.length}.`);
}

const RIVERS: Array<[string, string, string]> = [
  ['dnister', 'Дністер', 'Dniester'],
  ['stryi', 'Стрий', 'Stryi'],
  ['zakhidnyi-buh', 'Західний Буг', 'Western Bug'],
  ['vereshchytsia', 'Верещиця', 'Vereshchytsia'],
  ['svicha', 'Свіча', 'Svicha'],
  ['luh', 'Луг', 'Luh'],
  ['stryvihor', 'Стривігор', 'Stryvihor'],
];

type WaterTypeLiteral = 'LAKE' | 'POND' | 'RIVER' | 'RESERVOIR' | 'FISHING_COMPLEX';

interface RealWater {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  district: string;
  lat: number;
  lng: number;
  waterType: WaterTypeLiteral;
  isPaid: boolean;
  priceNote: string;
  priceNoteEn: string;
  fishSlugs: string[];
  amenitySlugs: string[];
  riverSlug?: string;
}

// Verified real Lviv-oblast waters (research workflow 2026-06-15). Copied
// verbatim from docs/superpowers/data/lviv-waters.json (sans _note/sourceUrl).
// slug 'ozero-navariia' is kept stable so demo UGC stays attached.
const REAL_LVIV_WATERS: RealWater[] = [
  {
    slug: 'yavorivske-ozero',
    name: "Яворівське озеро (кар'єр)",
    nameEn: 'Yavoriv Lake (Quarry)',
    description:
      "Яворівський кар'єр (Яворівське озеро) — найглибша штучна водойма України (до 70 м), утворена на місці колишнього сірчаного кар'єру і заповнена водою у 2002–2006 роках. Розташована за 5 км на захід від міста Яворів; площа близько 10 км². Тут ловлять щуку, сазана, карася, окуня та товстолоба; рибалка безкоштовна, найкраще ловити з човна.",
    descriptionEn:
      "Yavoriv Lake (the quarry) is Ukraine's deepest artificial water body (up to 70 m), formed in a former sulfur quarry and filled between 2002 and 2006. It lies about 5 km west of the town of Yavoriv, covering roughly 10 sq km. Anglers catch pike, wild carp, crucian carp, perch and silver carp; fishing is free and best done from a boat.",
    district: 'Яворівський район',
    lat: 49.9492,
    lng: 23.4675,
    waterType: 'RESERVOIR',
    isPaid: false,
    priceNote: 'Рибалка безкоштовна',
    priceNoteEn: 'Fishing is free',
    fishSlugs: ['shchuka', 'sazan', 'karas', 'okun', 'tovstolob'],
    amenitySlugs: ['chovny'],
  },
  {
    slug: 'hamaliivske-vodoskhovyshche',
    name: 'Гамаліївське водосховище («Львівське море»)',
    nameEn: 'Hamaliivka Reservoir (Lviv Sea)',
    description:
      'Руслове водосховище на потоці Яричівському (басейн Полтви) поблизу сіл Гамаліївка та Запитів, приблизно за 5 км від Львова; місцева назва — «Львівське море». Площа близько 0,81 км², максимальна глибина до 4 м. Ловляться окунь, щука, короп, карась, плітка, йорж і товстолоб; риболовля платна.',
    descriptionEn:
      'A channel-type reservoir on the Yarychivskyi stream (Poltva basin) near the villages of Hamaliivka and Zapytiv, about 5 km from Lviv; locally known as the "Lviv Sea." It covers roughly 0.81 sq km with a max depth of about 4 m. Anglers catch perch, pike, carp, crucian carp, roach, ruffe and silver carp; fishing is paid.',
    district: 'Львівський район',
    lat: 49.9042,
    lng: 24.1889,
    waterType: 'RESERVOIR',
    isPaid: true,
    priceNote: 'Платна риболовля: близько 120 грн/доба та 40 грн вхід',
    priceNoteEn: 'Paid fishing: about 120 UAH per day plus 40 UAH entrance',
    fishSlugs: ['okun', 'shchuka', 'korop', 'plitka', 'karas', 'yorzh', 'tovstolob'],
    amenitySlugs: ['parkovka'],
  },
  {
    slug: 'ozero-navariia',
    name: 'Озеро Наварія',
    nameEn: 'Lake Navariya',
    description:
      'Озеро Наварія — штучна водойма поблизу села Наварія у Львівському районі, створена в долині річки Щирки. Розташована неподалік Львова й популярна серед рибалок. Ловлять переважно коропа, карася, ляща, плітку, окуня та щуку; рибальство регулюється правилами УТМР.',
    descriptionEn:
      'Lake Navariya is an artificial water near the village of Navariya in Lviv district, created in the Shchyrka river valley. It lies close to Lviv and is popular with anglers. Common catches include carp, crucian carp, bream, roach, perch and pike; fishing is regulated under UTMR rules.',
    district: 'Львівський район',
    lat: 49.7665,
    lng: 23.9571,
    waterType: 'RESERVOIR',
    isPaid: true,
    priceNote:
      'Водойма закріплена за УТМР; орієнтовно близько 40 грн за добу, для членів УТМР пільгові умови',
    priceNoteEn:
      'Managed by the UTMR association; about 40 UAH per day, discounted for UTMR members',
    fishSlugs: ['korop', 'karas', 'lyashch', 'shchuka', 'okun', 'plitka'],
    amenitySlugs: ['altanky', 'parkovka'],
  },
  {
    slug: 'dobrohostivske-vodoskhovyshche',
    name: 'Доброгостівське водосховище',
    nameEn: 'Dobrohostiv Reservoir',
    description:
      'Штучне озеро площею близько 34 га (макс. глибина 9 м), створене у 1963 році поблизу села Доброгостів Дрогобицького району, за кілька кілометрів від Трускавця. Вода чиста, живиться гірськими потоками. Риболовля платна, за денною відловочною карткою; ловлять коропа, карася, ляща, лина та щуку; водойму також зарибнюють амуром і товстолобом.',
    descriptionEn:
      'An artificial lake of about 34 ha (max depth 9 m), created in 1963 near the village of Dobrohostiv in Drohobych district, a few km from Truskavets. Clean water fed by mountain streams. Fishing is paid via a daily permit; anglers catch carp, crucian carp, bream, tench and pike, and the lake is stocked with grass and silver carp.',
    district: 'Дрогобицький район',
    lat: 49.2571,
    lng: 23.5638,
    waterType: 'RESERVOIR',
    isPaid: true,
    priceNote: 'Денний дозвіл приблизно 300–350 грн. Діє «зловив-відпустив» для коропа понад 5 кг',
    priceNoteEn: 'Daily permit roughly 300–350 UAH. Catch-and-release for carp over 5 kg',
    fishSlugs: ['korop', 'karas', 'shchuka', 'lyashch', 'lyn', 'bilyi-amur', 'tovstolob'],
    amenitySlugs: ['parkovka', 'altanky', 'chovny'],
  },
  {
    slug: 'trident-lake-prylbychi',
    name: 'Спортивне озеро «Trident Lake»',
    nameEn: 'Trident Lake (Prylbychi)',
    description:
      'Спортивне озеро «Trident Lake» (водосховище «Малий Гноянець») на краю села Прилбичі Яворівського району, приблизно за 30 хв їзди від Львова. Велика спортивна водойма площею близько 120 га з 90 секторами та глибиною до 4,5 м, орієнтована на трофейну карпову рибалку «спіймав-відпустив». Ловлять коропа, білого амура, карася, щуку, судака, окуня та плітку.',
    descriptionEn:
      'Trident Lake (the Malyi Hnoianets reservoir) sits on the edge of Prylbychi village in Yavoriv district, about a 30-minute drive from Lviv. A large 120 ha sport fishery with 90 sectors and depths up to 4.5 m, focused on trophy carp catch-and-release. Species include carp, grass carp, crucian carp, pike, zander, perch and roach.',
    district: 'Яворівський район',
    lat: 49.9,
    lng: 23.4867,
    waterType: 'RESERVOIR',
    isPaid: true,
    priceNote: 'Спортивна карпова рибалка від ~300 грн/світловий день, ~500 грн/доба',
    priceNoteEn: 'Sport carp fishing from ~300 UAH/daytime, ~500 UAH/24h',
    fishSlugs: ['korop', 'bilyi-amur', 'karas', 'shchuka', 'sudak', 'okun', 'plitka'],
    amenitySlugs: ['nochivlia', 'parkovka'],
  },
  {
    slug: 'ozero-berdykhiv',
    name: 'Озеро «Бердихів»',
    nameEn: 'Lake Berdykhiv',
    description:
      'Платна водойма для риболовлі та відпочинку в селі Бердихів Яворівського району, приблизно за 4 км від Новояворівська. Площа близько 12,7 га, глибина до 3,5 м, понад 40 секторів з альтанками, освітленням та електрикою. Серед риби — короп, карась, білий амур, щука, окунь, краснопірка, плітка, судак, сом, лин, товстолоб та осетр.',
    descriptionEn:
      'A paid fishing and recreation lake in the village of Berdykhiv, Yavoriv district, about 4 km from Novoyavorivsk. Roughly 12.7 ha with depths up to 3.5 m and over 40 sectors with gazebos, lighting and electricity. Stocked with carp, crucian carp, grass carp, pike, perch, rudd, roach, zander, catfish, tench, silver carp and sturgeon.',
    district: 'Яворівський район',
    lat: 49.8966,
    lng: 23.5281,
    waterType: 'LAKE',
    isPaid: true,
    priceNote: 'Платна риболовля, орієнтовно від 340 грн/добу; цілодобово, понад 40 секторів',
    priceNoteEn: 'Paid fishing from about 340 UAH/day; 24h, over 40 sectors',
    fishSlugs: [
      'korop',
      'karas',
      'bilyi-amur',
      'shchuka',
      'okun',
      'krasnopirka',
      'plitka',
      'sudak',
      'som',
      'lyn',
      'tovstolob',
      'osetr',
    ],
    amenitySlugs: ['altanky', 'nochivlia', 'mahazyn', 'parkovka', 'elektryka'],
  },
  {
    slug: 'ryzhanske-ozero',
    name: 'Рижанське озеро',
    nameEn: 'Ryzhanske Lake',
    description:
      'Озеро колишнього піонерського табору біля села Рижани (Соколівська громада, Золочівський район). Водойма площею близько 4 га (макс. глибина 4 м) перебуває в оренді, зариблена коропом, карасем, товстолобом і білим амуром. Рибалка платна, цілодобова.',
    descriptionEn:
      'A former pioneer-camp lake near the village of Ryzhany (Sokolivka hromada, Zolochiv district). The roughly 4-hectare water (max depth 4 m) is leased and restocked with carp, crucian carp, silver carp and grass carp. Fishing is paid and available around the clock.',
    district: 'Золочівський район',
    lat: 50.0939,
    lng: 24.8195,
    waterType: 'LAKE',
    isPaid: true,
    priceNote: 'День — 200 грн (до 3 кг), ніч — 250 грн, доба — 400 грн (6 кг). До 3 вудок, цілодобово',
    priceNoteEn:
      'Day — 200 UAH (up to 3 kg), night — 250 UAH, full day — 400 UAH (6 kg). Up to 3 rods, 24/7',
    fishSlugs: ['korop', 'karas', 'tovstolob', 'bilyi-amur', 'okun'],
    amenitySlugs: ['parkovka', 'nochivlia'],
  },
  {
    slug: 'baza-prystan-sokal',
    name: 'База відпочинку «Пристань»',
    nameEn: 'Prystan Recreation Base',
    description:
      'Платний рибальський комплекс зі ставками загальною площею близько 30 га в селі Пристань на Сокальщині, приблизно за 60 км від Львова серед соснового лісу. Ловлять коропа, білого амура, щуку, товстолоба, карася та окуня; дрібна риба (плітка, краснопірка) ловиться безкоштовно, більша оплачується за кілограм. Є альтанки, мангали, місця для ночівлі, туалети, магазин і прокат снастей.',
    descriptionEn:
      'A paid fishing complex with ponds totaling about 30 ha in the village of Prystan in the Sokal area, roughly 60 km from Lviv amid a pine forest. Anglers catch carp, grass carp, pike, silver carp, crucian carp and perch; small fish (roach, rudd) are free while larger fish are charged per kilogram. Amenities: gazebos, grills, overnight stay, toilets, a shop and tackle rental.',
    district: 'Червоноградський район',
    lat: 50.2215,
    lng: 23.9413,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote:
      'Денна путівка ~80 грн (діти ~40 грн); вилов оплачується за кг (короп/амур ~60–70 грн/кг, щука ~95–100 грн/кг)',
    priceNoteEn:
      'Day permit ~80 UAH (children ~40); caught fish per kg (carp/grass carp ~60–70 UAH/kg, pike ~95–100 UAH/kg)',
    fishSlugs: ['korop', 'shchuka', 'bilyi-amur', 'karas', 'tovstolob', 'okun', 'plitka', 'krasnopirka'],
    amenitySlugs: ['altanky', 'nochivlia', 'parkovka', 'tualet', 'mahazyn', 'prokat-snastei'],
  },
  {
    slug: 'baza-opaka',
    name: 'База відпочинку «Опака»',
    nameEn: 'Opaka Recreation Base',
    description:
      "База відпочинку «Опака» в селі Опака Дрогобицького району, у передгір'ї Карпат за ~23 км від Трускавця. На території форелеве господарство з великим озером для вилову, поруч протікає річка Опака; ловлять форель, карася, окуня, білого амура й осетра. Риболовля платна — 350 грн за день з нормою вилову до 3 кг.",
    descriptionEn:
      'Opaka Recreation Base in the village of Opaka, Drohobych district, in the Carpathian foothills about 23 km from Truskavets. It has a trout farm with a large fishing lake and the Opaka River nearby; anglers catch trout, crucian carp, perch, grass carp and sturgeon. Fishing is paid at 350 UAH per day, catch limit up to 3 kg.',
    district: 'Дрогобицький район',
    lat: 49.2898,
    lng: 23.292,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote:
      'Спортивна та любительська риболовля — 350 грн за день, норма вилову до 3 кг. Оренда вудок і човна',
    priceNoteEn:
      'Sport and recreational fishing — 350 UAH/day, catch limit up to 3 kg. Rod and boat rental',
    fishSlugs: ['forel', 'karas', 'okun', 'bilyi-amur', 'osetr'],
    amenitySlugs: ['nochivlia', 'chovny', 'kafe', 'prokat-snastei'],
  },
  {
    slug: 'kozatska-sloboda-rakovets',
    name: 'Комплекс «Козацька слобода-Раковець»',
    nameEn: 'Kozatska Sloboda-Rakovets Complex',
    description:
      'Відпочинковий еколандшафтний комплекс у селі Воля Якубова Дрогобицького району, за 17 км від Дрогобича; на території 24 га облаштовано вісім озер на місці старовинних австрійських ставів. Платна риболовля на коропа, карася, лина, білого амура та товстолоба. Є котеджі, кафе на острові, прокат човнів і катамаранів, риболовних снастей.',
    descriptionEn:
      'A recreation ecolandscape complex in the village of Volia Yakubova, Drohobych district, about 17 km from Drohobych; its 24-hectare grounds contain eight lakes built on old Austrian ponds. Paid fishing for carp, crucian carp, tench, grass carp and silver carp. It offers cottages, an island cafe, boat and catamaran rental, and tackle rental.',
    district: 'Дрогобицький район',
    lat: 49.426,
    lng: 23.5398,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote:
      'Риболовля на 2 власні вудки — 250 грн (включає 2 кг), кожен наступний кілограм — 70 грн',
    priceNoteEn: 'Fishing with 2 own rods — 250 UAH (includes 2 kg); each extra kg — 70 UAH',
    fishSlugs: ['korop', 'karas', 'bilyi-amur', 'tovstolob', 'lyn'],
    amenitySlugs: ['nochivlia', 'chovny', 'parkovka', 'kafe', 'prokat-snastei'],
  },
  {
    slug: 'bukhta-vikingiv',
    name: 'База відпочинку «Бухта Вікінгів»',
    nameEn: "Vikings' Bay Recreation Base",
    description:
      'База відпочинку «Бухта Вікінгів» за 12 км від Львова в напрямку Бібрки, у селі Старе Село (на межі з Відниками), Львівський район. На території близько 12 га є три озера, де можлива платна риболовля. У водоймах водяться короп, карась, окунь, судак, товстолоб і щука; є альтанки з мангалами, ресторан, прокат човнів і катамаранів.',
    descriptionEn:
      'The "Vikings\' Bay" recreation base, about 12 km from Lviv toward Bibrka, in the village of Stare Selo (bordering Vidnyky), Lviv district. The roughly 12-hectare grounds hold three lakes for paid fishing. The waters contain carp, crucian carp, perch, zander, silver carp and pike; there are grill gazebos, a restaurant, and boat and catamaran rental.',
    district: 'Львівський район',
    lat: 49.6912,
    lng: 24.2218,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote: 'Платна риболовля (комплекс з 3 озерами); вартість уточнюється на місці',
    priceNoteEn: 'Paid fishing (complex with 3 lakes); price confirmed on site',
    fishSlugs: ['korop', 'karas', 'okun', 'sudak', 'tovstolob', 'shchuka'],
    amenitySlugs: ['altanky', 'nochivlia', 'chovny', 'parkovka', 'kafe'],
  },
  {
    slug: 'baza-rybachok-sushno',
    name: 'База відпочинку «Рибачок»',
    nameEn: 'Rybachok Recreation Base',
    description:
      'База сімейного відпочинку «Рибачок» у селі Сушно Червоноградського району, за ~10 км від Радехова. Платний рибогосподарський комплекс площею близько 55 га, де ловлять коропа, білого амура, щуку та карася; риболовля цілодобова. Є альтанки з мангалом, готельні номери, прокат катамаранів і ресторан.',
    descriptionEn:
      'The Rybachok family recreation base in the village of Sushno, Chervonohrad district, about 10 km from Radekhiv. A paid fishing complex of roughly 55 ha where carp, grass carp, pike and crucian carp are caught, with round-the-clock fishing. It offers gazebos with grills, hotel rooms, catamaran rental and a restaurant.',
    district: 'Червоноградський район',
    lat: 50.3258,
    lng: 24.5351,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote:
      'Відпочинок від 100 грн/день; спортивно-любительська риболовля 350–400 грн/день (до 3 кг коропа, далі ~85 грн/кг)',
    priceNoteEn:
      'Leisure from 100 UAH/day; sport fishing 350–400 UAH/day (up to 3 kg carp, then ~85 UAH/kg)',
    fishSlugs: ['korop', 'shchuka', 'karas', 'bilyi-amur'],
    amenitySlugs: ['altanky', 'nochivlia', 'chovny', 'kafe'],
  },
  {
    slug: 'tartak-resort-vulka',
    name: '«Тартак Резорт» (озеро Вулька)',
    nameEn: 'Tartak Resort (Lake Vulka)',
    description:
      'Готельно-відпочинковий комплекс «Тартак Резорт» на озері Вулька у селі Бережани Львівського району, приблизно за 10 км від центру Львова. Платне зариблене озеро площею близько 1,5 га з максимальною глибиною 4 м; облаштовано 12 рибальських містків. Ловлять білого амура, коропа, карася, щуку, окуня та райдужну форель.',
    descriptionEn:
      'The Tartak Resort recreation complex on Lake Vulka in the village of Berezhany, Lviv district, about 10 km from central Lviv. A paid stocked lake of roughly 1.5 ha with a max depth of 4 m and 12 fishing platforms. Anglers catch grass carp, common carp, crucian carp, pike, perch and rainbow trout.',
    district: 'Львівський район',
    lat: 49.7913,
    lng: 24.1081,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote:
      'Близько 150 грн у будні, 200 грн у вихідні (за іншими даними 300 грн/світлову добу). Лише вдень',
    priceNoteEn:
      'About 150 UAH on weekdays, 200 UAH on weekends (other sources 300 UAH/daytime). Daytime only',
    fishSlugs: ['bilyi-amur', 'korop', 'karas', 'shchuka', 'okun', 'forel'],
    amenitySlugs: ['altanky', 'nochivlia', 'kafe', 'parkovka'],
  },
  {
    slug: 'ozero-maydan-yavoriv',
    name: 'Озеро Майдан (Яворівський НПП)',
    nameEn: 'Lake Maydan (Yavoriv National Park)',
    description:
      'Озеро Майдан — частина каскаду водойм понад 110 га у Яворівському національному парку на річці Верещиця, поблизу сіл Верещиця та Лелехівка. Платна риболовля переважно на 5-му та 6-му ставах каскаду; ловлять коропа (основна риба), карася, товстолоба, білого амура, щуку та окуня. Є альтанки, мангали, біотуалети, будиночки для ночівлі, паркування.',
    descriptionEn:
      'Lake Maydan is part of a cascade of ponds over 110 ha within Yavoriv National Nature Park on the Vereshchytsia River, near the villages of Vereshchytsia and Lelehivka. Paid fishing mainly on the 5th and 6th ponds; the catch includes carp (main target), crucian carp, silver carp, grass carp, pike and perch. Amenities: gazebos, grills, bio-toilets, overnight cottages and parking.',
    district: 'Львівський район',
    lat: 49.9723,
    lng: 23.6693,
    waterType: 'FISHING_COMPLEX',
    isPaid: true,
    priceNote: 'Спортивно-аматорська риболовля ~350–650 грн/день, ліміт до 3 кг. Риба понад 5 кг відпускається',
    priceNoteEn: 'Sport/amateur fishing ~350–650 UAH/day, limit up to 3 kg. Fish over 5 kg released',
    fishSlugs: ['korop', 'karas', 'shchuka', 'okun', 'tovstolob', 'bilyi-amur'],
    amenitySlugs: ['altanky', 'nochivlia', 'tualet', 'parkovka'],
  },
  {
    slug: 'stavok-krasne',
    name: 'Ставок біля смт Красне',
    nameEn: 'Pond near Krasne',
    description:
      "Ставок площею близько 2,4 га поблизу смт Красне Буського району, біля колишнього спиртзаводу. Водойма в управлінні Буського товариства мисливців і рибалок «Буг»; водяться короп, білий амур, товстолоб, лин, карась, сом, щука, окунь та плітка. Риболовля платна (лише вдень), з берега, не більше 2 вудок, добовий вилов до 5 кг.",
    descriptionEn:
      'A pond of about 2.4 ha near the town of Krasne in Busk district, by a former spirit factory. Managed by the Busk "Bug" hunters and fishers society; it holds carp, grass carp, silver carp, tench, crucian carp, catfish, pike, perch and roach. Fishing is paid (daytime only), from the shore, max 2 rods, daily limit 5 kg.',
    district: 'Буський район',
    lat: 49.9447,
    lng: 24.6446,
    waterType: 'POND',
    isPaid: true,
    priceNote:
      'Платна риболовля 80 грн (лише вдень). Безкоштовно для осіб з інвалідністю I–II груп та дітей до 16 років',
    priceNoteEn:
      'Paid fishing 80 UAH (daytime only). Free for persons with disabilities (groups I–II) and children under 16',
    fishSlugs: ['korop', 'karas', 'shchuka', 'som', 'okun', 'bilyi-amur', 'tovstolob', 'lyn', 'plitka'],
    amenitySlugs: ['parkovka'],
  },
  {
    slug: 'khutir-melnyky',
    name: 'Хутір «Мельники»',
    nameEn: 'Khutir Melnyky Fishing Farm',
    description:
      "Платний ставок фермерського господарства «Хутір Мельники» у селі Забужжя Львівського (кол. Кам'янка-Бузького) району, площею близько 1 га, за 40 км від Львова. Ловлять коропа, білого амура, карася, щуку, окуня та плітку; передбачена ловля мирної риби й хижака. Є альтанки, мостки, сауна та будиночки для ночівлі.",
    descriptionEn:
      'A paid pond of the "Khutir Melnyky" farm in the village of Zabuzhzhia, Lviv (formerly Kamianka-Buzka) district, about 1 ha, 40 km from Lviv. Anglers catch carp, grass carp, crucian carp, pike, perch and roach, with both peaceful-fish and predator fishing. Amenities: gazebos, docks, a sauna and overnight cottages.',
    district: 'Львівський район',
    lat: 50.1146,
    lng: 24.3641,
    waterType: 'POND',
    isPaid: true,
    priceNote:
      'День — 150 грн (2 кг включено); доба — 250 грн (3 кг). Хижак — 50 грн/день. Сауна — 75 грн/год',
    priceNoteEn:
      'Day — 150 UAH (2 kg included); 24h — 250 UAH (3 kg). Predator — 50 UAH/day. Sauna — 75 UAH/h',
    fishSlugs: ['korop', 'bilyi-amur', 'shchuka', 'karas', 'okun', 'plitka'],
    amenitySlugs: ['altanky', 'nochivlia', 'parkovka', 'dush'],
  },
];

// Verified real Lviv-oblast river fishing stretches (research workflow 2026-06-16).
// Copied verbatim from docs/superpowers/data/lviv-rivers.json (sans _note/sourceUrl).
const REAL_LVIV_RIVER_WATERS: RealWater[] = [
  {
    slug: 'richka-dnister-rozvadiv',
    riverSlug: 'dnister',
    name: 'Річка Дністер (Розвадів)',
    nameEn: 'Dniester River (Rozvadiv)',
    description:
      'Ділянка річки Дністер біля села Розвадів (Стрийський район), на лівому березі поблизу підвісного пішохідного мосту. Розвадів — популярна стартова точка сплавів по Дністру; тут ловлять жереха, судака, щуку, сома, окуня, головня, плітку та ляща. Рибалка вільна.',
    descriptionEn:
      'A stretch of the Dniester near the village of Rozvadiv (Stryi district), on the left bank by a pedestrian suspension bridge. Rozvadiv is a popular Dniester rafting start; anglers catch asp, zander, pike, catfish, perch, chub, roach and bream. Fishing is free.',
    district: 'Стрийський район',
    lat: 49.5061,
    lng: 23.9522,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['zherekh', 'sudak', 'shchuka', 'som', 'okun', 'holoven', 'plitka', 'lyashch'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-stryi-rybnyk',
    riverSlug: 'stryi',
    name: 'Річка Стрий (Рибник)',
    nameEn: 'Stryi River (Rybnyk)',
    description:
      'Звивиста (меандрова) ділянка річки Стрий біля села Рибник Дрогобицького району, де річка Рибник впадає у Стрий. Гірсько-передгірна частина течії з чистою холодною водою; ловлять форель, головня, жереха, щуку, окуня та ляща.',
    descriptionEn:
      'A winding (meander) stretch of the Stryi near the village of Rybnyk in Drohobych district, where the Rybnyk joins the Stryi. A mountain-foothill section with clean, cold water; anglers catch trout, chub, asp, pike, perch and bream.',
    district: 'Дрогобицький район',
    lat: 49.181,
    lng: 23.301,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['forel', 'holoven', 'zherekh', 'shchuka', 'okun', 'lyashch'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-zakhidnyi-buh-kamianka',
    riverSlug: 'zakhidnyi-buh',
    name: "Річка Західний Буг (Кам'янка-Бузька)",
    nameEn: 'Western Bug River (Kamianka-Buzka)',
    description:
      "Західний Буг протікає через місто Кам'янка-Бузька (Львівський район), де у нього впадає річка Кам'янка. Рівнинна річка зі звивистим річищем, заплавою та старицями, придатна для береговою риболовлі. Ловлять щуку, ляща, плітку, головня, жереха, окуня, судака, краснопірку та йоржа.",
    descriptionEn:
      'The Western Bug flows through the town of Kamianka-Buzka (Lviv district), where the Kamianka joins it. A lowland river with a meandering channel, floodplain and oxbows, good for bank fishing. Anglers catch pike, bream, roach, chub, asp, perch, zander, rudd and ruffe.',
    district: 'Львівський район',
    lat: 50.1022,
    lng: 24.3481,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['shchuka', 'lyashch', 'plitka', 'holoven', 'zherekh', 'okun', 'sudak', 'som', 'yorzh', 'krasnopirka'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-vereshchytsia-horodok',
    riverSlug: 'vereshchytsia',
    name: 'Річка Верещиця (Городок)',
    nameEn: 'Vereshchytsia River (Horodok)',
    description:
      'Верещиця — ліва притока Дністра завдовжки 92 км, протікає Яворівським та Львівським районами, зокрема поблизу Городка та Великого Любеня. На річці та ставках уздовж неї ловлять окуня, плітку, щуку, коропа, карася, лина та ляща. Рибалка вільна, цілодобова.',
    descriptionEn:
      'The Vereshchytsia is a 92 km left tributary of the Dniester flowing through Yavoriv and Lviv districts, notably near Horodok and Velykyi Liubin. In the river and its ponds anglers catch perch, roach, pike, carp, crucian carp, tench and bream. Fishing is free and around the clock.',
    district: 'Львівський район',
    lat: 49.8285,
    lng: 23.6396,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['okun', 'plitka', 'shchuka', 'korop', 'karas', 'lyn', 'lyashch'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-svicha-zhuravno',
    riverSlug: 'svicha',
    name: 'Річка Свіча (Журавно)',
    nameEn: 'Svicha River (Zhuravno)',
    description:
      'Свіча — права притока Дністра; у Стрийському районі протікає рівнинною ділянкою з поміркованою течією і впадає у Дністер південно-східніше смт Журавно. У нижній течії біля Журавна ловлять головня, окуня, щуку, ляща та плітку (гірські верхів\'я під охороною).',
    descriptionEn:
      "The Svicha is a right tributary of the Dniester; in Stryi district it runs as a lowland stretch with moderate flow and joins the Dniester southeast of Zhuravno. In the lower reaches near Zhuravno anglers catch chub, perch, pike, bream and roach (the mountain headwaters are protected).",
    district: 'Стрийський район',
    lat: 49.2522,
    lng: 24.3142,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['holoven', 'okun', 'shchuka', 'lyashch', 'plitka'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-luh-khodoriv',
    riverSlug: 'luh',
    name: 'Річка Луг (Ходорів)',
    nameEn: 'Luh River (Khodoriv)',
    description:
      'Луг — ліва притока Дністра завдовжки близько 25 км у Стрийському районі; протікає через місто Ходорів і впадає в Дністер біля села Буковина. На річці та в пониззі ловлять щуку, окуня, плітку, карася, лина, ляща й коропа. Рибалка безкоштовна.',
    descriptionEn:
      'The Luh is a left tributary of the Dniester, about 25 km long, in Stryi district; it flows through Khodoriv and joins the Dniester near Bukovyna. Anglers catch pike, perch, roach, crucian carp, tench, bream and carp. Fishing is free.',
    district: 'Стрийський район',
    lat: 49.3331,
    lng: 24.2569,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['shchuka', 'okun', 'plitka', 'karas', 'lyn', 'lyashch', 'korop'],
    amenitySlugs: [],
  },
  {
    slug: 'richka-stryvihor-khyriv',
    riverSlug: 'stryvihor',
    name: 'Річка Стривігор (Хирів)',
    nameEn: 'Stryvihor River (Khyriv)',
    description:
      'Стривігор (Стрв\'яж) — ліва притока Дністра, протікає Самбірським районом через місто Хирів. Передгірська річка завширшки 10–20 м; трапляються головень, плітка, окунь, а в чистіших верхів\'ях — форель. Рибалка вільна.',
    descriptionEn:
      "The Stryvihor (Strvyazh) is a left tributary of the Dniester flowing through Sambir district, including the town of Khyriv. A foothill river 10–20 m wide; chub, roach and perch occur, with trout in the cleaner upper reaches. Fishing is free.",
    district: 'Самбірський район',
    lat: 49.5356,
    lng: 22.8544,
    waterType: 'RIVER',
    isPaid: false,
    priceNote: 'Вільна риболовля',
    priceNoteEn: 'Free fishing',
    fishSlugs: ['holoven', 'plitka', 'okun', 'forel'],
    amenitySlugs: [],
  },
];

async function seedRealWaters() {
  const lviv = await prisma.region.findUnique({ where: { slug: 'lvivska-oblast' } });
  if (!lviv) {
    throw new Error('Region "lvivska-oblast" not found — run seedDictionaries() first.');
  }

  const fishSpecies = await prisma.fishSpecies.findMany();
  const amenities = await prisma.amenity.findMany();
  const rivers = await prisma.river.findMany();
  const fishIdBySlug = new Map(fishSpecies.map((f) => [f.slug, f.id]));
  const amenityIdBySlug = new Map(amenities.map((a) => [a.slug, a.id]));
  const riverIdBySlug = new Map(rivers.map((r) => [r.slug, r.id]));

  const allWaters = [...REAL_LVIV_WATERS, ...REAL_LVIV_RIVER_WATERS];

  for (const water of allWaters) {
    const fishIds: number[] = [];
    for (const slug of water.fishSlugs) {
      const id = fishIdBySlug.get(slug);
      if (id == null) {
        console.warn(`[seedRealWaters] ${water.slug}: unknown fish slug "${slug}" — skipped`);
        continue;
      }
      fishIds.push(id);
    }

    const amenityIds: number[] = [];
    for (const slug of water.amenitySlugs) {
      const id = amenityIdBySlug.get(slug);
      if (id == null) {
        console.warn(`[seedRealWaters] ${water.slug}: unknown amenity slug "${slug}" — skipped`);
        continue;
      }
      amenityIds.push(id);
    }

    let riverId: number | null = null;
    if (water.riverSlug) {
      const rid = riverIdBySlug.get(water.riverSlug);
      if (rid == null) {
        console.warn(`[seedRealWaters] ${water.slug}: unknown riverSlug "${water.riverSlug}" — riverId set to null`);
      } else {
        riverId = rid;
      }
    }

    const scalar = {
      name: water.name,
      nameEn: water.nameEn,
      description: water.description,
      descriptionEn: water.descriptionEn,
      regionId: lviv.id,
      district: water.district,
      lat: water.lat,
      lng: water.lng,
      waterType: water.waterType,
      isPaid: water.isPaid,
      // Real waters express pricing as free-text notes; null the numeric range so a
      // re-seed over the old demo Наварія (which set priceFrom/To) can't leave stale numbers.
      priceFrom: null,
      priceTo: null,
      priceNote: water.priceNote,
      priceNoteEn: water.priceNoteEn,
      status: 'PUBLISHED' as const,
      verified: true,
      isPremium: false,
      riverId,
    };

    await prisma.water.upsert({
      where: { slug: water.slug },
      // Idempotent: refresh fish/amenity join rows on re-run via deleteMany+create.
      update: {
        ...scalar,
        fish: { deleteMany: {}, create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { deleteMany: {}, create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
      create: {
        slug: water.slug,
        ...scalar,
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
  }

  console.log(`Real Lviv waters seeded: ${allWaters.length} (${REAL_LVIV_WATERS.length} lakes/ponds/complexes + ${REAL_LVIV_RIVER_WATERS.length} river stretches).`);
}

interface RegionWater {
  slug: string;
  regionSlug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  district: string;
  lat: number;
  lng: number;
  waterType: WaterTypeLiteral;
  isPaid: boolean;
  priceNote: string | null;
  priceNoteEn: string | null;
  fishSlugs: string[];
  amenitySlugs: string[];
  verified?: boolean;
}

// Open-web enrichment overlay (see prisma/data/osm-enrichment.json). Keyed by
// water slug; merged onto OSM stubs at seed time. Original descriptions written
// from found facts; photos are CC/Wikimedia only.
interface WaterEnrichment {
  description?: string;
  fishSlugs?: string[];
  isPaid?: boolean;
  priceNote?: string | null;
  phone?: string | null;
  website?: string | null;
  photo?: { url: string; alt?: string } | null;
}

async function seedRegionWaters(
  fileName = 'regions-waters.json',
  label = 'Region waters',
  enrichmentFile?: string,
) {
  const raw = readFileSync(join(__dirname, 'data', fileName), 'utf8');
  const data = JSON.parse(raw) as { waters: RegionWater[] };

  const enrichmentBySlug = new Map<string, WaterEnrichment>();
  if (enrichmentFile) {
    const eraw = readFileSync(join(__dirname, 'data', enrichmentFile), 'utf8');
    const edata = JSON.parse(eraw) as { enrichment: Record<string, WaterEnrichment> };
    for (const [slug, e] of Object.entries(edata.enrichment)) enrichmentBySlug.set(slug, e);
  }

  const regions = await prisma.region.findMany();
  const fishSpecies = await prisma.fishSpecies.findMany();
  const amenities = await prisma.amenity.findMany();

  const regionIdBySlug = new Map(regions.map((r) => [r.slug, r.id]));
  const fishIdBySlug = new Map(fishSpecies.map((f) => [f.slug, f.id]));
  const amenityIdBySlug = new Map(amenities.map((a) => [a.slug, a.id]));

  let count = 0;
  let enrichedCount = 0;
  for (const w of data.waters) {
    const regionId = regionIdBySlug.get(w.regionSlug);
    if (regionId == null) {
      console.warn(`[seedRegionWaters] ${w.slug}: unknown regionSlug "${w.regionSlug}" — skipped`);
      continue;
    }

    const e = enrichmentBySlug.get(w.slug);
    if (e) enrichedCount++;

    // Enrichment overrides the stub fish list only when it actually found species.
    const effFishSlugs = e?.fishSlugs?.length ? e.fishSlugs : w.fishSlugs;
    const fishIds: number[] = [];
    for (const slug of effFishSlugs) {
      const id = fishIdBySlug.get(slug);
      if (id == null) {
        console.warn(`[seedRegionWaters] ${w.slug}: unknown fish slug "${slug}" — skipped`);
        continue;
      }
      fishIds.push(id);
    }

    const amenityIds: number[] = [];
    for (const slug of w.amenitySlugs) {
      const id = amenityIdBySlug.get(slug);
      if (id == null) {
        console.warn(`[seedRegionWaters] ${w.slug}: unknown amenity slug "${slug}" — skipped`);
        continue;
      }
      amenityIds.push(id);
    }

    const scalar = {
      name: w.name,
      nameEn: w.nameEn,
      description: e?.description?.trim() ? e.description.trim() : w.description,
      descriptionEn: w.descriptionEn,
      regionId,
      district: w.district ?? null,
      lat: w.lat,
      lng: w.lng,
      waterType: w.waterType,
      isPaid: e ? (e.isPaid ?? w.isPaid) : w.isPaid,
      priceFrom: null,
      priceTo: null,
      priceNote: e?.priceNote ?? w.priceNote ?? null,
      priceNoteEn: w.priceNoteEn ?? null,
      phone: e?.phone ?? null,
      website: e?.website ?? null,
      status: 'PUBLISHED' as const,
      // Web-confirmed waters earn the verified badge; un-enriched stubs stay false.
      verified: e ? true : (w.verified ?? true),
      isPremium: false,
      riverId: null,
    };

    // Only manage media when enrichment carries a CC photo, so re-seeds don't wipe
    // admin/community-uploaded images on un-enriched waters.
    const photoUrl = e?.photo?.url?.trim();
    const mediaWrite = photoUrl
      ? { deleteMany: {}, create: [{ url: photoUrl, alt: e?.photo?.alt ?? w.name, sortOrder: 0 }] }
      : undefined;

    await prisma.water.upsert({
      where: { slug: w.slug },
      update: {
        ...scalar,
        fish: { deleteMany: {}, create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { deleteMany: {}, create: amenityIds.map((amenityId) => ({ amenityId })) },
        ...(mediaWrite ? { media: mediaWrite } : {}),
      },
      create: {
        slug: w.slug,
        ...scalar,
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
        ...(photoUrl ? { media: { create: [{ url: photoUrl, alt: e?.photo?.alt ?? w.name, sortOrder: 0 }] } } : {}),
      },
    });
    count++;
  }

  const suffix = enrichmentFile ? ` (${enrichedCount} enriched)` : '';
  console.log(`${label} seeded: ${count}${suffix}.`);
}

interface RealArticle {
  slug: string;
  title: string;
  titleEn?: string;
  excerpt: string;
  excerptEn?: string;
  content: string;
  contentEn?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  publishedAtOffsetDays: number;
  seoTitle?: string;
  seoTitleEn?: string;
  seoDescription?: string;
  seoDescriptionEn?: string;
}

// Always-on: real, useful bilingual fishing articles read at runtime from
// prisma/data/articles.json (same fs-read pattern as seedRegionWaters()).
async function seedRealArticles() {
  const raw = readFileSync(join(__dirname, 'data', 'articles.json'), 'utf8');
  const data = JSON.parse(raw) as { articles: RealArticle[] };

  let count = 0;
  for (const a of data.articles) {
    const publishedAt = new Date(Date.now() - a.publishedAtOffsetDays * 86400000);
    const scalar = {
      title: a.title,
      titleEn: a.titleEn ?? null,
      excerpt: a.excerpt,
      excerptEn: a.excerptEn ?? null,
      content: a.content,
      contentEn: a.contentEn ?? null,
      status: (a.status ?? 'PUBLISHED') as 'DRAFT' | 'PUBLISHED',
      publishedAt,
      seoTitle: a.seoTitle ?? null,
      seoTitleEn: a.seoTitleEn ?? null,
      seoDescription: a.seoDescription ?? null,
      seoDescriptionEn: a.seoDescriptionEn ?? null,
    };

    await prisma.article.upsert({
      where: { slug: a.slug },
      update: { ...scalar },
      create: { slug: a.slug, ...scalar },
    });
    count++;
  }

  console.log(`Real articles seeded: ${count}.`);
}

async function seedDemoArticles() {
  const slug = 'yak-vybraty-platnu-vodoymu-7-porad';
  await prisma.article.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title: 'Як вибрати платну водойму: 7 порад',
      titleEn: 'How to choose a paid fishing lake: 7 tips',
      excerpt: 'Не знаєш, яку водойму обрати для риболовлі? Ось 7 ключових критеріїв, які допоможуть зробити правильний вибір.',
      excerptEn: 'Not sure which paid fishing lake to pick? Here are 7 key criteria to help you choose wisely.',
      content: `Вибір платної водойми — важливе рішення для кожного рибалки. Від правильного вибору залежить не лише ваш улов, а й загальне задоволення від відпочинку.

## 1. Оцініть видовий склад риби

Перш за все дізнайтеся, яка риба водиться у водоймі. **Короп, карась, щука, судак** — кожен вид потребує різного спорядження та підходу. Зверніть увагу на свіжі повідомлення про улови від інших рибалок.

## 2. Перевірте ціни та умови

Порівняйте ціни на денну та добову рибалку. Деякі водойми пропонують **сезонні абонементи** або знижки для постійних відвідувачів.

## 3. Оцініть інфраструктуру

Наявність:
- Альтанок та навісів
- Парковки поруч
- Туалету і душу
- Кафе або магазину

## 4. Дізнайтеся правила ловлі

Кожна водойма має свої **правила**: ліміт улову, дозволені снасті, час ловлі. Ознайомтеся з ними заздалегідь, щоб уникнути непорозумінь.

## 5. Зверніть увагу на розміри водойми

Велика водойма дає більше свободи для вибору місця та зменшує конкуренцію між рибалками. Маленькі стави часто більш **зарибнені** і підходять для початківців.

## 6. Читайте відгуки

Перед поїздкою перегляньте відгуки інших рибалок. Звертайте увагу на свіжість інформації — умови на водоймі можуть змінюватися сезонно.

## 7. Враховуйте відстань та доступність

Найкраща водойма — та, до якої зручно дістатися. **Оцініть якість дороги** і наявність громадського транспорту, якщо не маєте власного автомобіля.

Пам'ятайте: хороша підготовка — половина успіху! Вдалої риболовлі!`,
      contentEn: `Choosing a paid fishing lake is an important decision for any angler. The right choice determines not just your catch, but also your overall enjoyment.

## 1. Assess the fish species

Find out which fish are stocked in the lake. **Carp, crucian carp, pike, zander** — each species requires different tackle and technique.

## 2. Check prices and conditions

Compare day and overnight fishing fees. Some lakes offer **seasonal passes** or discounts for regular visitors.

## 3. Evaluate the infrastructure

Look for:
- Gazebos and shelters
- Nearby parking
- Toilet and shower facilities
- Café or shop on site

## 4. Learn the fishing rules

Every lake has its own **rules**: catch limits, permitted tackle, fishing hours. Review them in advance to avoid misunderstandings.

## 5. Consider the lake size

A larger lake gives more freedom to choose your spot and reduces competition. Small ponds are often **well-stocked** and great for beginners.

## 6. Read reviews

Before your trip, check recent reviews from other anglers. Pay attention to how current the information is — conditions can change seasonally.

## 7. Factor in distance and accessibility

The best lake is one that is easy to reach. **Assess the road quality** and public transport options if you do not have a car.

Good preparation is half the battle — tight lines!`,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
}

async function seedDemoReviews() {
  const navariia = await prisma.water.findUniqueOrThrow({ where: { slug: 'ozero-navariia' } });

  // Idempotent: delete existing reviews for this water first, then recreate
  await prisma.review.deleteMany({ where: { waterId: navariia.id } });

  await prisma.review.createMany({
    data: [
      {
        waterId: navariia.id,
        authorName: 'Олег',
        rating: 5,
        text: 'Чудове місце для риболовлі — короп клює від ранку до вечора. Інфраструктура на висоті, альтанки чисті та зручні.',
        status: 'APPROVED',
      },
      {
        waterId: navariia.id,
        authorName: 'Ірина',
        rating: 4,
        text: 'Гарний ставок, приємна атмосфера. Щука добре береться на блешню, карась — на тісто. Ціна цілком виправдана.',
        status: 'APPROVED',
      },
      {
        waterId: navariia.id,
        authorName: 'Максим',
        rating: 5,
        text: 'Тихий ставок, ідеальний для фідерної риболовлі. Короп великий, місця багато. Обов\'язково повернусь!',
        status: 'PENDING',
      },
    ],
  });

  // Recompute aggregates for navariia (2 APPROVED: avg 4.5, count 2)
  const navariiaAgg = await prisma.review.aggregate({
    where: { waterId: navariia.id, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.water.update({
    where: { id: navariia.id },
    data: {
      ratingAvg: navariiaAgg._avg.rating != null
        ? Math.round(navariiaAgg._avg.rating * 10) / 10
        : null,
      ratingCount: navariiaAgg._count.rating,
    },
  });

  console.log('Demo reviews seeded.');
}

async function seedDemoSpots() {
  // Idempotent: delete existing demo spots, then recreate
  await prisma.spot.deleteMany({
    where: { authorName: { in: ['Тарас', 'Богдан', 'Степан'] } },
  });

  await prisma.spot.createMany({
    data: [
      {
        lat: 49.8397,
        lng: 24.0297,
        authorName: 'Тарас',
        comment: 'Відмінне місце для риболовлі поблизу Львова. Тут добре ловиться карась і щука вранці.',
        fishNote: 'карась, щука',
        status: 'APPROVED',
      },
      {
        lat: 49.7665,
        lng: 23.9571,
        authorName: 'Богдан',
        comment: 'Тихе озеро з чистою водою. Короп добре бере на кукурудзу після дощу. Рекомендую фідер.',
        fishNote: 'короп, лящ',
        status: 'APPROVED',
      },
      {
        lat: 50.4547,
        lng: 30.5238,
        authorName: 'Степан',
        comment: 'Гарне місце на Дніпрі. Ловив судака та окуня. Зручний берег, є де поставити намет.',
        fishNote: 'судак, окунь',
        status: 'PENDING',
      },
    ],
  });

  console.log('Demo spots seeded.');
}

async function seedDemoCatchReports() {
  const navariia = await prisma.water.findUniqueOrThrow({ where: { slug: 'ozero-navariia' } });
  const korop = await prisma.fishSpecies.findUniqueOrThrow({ where: { slug: 'korop' } });
  const shchuka = await prisma.fishSpecies.findUniqueOrThrow({ where: { slug: 'shchuka' } });

  // Idempotent: clear all catch reports for the demo water, then recreate (same
  // reset pattern as seedDemoReviews/seedDemoSpots).
  await prisma.catchReport.deleteMany({ where: { waterId: navariia.id } });

  // photoUrl left null: the seed does not copy demo images to the uploads dir
  // (same as reviews/spots), so a real photoUrl would render as a broken image.
  await prisma.catchReport.createMany({
    data: [
      {
        waterId: navariia.id,
        fishId: korop.id,
        caughtAt: new Date('2026-06-13'),
        comment: 'Зловив гарного коропа на кукурудзу зранку. Боровся хвилин п\'ять — справжній трофей!',
        authorName: 'Андрій',
        status: 'APPROVED',
      },
      {
        waterId: navariia.id,
        fishId: shchuka.id,
        caughtAt: new Date('2026-06-14'),
        comment: 'Щука взяла на блешню біля очерету під вечір. Перший виїзд цього сезону вдалий.',
        authorName: 'Василь',
        status: 'PENDING',
      },
    ],
  });

  console.log('Demo catch reports seeded.');
}

async function main() {
  await seedDictionaries();
  // Always-on base data: real verified Lviv-oblast waters.
  await seedRealWaters();
  // Always-on base data: 87 verified waters across 22 other oblasts.
  await seedRegionWaters();
  // Always-on base data: ~1.7k named waters auto-imported from OpenStreetMap
  // (verified:false stubs), with an open-web enrichment overlay applied by slug
  // (original descriptions, fish, prices/phones, CC photos) where found.
  await seedRegionWaters('osm-waters.json', 'OSM waters', 'osm-enrichment.json');
  // Always-on base data: real bilingual blog articles.
  await seedRealArticles();
  if (process.env.SEED_DEMO === '1') {
    await seedDemoArticles();
    await seedDemoReviews();
    await seedDemoSpots();
    await seedDemoCatchReports();
  }
  const counts = {
    regions: await prisma.region.count(),
    fish: await prisma.fishSpecies.count(),
    amenities: await prisma.amenity.count(),
    waters: await prisma.water.count(),
    articles: await prisma.article.count(),
    reviews: await prisma.review.count(),
    spots: await prisma.spot.count(),
    catchReports: await prisma.catchReport.count(),
  };
  console.log('Seed done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
