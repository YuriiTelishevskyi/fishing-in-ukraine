import { PrismaClient } from '@prisma/client';

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
}

async function seedDemoWaters() {
  const lviv = await prisma.region.findUniqueOrThrow({ where: { slug: 'lvivska-oblast' } });
  const fishBySlug = async (slug: string) =>
    prisma.fishSpecies.findUniqueOrThrow({ where: { slug } });
  const amenityBySlug = async (slug: string) =>
    prisma.amenity.findUniqueOrThrow({ where: { slug } });

  const demo = [
    {
      slug: 'ozero-navariia',
      name: 'Озеро Наварія',
      nameEn: 'Navaria Lake',
      description: 'Платне озеро неподалік Львова. Зариблене коропом і карасем, є щука.',
      descriptionEn: 'A paid lake near Lviv stocked with carp and crucian carp; pike present.',
      regionId: lviv.id,
      district: 'Львівський район',
      lat: 49.7665,
      lng: 23.9571,
      waterType: 'LAKE' as const,
      isPaid: true,
      priceFrom: 300,
      priceTo: 700,
      priceNote: 'Вхід 300 грн, доба 700 грн',
      verified: true,
      status: 'PUBLISHED' as const,
      fishSlugs: ['korop', 'karas', 'shchuka'],
      amenitySlugs: ['altanky', 'parkovka'],
    },
    {
      slug: 'stav-murovane',
      name: 'Став Муроване',
      description: 'Тихий став для коропової риболовлі, чудові місця під фідер.',
      regionId: lviv.id,
      district: 'Львівський район',
      lat: 49.9052,
      lng: 24.1175,
      waterType: 'POND' as const,
      isPaid: true,
      priceFrom: 250,
      priceTo: null,
      priceNote: 'Світловий день 250 грн',
      verified: false,
      status: 'PUBLISHED' as const,
      fishSlugs: ['korop', 'lyashch', 'karas'],
      amenitySlugs: ['parkovka'],
    },
    {
      slug: 'richka-dnister-rozvadiv',
      name: 'Річка Дністер (Розвадів)',
      description: 'Безкоштовна ділянка Дністра. Хижак: щука, судак, сом.',
      regionId: lviv.id,
      district: 'Стрийський район',
      lat: 49.553,
      lng: 23.974,
      waterType: 'RIVER' as const,
      isPaid: false,
      priceFrom: null,
      priceTo: null,
      priceNote: null,
      verified: false,
      status: 'PUBLISHED' as const,
      fishSlugs: ['shchuka', 'sudak', 'som', 'okun'],
      amenitySlugs: [],
    },
  ];

  for (const { fishSlugs, amenitySlugs, ...data } of demo) {
    const fishIds = await Promise.all(fishSlugs.map((s) => fishBySlug(s).then((f) => f.id)));
    const amenityIds = await Promise.all(
      amenitySlugs.map((s) => amenityBySlug(s).then((a) => a.id)),
    );
    const isPremiumSeed = data.slug === 'ozero-navariia';
    await prisma.water.upsert({
      where: { slug: data.slug },
      // idempotent: update premium flag so re-runs keep navariia premium
      update: isPremiumSeed ? { isPremium: true, premiumUntil: null } : {},
      create: {
        ...data,
        isPremium: isPremiumSeed,
        premiumUntil: null,
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
  }
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
  const murovane = await prisma.water.findUniqueOrThrow({ where: { slug: 'stav-murovane' } });

  // Idempotent: delete existing reviews for these waters first, then recreate
  await prisma.review.deleteMany({ where: { waterId: { in: [navariia.id, murovane.id] } } });

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
        waterId: murovane.id,
        authorName: 'Максим',
        rating: 5,
        text: 'Тихий став, ідеальний для фідерної риболовлі. Короп великий, місця багато. Обов\'язково повернусь!',
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

  // stav-murovane has no APPROVED reviews — reset aggregates
  await prisma.water.update({
    where: { id: murovane.id },
    data: { ratingAvg: null, ratingCount: 0 },
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
  if (process.env.SEED_DEMO === '1') {
    await seedDemoWaters();
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
