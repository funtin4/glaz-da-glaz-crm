import catalog from '../data/lenses.json';
import services from '../data/services.json';
import {
  RULESET_VERSION,
  evaluateSoftRules,
  hardReject,
  hasAdd,
  laborForFrame,
  maxAbsSph,
  recommendedThinness,
  suggestedLensFamily,
} from './rules';
import type {
  Answers,
  LensSku,
  Prescription,
  RecommendationSet,
  ScoredLens,
  Tier,
} from './types';

const lenses = catalog.lenses as LensSku[];

export function getCatalog(): LensSku[] {
  return lenses;
}

export function getCatalogMeta() {
  return catalog.meta;
}

export function getServices() {
  return services.services;
}

function pairPrice(lens: LensSku): { min: number; max: number } {
  return { min: lens.pricePairMin, max: lens.pricePairMax };
}

function baseScore(lens: LensSku): number {
  // Prefer mid-tier coatings and known suppliers slightly
  let s = 50;
  s += lens.coatingLevel * 2;
  s += lens.comfort;
  s += lens.clarity;
  if (lens.stockType === 'stock') s += 3; // faster for salon
  return s;
}

export function scoreLens(lens: LensSku, rx: Prescription, answers: Answers): ScoredLens {
  const reject = hardReject(lens, rx, answers);
  const hits = reject ? [] : evaluateSoftRules(lens, rx, answers);
  const weight = hits.reduce((a, h) => a + h.weight, 0);
  const labor = laborForFrame(answers.frameType);
  const prices = pairPrice(lens);

  const clientReasons = [
    ...new Set(
      hits
        .filter((h) => h.clientReason && h.weight > 0)
        .map((h) => h.clientReason as string),
    ),
  ].slice(0, 4);

  if (!clientReasons.length) {
    clientReasons.push(...lens.benefits.slice(0, 2));
  }

  return {
    lens,
    score: reject ? -9999 : baseScore(lens) + weight,
    hardRejected: Boolean(reject),
    rejectReasons: reject ? [reject] : [],
    boostReasons: hits.filter((h) => h.weight > 0).map((h) => h.reason),
    penaltyReasons: hits.filter((h) => h.weight < 0).map((h) => h.reason),
    pairPrice: prices.min,
    pairPriceMax: prices.max,
    laborEstimate: labor,
    totalEstimate: prices.min + labor,
    clientReasons,
  };
}

function diversityKey(lens: LensSku): string {
  return [
    lens.supplier,
    lens.index,
    lens.photochromic ? 'ph' : 'cl',
    lens.blueFilter ? 'bl' : 'nb',
    lens.type,
    Math.round(lens.pricePairMin / 3000),
  ].join('|');
}

function pickBest(
  pool: ScoredLens[],
  predicate: (s: ScoredLens) => boolean,
  used: Set<string>,
): ScoredLens | null {
  const candidates = pool
    .filter((s) => predicate(s) && !used.has(s.lens.id))
    .sort((a, b) => b.score - a.score || a.pairPrice - b.pairPrice);
  for (const c of candidates) {
    const key = diversityKey(c.lens);
    const sameFamily = [...used].some((id) => {
      const other = pool.find((p) => p.lens.id === id);
      return other && diversityKey(other.lens) === key;
    });
    if (!sameFamily) {
      used.add(c.lens.id);
      return c;
    }
  }
  const fallback = candidates[0];
  if (fallback) used.add(fallback.lens.id);
  return fallback ?? null;
}

export function recommend(rx: Prescription, answers: Answers): RecommendationSet {
  const warnings: string[] = [];
  const sph = maxAbsSph(rx);
  const family = suggestedLensFamily(answers.purpose, rx);
  if (family.warnProgressive) {
    warnings.push(
      'По возрасту или ADD стоит обсудить офисные или прогрессивные линзы — не только «для дали».',
    );
  }
  if (sph >= 6) {
    warnings.push('При высоких диоптриях мы заранее отсеяли слишком толстые варианты.');
  }
  if (answers.purpose === 'car' && answers.photochromic === 'yes') {
    warnings.push('Для автомобиля лучше серии, которые затемняются и за рулём — обычный фотохром за лобовым слабее.');
  }

  const minThin = recommendedThinness(rx, answers.frameType);
  if (!answers.thickness) {
    // engine still uses optics floor via rules
  } else if (answers.thickness < minThin) {
    warnings.push('Вы просили потолще, но для вашего рецепта безопаснее чуть более тонкий вариант — учли это.');
  }

  const scored = lenses.map((l) => scoreLens(l, rx, answers));
  const eligible = scored.filter((s) => !s.hardRejected).sort((a, b) => b.score - a.score);

  // Prefer matching type family first
  const typed = eligible.filter((s) => family.prefer.includes(s.lens.type));
  const pool = typed.length >= 3 ? typed : eligible;

  const budget = answers.budgetPair;
  const used = new Set<string>();

  const practical = pickBest(
    pool,
    (s) => {
      if (answers.priority === 'min_price') return true;
      if (budget != null) return s.pairPrice <= budget * 0.75;
      // cheapest third among top scores
      const prices = pool.map((p) => p.pairPrice).sort((a, b) => a - b);
      const cut = prices[Math.floor(prices.length * 0.4)] ?? s.pairPrice;
      return s.pairPrice <= cut && s.score > 40;
    },
    used,
  );

  const optimal = pickBest(
    pool,
    (s) => {
      if (budget != null) return s.pairPrice <= budget * 1.05;
      return s.score >= (pool[0]?.score ?? 0) - 25;
    },
    used,
  );

  const premium = pickBest(
    pool,
    (s) => {
      if (answers.priority === 'min_price') return s.lens.coatingLevel >= 3 && s.score > 45;
      return (
        s.lens.coatingLevel >= 3 ||
        s.lens.comfort >= 4 ||
        s.lens.supplier === 'Rodenstock' ||
        s.lens.thinness >= 3
      );
    },
    used,
  );

  // Ensure we always try to fill 3 from remaining
  const fill = (current: ScoredLens | null): ScoredLens | null => {
    if (current) return current;
    return pickBest(pool, () => true, used);
  };

  const result: RecommendationSet = {
    practical: fill(practical),
    optimal: fill(optimal),
    premium: fill(premium),
    warnings,
    rulesetVersion: RULESET_VERSION,
    eligibleCount: eligible.length,
  };

  // If optimal empty somehow
  if (!result.optimal && result.practical) result.optimal = result.practical;

  // Annotate popular
  if (result.optimal && !result.optimal.clientReasons.includes('Самый популярный выбор')) {
    // keep engine reasons
  }

  if (hasAdd(rx) && result.optimal && result.optimal.lens.type === 'single_vision') {
    warnings.push('В рецепте есть ADD — уточните у мастера, не нужны ли прогрессивные или офисные линзы.');
  }

  return result;
}

export function tierLabel(tier: Tier): string {
  if (tier === 'practical') return 'Практичный вариант';
  if (tier === 'premium') return 'Премиальный вариант';
  return 'Оптимальный вариант';
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}

export { lenses, RULESET_VERSION };
