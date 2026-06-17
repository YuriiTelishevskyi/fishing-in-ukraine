export const meta = {
  name: 'enrich-waters',
  description: 'Open-web enrich OSM water stubs (original description, fish, price/phone, CC photo) — facts only, no fabrication',
  phases: [{ title: 'Enrich', detail: 'web-research each water; record only found facts; CC photos only' }],
}

const FISH = 'shchuka(Щука), korop(Короп), karas(Карась), sudak(Судак), okun(Окунь), som(Сом), lyn(Лин), lyashch(Лящ), plitka(Плітка), krasnopirka(Краснопірка), tovstolob(Товстолоб), bilyi-amur(Білий амур), zherekh(Жерех), holoven(Головень), forel(Форель), osetr(Осетер), sazan(Сазан), yorzh(Йорж)'
const AMEN = 'altanky(альтанки), nochivlia(ночівля), chovny(човни), parkovka(парковка), kafe(кафе), mahazyn(магазин), prokat-snastei(прокат снастей), tualet(туалет), dush(душ), elektryka(електрика)'

const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    slug: { type: 'string' },
    hasUsefulData: { type: 'boolean', description: 'true ONLY if web search returned REAL specific info about THIS exact water. false if nothing specific found.' },
    descriptionUk: { type: 'string', description: 'ORIGINAL 1-3 factual sentences YOU wrote from what you found (NOT copied prose). "" if nothing.' },
    fishSlugs: { type: 'array', items: { type: 'string' }, description: 'species explicitly associated with THIS water, mapped to allowed slugs; [] if none' },
    amenitySlugs: { type: 'array', items: { type: 'string' }, description: 'amenities explicitly mentioned, mapped to allowed slugs; [] if none' },
    isPaid: { type: 'string', enum: ['paid', 'free', 'unknown'] },
    priceNote: { type: 'string', description: 'short Ukrainian price note if found (e.g. "~150 грн/доба"); "" if none' },
    phone: { type: 'string', description: 'publicly listed contact phone if found, else ""' },
    website: { type: 'string', description: 'official/listing URL if found, else ""' },
    ccPhoto: { type: 'string', description: 'Wikimedia Commons / Wikidata / public-domain image URL ONLY; "" if none. NEVER a Google-image or copyrighted-site URL.' },
    ccPhotoAuthor: { type: 'string', description: 'photo author/source for attribution, else ""' },
    ccPhotoLicense: { type: 'string', description: 'photo license e.g. "CC BY-SA 4.0", else ""' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['slug', 'hasUsefulData', 'descriptionUk', 'fishSlugs', 'amenitySlugs', 'isPaid', 'priceNote', 'phone', 'website', 'ccPhoto', 'ccPhotoAuthor', 'ccPhotoLicense', 'sources'],
}

const sample = typeof args === 'string' ? JSON.parse(args) : (args || [])
phase('Enrich')
log(`Enriching ${sample.length} waters`)

const results = await parallel(sample.map((w) => () =>
  agent(
    `You enrich a Ukrainian fishing-water catalog entry by searching the OPEN web. Water: "${w.name}", ${w.oblast} (${w.waterType}).\n` +
      `Use WebSearch/WebFetch. Queries e.g. "${w.name} ${w.oblast} риболовля", "${w.name} ${w.oblast}", "${w.name} рибалка". Look for REAL specifics about THIS exact water (a different place with a similar name does NOT count).\n` +
      `STRICT RULES (no fabrication — this is a public catalog):\n` +
      `- hasUsefulData=true ONLY if you found REAL, specific info about THIS water. If results are generic / about a different place / nothing specific → hasUsefulData=false and leave everything empty. NEVER invent fish, prices, phones, or descriptions.\n` +
      `- descriptionUk: WRITE YOUR OWN 1-3 factual sentences from what you found — do NOT copy any site's prose verbatim. "" if nothing.\n` +
      `- fishSlugs: only species explicitly associated with this water, mapped to: ${FISH}. [] if none.\n` +
      `- amenitySlugs: only amenities explicitly mentioned, mapped to: ${AMEN}. [] if none.\n` +
      `- isPaid: "paid" if explicitly a paid/commercial water, "free" if explicitly free/wild, else "unknown".\n` +
      `- priceNote: a short UK price note ONLY if a concrete price was found (e.g. "~150 грн/доба"); "" otherwise.\n` +
      `- phone: only a publicly listed contact number; "" otherwise.\n` +
      `- ccPhoto: a Wikimedia Commons / Wikidata / public-domain image URL ONLY (reusable). NEVER Google Images / copyrighted-site photos. "" if none. Fill ccPhotoAuthor + ccPhotoLicense when you do provide one.\n` +
      `- sources: the URLs you actually used.\n` +
      `Return via structured output with slug="${w.slug}".`,
    { label: `enrich:${(w.name || '').slice(0, 18)}`, phase: 'Enrich', schema: SCHEMA, model: 'sonnet' },
  ),
))

const got = (results || []).filter(Boolean)
const useful = got.filter((r) => r.hasUsefulData && (r.descriptionUk?.trim() || r.fishSlugs?.length))

return {
  sampled: sample.length,
  returned: got.length,
  yield: {
    usefulData: useful.length,
    withFish: got.filter((r) => r.fishSlugs?.length).length,
    withPhone: got.filter((r) => r.phone?.trim()).length,
    withPrice: got.filter((r) => r.priceNote?.trim()).length,
    withCcPhoto: got.filter((r) => r.ccPhoto?.trim()).length,
  },
  enriched: useful.map((r) => ({
    slug: r.slug,
    description: (r.descriptionUk || '').trim(),
    fishSlugs: r.fishSlugs || [],
    amenitySlugs: r.amenitySlugs || [],
    isPaid: r.isPaid,
    priceNote: (r.priceNote || '').trim(),
    phone: (r.phone || '').trim(),
    website: (r.website || '').trim(),
    ccPhoto: (r.ccPhoto || '').trim(),
    ccPhotoAuthor: (r.ccPhotoAuthor || '').trim(),
    ccPhotoLicense: (r.ccPhotoLicense || '').trim(),
    sources: r.sources || [],
  })),
  emptySlugs: got.filter((r) => !(r.hasUsefulData && (r.descriptionUk?.trim() || r.fishSlugs?.length))).map((r) => r.slug),
}
