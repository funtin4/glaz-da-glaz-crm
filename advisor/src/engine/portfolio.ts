import type { LensSku, ScoredLens, Tier } from './types';

/** How many client-visible axes differ between two SKUs. */
export function differentiationAxes(a: LensSku, b: LensSku): number {
  let d = 0;
  if (a.supplier !== b.supplier) d += 1;
  if (Math.abs((a.index ?? 1.5) - (b.index ?? 1.5)) >= 0.05) d += 1;
  if (a.thinness !== b.thinness) d += 1;
  if (Math.abs(a.coatingLevel - b.coatingLevel) >= 1) d += 1;
  if (a.photochromic !== b.photochromic) d += 1;
  if (a.blueFilter !== b.blueFilter) d += 1;
  if (a.type !== b.type) d += 1;
  if (Math.abs(a.pricePairMin - b.pricePairMin) >= 1200) d += 1;
  if (Math.abs(a.comfort - b.comfort) >= 2) d += 1;
  return d;
}

export function isDifferentEnough(
  candidate: LensSku,
  used: LensSku[],
  minAxes = 2,
): boolean {
  if (!used.length) return true;
  return used.every((u) => differentiationAxes(candidate, u) >= minAxes);
}

function priceGap(a: ScoredLens, b: ScoredLens): number {
  return Math.abs(a.pairPrice - b.pairPrice);
}

/**
 * Build a 3-tier portfolio that clients can tell apart:
 * - optimal: best score in soft budget (hero)
 * - practical: cheaper + simpler (coating/thickness/brand), still ok for Rx
 * - premium: clearer upgrade (coating / thinner / brand / comfort), usually pricier
 */
export function pickDiversifiedPortfolio(
  pool: ScoredLens[],
  budget: number | null | undefined,
): { practical: ScoredLens | null; optimal: ScoredLens | null; premium: ScoredLens | null } {
  if (!pool.length) {
    return { practical: null, optimal: null, premium: null };
  }

  const softCap = budget != null ? budget * 1.25 : Infinity;
  const inSoft = pool.filter((s) => s.pairPrice <= softCap);
  const heroPool = inSoft.length ? inSoft : pool;

  const optimal =
    [...heroPool].sort((a, b) => b.score - a.score || a.pairPrice - b.pairPrice)[0] ?? null;

  const usedIds = new Set<string>();
  const usedLenses: LensSku[] = [];
  if (optimal) {
    usedIds.add(optimal.lens.id);
    usedLenses.push(optimal.lens);
  }

  const pick = (
    candidates: ScoredLens[],
    prefer: (s: ScoredLens) => number,
  ): ScoredLens | null => {
    const free = candidates.filter((s) => !usedIds.has(s.lens.id));
    for (const minAxes of [2, 1, 0]) {
      const ok = free
        .filter((s) => isDifferentEnough(s.lens, usedLenses, minAxes))
        .sort((a, b) => prefer(b) - prefer(a) || b.score - a.score || a.pairPrice - b.pairPrice);
      if (ok[0]) {
        usedIds.add(ok[0].lens.id);
        usedLenses.push(ok[0].lens);
        return ok[0];
      }
    }
    return null;
  };

  // Practical: cheaper than optimal when possible; prefer simpler coating / thicker / lower brand tier
  const cheaperThanOpt = optimal
    ? pool.filter(
        (s) =>
          s.pairPrice <= optimal.pairPrice * 0.92 ||
          s.pairPrice + 1500 <= optimal.pairPrice ||
          (s.pairPrice < optimal.pairPrice && s.lens.coatingLevel < optimal.lens.coatingLevel),
      )
    : pool;

  const practicalPool = cheaperThanOpt.length ? cheaperThanOpt : pool;
  const practical = pick(practicalPool, (s) => {
    let v = 0;
    if (optimal) {
      if (s.pairPrice < optimal.pairPrice) v += 40;
      if (priceGap(s, optimal) >= 1500) v += 20;
      if (s.lens.coatingLevel < optimal.lens.coatingLevel) v += 18;
      if (s.lens.thinness < optimal.lens.thinness) v += 10;
      if (s.lens.supplier !== optimal.lens.supplier) v += 8;
      // still usable: don't reward garbage scores too hard
      v += Math.min(30, s.score / 5);
    } else {
      v = -s.pairPrice;
    }
    return v;
  });

  // Premium: upgrade axes vs optimal — thinner, better coat, stronger brand, more comfort
  const upgradePool = optimal
    ? pool.filter((s) => {
        const l = s.lens;
        const o = optimal.lens;
        const betterCoat = l.coatingLevel > o.coatingLevel;
        const thinner = l.thinness > o.thinness || (l.index ?? 0) > (o.index ?? 0) + 0.04;
        const betterBrand =
          (l.supplier === 'Rodenstock' || l.supplier === 'Shamir') &&
          l.supplier !== o.supplier;
        const moreComfort = l.comfort > o.comfort;
        const pricier = s.pairPrice >= optimal.pairPrice * 1.08 || s.pairPrice - optimal.pairPrice >= 1500;
        return betterCoat || thinner || betterBrand || moreComfort || pricier;
      })
    : pool;

  const premium = pick(upgradePool.length ? upgradePool : pool, (s) => {
    let v = 0;
    if (optimal) {
      const l = s.lens;
      const o = optimal.lens;
      if (l.coatingLevel > o.coatingLevel) v += 28;
      if (l.thinness > o.thinness) v += 22;
      if ((l.index ?? 0) > (o.index ?? 0) + 0.04) v += 18;
      if (l.comfort > o.comfort) v += 12;
      if (l.supplier === 'Rodenstock') v += 10;
      if (l.supplier === 'Shamir' && o.supplier !== 'Shamir') v += 6;
      if (s.pairPrice > optimal.pairPrice) v += 15;
      if (priceGap(s, optimal) >= 1500) v += 12;
      v += Math.min(25, s.score / 6);
    } else {
      v = s.score;
    }
    return v;
  });

  // Ensure we always try to fill 3 distinct SKUs
  const fill = (current: ScoredLens | null): ScoredLens | null => {
    if (current) return current;
    return pick(pool, (s) => s.score);
  };

  let result: {
    practical: ScoredLens | null;
    optimal: ScoredLens | null;
    premium: ScoredLens | null;
  } = {
    practical: fill(practical),
    optimal: optimal ?? fill(null),
    premium: fill(premium),
  };

  // Last resort: if two slots collapsed to near-clones, reshuffle premium/practical
  result = ensurePriceLadder(result, pool);

  return result;
}

function ensurePriceLadder(
  set: { practical: ScoredLens | null; optimal: ScoredLens | null; premium: ScoredLens | null },
  pool: ScoredLens[],
): typeof set {
  const { practical, optimal, premium } = set;
  if (!practical || !optimal || !premium) return set;

  const ordered = [practical, optimal, premium].sort((a, b) => a.pairPrice - b.pairPrice);
  // If prices are within 800₽ of each other across all three, try replace extremes
  const span = ordered[2].pairPrice - ordered[0].pairPrice;
  if (span >= 2000) {
    // Re-assign by price while keeping optimal as middle-scoring hero when possible
    return {
      practical: ordered[0],
      optimal:
        [practical, optimal, premium].sort((a, b) => b.score - a.score)[0] === ordered[1]
          ? ordered[1]
          : optimal.pairPrice >= ordered[0].pairPrice && optimal.pairPrice <= ordered[2].pairPrice
            ? optimal
            : ordered[1],
      premium: ordered[2],
    };
  }

  // Try find a cheaper practical and pricier premium
  const used = new Set([practical.lens.id, optimal.lens.id, premium.lens.id]);
  const cheaper = pool
    .filter((s) => !used.has(s.lens.id) && s.pairPrice <= optimal.pairPrice - 2000)
    .sort((a, b) => b.score - a.score)[0];
  const pricier = pool
    .filter((s) => !used.has(s.lens.id) && s.pairPrice >= optimal.pairPrice + 2000)
    .sort((a, b) => b.score - a.score)[0];

  return {
    practical: cheaper && isDifferentEnough(cheaper.lens, [optimal.lens], 1) ? cheaper : practical,
    optimal,
    premium: pricier && isDifferentEnough(pricier.lens, [optimal.lens], 1) ? pricier : premium,
  };
}

export interface TierCompare {
  tier: Tier;
  /** Short line under the title: what this option is for */
  hook: string;
  /** Bullets unique to this tier vs the other two */
  vsOthers: string[];
  /** One-line money story */
  moneyStory: string | null;
}

export interface PortfolioCompare {
  intro: string;
  byTier: Record<Tier, TierCompare>;
}

function rub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}

function coatingWords(level: number): string {
  if (level >= 4) return 'покрытие «получше»: меньше бликуют, легче протирать';
  if (level >= 3) return 'нормальное антибликовое покрытие';
  if (level >= 2) return 'покрытие попроще';
  return 'самое простое покрытие';
}

function thinWords(thinness: number, index: number | null): string {
  if (thinness >= 3 || (index != null && index >= 1.67)) return 'заметно тоньше в оправе';
  if (thinness >= 2 || (index != null && index >= 1.59)) return 'потоньше обычных';
  return 'обычная толщина';
}

function diffLines(from: ScoredLens, to: ScoredLens, direction: 'upgrade' | 'downgrade'): string[] {
  const a = from.lens;
  const b = to.lens;
  const lines: string[] = [];
  const priceDelta = to.pairPrice - from.pairPrice;

  if (Math.abs(priceDelta) >= 800) {
    if (direction === 'upgrade' && priceDelta > 0) {
      lines.push(`Дороже примерно на ${rub(priceDelta)} за пару`);
    } else if (direction === 'downgrade' && priceDelta < 0) {
      lines.push(`Дешевле примерно на ${rub(Math.abs(priceDelta))} за пару`);
    } else if (priceDelta > 0) {
      lines.push(`Дороже примерно на ${rub(priceDelta)} за пару`);
    } else if (priceDelta < 0) {
      lines.push(`Дешевле примерно на ${rub(Math.abs(priceDelta))} за пару`);
    }
  }

  if (b.thinness > a.thinness || (b.index ?? 0) > (a.index ?? 0) + 0.04) {
    lines.push(direction === 'upgrade' ? 'Тоньше в оправе' : 'Тоньше, чем у более простого варианта');
  } else if (b.thinness < a.thinness || (b.index ?? 0) + 0.04 < (a.index ?? 0)) {
    lines.push(direction === 'downgrade' ? 'Толще в оправе — на этом и экономия' : 'Толще в оправе');
  }

  if (b.coatingLevel > a.coatingLevel) {
    lines.push('Лучше покрытие: меньше бликов, легче ухаживать');
  } else if (b.coatingLevel < a.coatingLevel) {
    lines.push('Покрытие проще — чаще могут бликовать');
  }

  if (b.supplier !== a.supplier) {
    lines.push(`Другой бренд: ${b.supplier} вместо ${a.supplier}`);
  }

  if (b.photochromic && !a.photochromic) lines.push('Сами темнеют на улице');
  if (!b.photochromic && a.photochromic) lines.push('Обычные светлые, без затемнения');

  if (b.blueFilter && !a.blueFilter) {
    lines.push('Есть фильтр части сине-фиолетового света (комфорт у экрана индивидуален)');
  }
  if (!b.blueFilter && a.blueFilter) lines.push('Без отдельного фильтра синего');

  if (b.comfort > a.comfort + 1) lines.push('Ощущаются комфортнее в носке');
  if (b.comfort + 1 < a.comfort) lines.push('Проще по конструкции — без «премиум»-комфорта');

  if (b.type !== a.type) {
    if (b.type === 'progressive') lines.push('Зоны и вдаль, и вблизь в одних линзах');
    else if (b.type === 'office') lines.push('Удобнее на средней дистанции / у экрана');
    else if (a.type === 'progressive' || a.type === 'office') lines.push('Обычные линзы одной зоны');
  }

  return [...new Set(lines)].slice(0, 4);
}

/** Plain-language comparison of the three final options. */
export function comparePortfolio(
  practical: ScoredLens | null,
  optimal: ScoredLens | null,
  premium: ScoredLens | null,
): PortfolioCompare {
  const intro =
    'Разница не «просто цифра». Обычно платите за толщину в оправе, качество покрытия и бренд.';

  const empty = (tier: Tier): TierCompare => ({
    tier,
    hook: '',
    vsOthers: [],
    moneyStory: null,
  });

  if (!practical || !optimal || !premium) {
    return {
      intro,
      byTier: {
        practical: empty('practical'),
        optimal: empty('optimal'),
        premium: empty('premium'),
      },
    };
  }

  const p = practical.lens;
  const o = optimal.lens;
  const r = premium.lens;

  const practicalVs = [
    ...diffLines(optimal, practical, 'downgrade'),
    `${coatingWords(p.coatingLevel)}; ${thinWords(p.thinness, p.index)}`,
  ];
  const optimalVs = [
    'Золотая середина: то, что я чаще всего и ставлю под такой запрос',
    `${coatingWords(o.coatingLevel)}; ${thinWords(o.thinness, o.index)}`,
    `Бренд: ${o.supplier}`,
  ];
  if (practical.pairPrice < optimal.pairPrice) {
    optimalVs.push(
      `Дороже простого варианта примерно на ${rub(optimal.pairPrice - practical.pairPrice)} — обычно за покрытие/тонкость`,
    );
  }
  if (premium.pairPrice > optimal.pairPrice) {
    optimalVs.push(
      `Дешевле премиума примерно на ${rub(premium.pairPrice - optimal.pairPrice)}`,
    );
  }

  const premiumVs = [
    ...diffLines(optimal, premium, 'upgrade'),
    `${coatingWords(r.coatingLevel)}; ${thinWords(r.thinness, r.index)}`,
    `Бренд: ${r.supplier}`,
  ];

  const moneyPractical =
    optimal.pairPrice > practical.pairPrice
      ? `Экономия ~${rub(optimal.pairPrice - practical.pairPrice)} к «как обычно ставлю» — за счёт более простого покрытия или толщины`
      : null;
  const moneyPremium =
    premium.pairPrice > optimal.pairPrice
      ? `Доплата ~${rub(premium.pairPrice - optimal.pairPrice)} к среднему — за более тонкие / лучшее покрытие / бренд`
      : premium.pairPrice === optimal.pairPrice
        ? 'Цена близка к среднему — разница в бренде или покрытии'
        : null;

  return {
    intro,
    byTier: {
      practical: {
        tier: 'practical',
        hook: 'На чём экономим',
        vsOthers: [...new Set(practicalVs)].slice(0, 5),
        moneyStory: moneyPractical,
      },
      optimal: {
        tier: 'optimal',
        hook: 'Как я обычно ставлю',
        vsOthers: [...new Set(optimalVs)].slice(0, 5),
        moneyStory:
          practical.pairPrice < optimal.pairPrice && premium.pairPrice > optimal.pairPrice
            ? `Между ${rub(practical.pairPrice)} и ${rub(premium.pairPrice)} — баланс цены и качества`
            : null,
      },
      premium: {
        tier: 'premium',
        hook: 'За что доплата',
        vsOthers: [...new Set(premiumVs)].slice(0, 5),
        moneyStory: moneyPremium,
      },
    },
  };
}

/** Reasons shown on the card face — unique vs siblings when possible. */
export function tierFaceReasons(
  tier: Tier,
  item: ScoredLens,
  compare: PortfolioCompare,
): string[] {
  const fromCompare = compare.byTier[tier].vsOthers.filter(Boolean);
  const money = compare.byTier[tier].moneyStory;
  const out = [...fromCompare];
  if (money) out.unshift(money);
  // keep brand visible once
  if (item.lens.supplier && !out.some((x) => x.includes(item.lens.supplier))) {
    out.push(`Бренд: ${item.lens.supplier}`);
  }
  return [...new Set(out)].slice(0, 4);
}
