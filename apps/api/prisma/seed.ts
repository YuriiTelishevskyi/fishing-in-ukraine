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
    await prisma.water.upsert({
      where: { slug: data.slug },
      // idempotent: never overwrite manually-edited data on re-runs
      update: {},
      create: {
        ...data,
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
  }
}

async function main() {
  await seedDictionaries();
  if (process.env.SEED_DEMO === '1') {
    await seedDemoWaters();
  }
  const counts = {
    regions: await prisma.region.count(),
    fish: await prisma.fishSpecies.count(),
    amenities: await prisma.amenity.count(),
    waters: await prisma.water.count(),
  };
  console.log('Seed done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
