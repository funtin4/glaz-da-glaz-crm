/**
 * Offline fixtures for the expert engine.
 * Run: npm run test:engine
 */
import { recommend } from './recommend';
import { hardReject } from './rules';
import { emptyAnswers, emptyRx } from './types';
import type { Answers, LensSku, Prescription } from './types';
import { getCatalog } from './recommend';
import { isChildCase, budgetIsSoft, brandsVisible } from './ownerConfig';
import { clientTitle, softenWarning } from './clientCopy';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function caseLowMyopia() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -1, cyl: 0, ax: 0, add: null },
    os: { sph: -1.25, cyl: 0, ax: 0, add: null },
    age: 28,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'min_price',
    thickness: 1,
    photochromic: 'no',
    budgetPair: 15000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.optimal, 'expected optimal');
  const idx = rec.optimal!.lens.index ?? 0;
  assert(idx < 1.74, `low myopia should not get 1.74 as optimal, got ${idx}`);
  console.log('✓ low myopia avoids 1.74 optimal', rec.optimal!.lens.name, idx);
}

function caseHighMyopia() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -8, cyl: -1, ax: 10, add: null },
    os: { sph: -7.5, cyl: -0.75, ax: 170, add: null },
    age: 35,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'thin',
    thickness: 3,
    photochromic: 'no',
    budgetPair: 40000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.optimal, 'expected optimal');
  const idx = rec.optimal!.lens.index ?? 0;
  assert(idx >= 1.6, `high myopia should prefer >=1.60, got ${idx}`);
  console.log('✓ high myopia prefers thin', rec.optimal!.lens.name, idx);
}

function caseIndex167From4() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -4.5, cyl: null, ax: null, add: null },
    os: { sph: -4.25, cyl: null, ax: null, add: null },
    age: 32,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'thin',
    thickness: 3,
    photochromic: 'no',
    budgetPair: 40000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.optimal, 'expected optimal');
  const idx = rec.optimal!.lens.index ?? 0;
  assert(idx >= 1.66, `owner: from ±4 prefer ~1.67, got ${idx}`);
  console.log('✓ ±4.5 prefers 1.67+', rec.optimal!.lens.name, idx);
}

function caseComputer() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -2, cyl: null, ax: null, add: null },
    os: { sph: -2, cyl: null, ax: null, add: null },
    age: 30,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'computer',
    priority: 'computer',
    thickness: 2,
    photochromic: 'no',
    budgetPair: 25000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.optimal, 'expected optimal');
  const l = rec.optimal!.lens;
  assert(
    l.blueFilter || l.suitableComputer || l.accommodationSupport || l.office || l.coatingLevel >= 3,
    'computer case should surface screen-oriented lens',
  );
  console.log('✓ computer boost', l.name);
}

function casePresbyopiaWarning() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: 1.5, cyl: null, ax: null, add: 2 },
    os: { sph: 1.5, cyl: null, ax: null, add: 2 },
    age: 52,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'comfort',
    thickness: 2,
    photochromic: 'unknown',
    budgetPair: null,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.warnings.length > 0, 'expected progressive/office warning');
  console.log('✓ ADD warnings', rec.warnings[0]);
}

function caseAgeAloneNoProgressiveFamily() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -1, cyl: null, ax: null, add: null },
    os: { sph: -1, cyl: null, ax: null, add: null },
    age: 55,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'comfort',
    thickness: 2,
    photochromic: 'no',
    budgetPair: 25000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  // age alone should not force progressive as optimal
  if (rec.optimal) {
    assert(
      rec.optimal.lens.type !== 'progressive' || hasSoftProgWarning(rec.warnings),
      'age alone should not auto-pick progressive without ADD',
    );
  }
  console.log('✓ age alone does not force progressive', rec.optimal?.lens.type);
}

function hasSoftProgWarning(warnings: string[]) {
  return warnings.some((w) => /вблизи|чтени/i.test(w));
}

function casePhotoFilter() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -3, cyl: null, ax: null, add: null },
    os: { sph: -3, cyl: null, ax: null, add: null },
    age: 40,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'photochromic',
    thickness: 2,
    photochromic: 'yes',
    budgetPair: 40000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  for (const tier of [rec.practical, rec.optimal, rec.premium]) {
    if (tier) assert(tier.lens.photochromic, `${tier.lens.name} must be photochromic`);
  }
  console.log('✓ photochromic hard filter');
}

function caseSoftBudget() {
  assert(budgetIsSoft(), 'owner budget soft');
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -2, cyl: null, ax: null, add: null },
    os: { sph: -2, cyl: null, ax: null, add: null },
    age: 30,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'comfort',
    thickness: 2,
    photochromic: 'no',
    budgetPair: 8000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.eligibleCount > 0, 'soft budget should keep eligible lenses');
  // should still produce portfolio somehow
  assert(rec.optimal || rec.practical, 'expected at least one tier');
  console.log('✓ soft budget keeps options', rec.eligibleCount);
}

function caseRodenstockSphNotHardFiltered() {
  const rod = getCatalog().find((l) => l.supplier === 'Rodenstock' && l.sphMin != null);
  assert(rod, 'need a Rodenstock sku');
  const lens = rod as LensSku;
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -12, cyl: null, ax: null, add: null },
    os: { sph: -12, cyl: null, ax: null, add: null },
    age: 40,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'thin',
    thickness: 3,
    photochromic: 'no',
    budgetPair: null,
    frameType: 'full_rim',
  };
  const reason = hardReject(lens, rx, answers);
  assert(reason !== 'SPH ниже диапазона' && reason !== 'SPH выше диапазона', `Rodenstock SPH must not hard-reject, got ${reason}`);
  console.log('✓ Rodenstock SPH not trusted for hard reject');
}

function caseChildEscalation() {
  assert(isChildCase(15), '15 is child');
  assert(!isChildCase(16), '16 not child under exclusive');
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -1, cyl: null, ax: null, add: null },
    os: { sph: -1, cyl: null, ax: null, add: null },
    age: 12,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'comfort',
    thickness: 2,
    photochromic: 'no',
    budgetPair: 15000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.warnings.some((w) => /16|Декабристов|салон/i.test(w)), 'child → salon');
  const soft = softenWarning(rec.warnings.find((w) => /16|Декабристов/i.test(w))!);
  assert(soft && /Декабристов/.test(soft), 'salon address must survive soften');
  console.log('✓ child escalation to Moscow salon');
}

function casePortfolioDiffers() {
  const rx: Prescription = {
    ...emptyRx(),
    od: { sph: -2.5, cyl: -0.5, ax: 10, add: null },
    os: { sph: -2.25, cyl: -0.75, ax: 170, add: null },
    age: 34,
  };
  const answers: Answers = {
    ...emptyAnswers(),
    purpose: 'daily',
    priority: 'comfort',
    thickness: 2,
    photochromic: 'no',
    budgetPair: 25000,
    frameType: 'full_rim',
  };
  const rec = recommend(rx, answers);
  assert(rec.practical && rec.optimal && rec.premium, 'need 3 tiers');
  assert(rec.compare, 'need compare notes');
  const ids = new Set([rec.practical!.lens.id, rec.optimal!.lens.id, rec.premium!.lens.id]);
  assert(ids.size === 3, 'three distinct SKUs');

  const prices = [rec.practical!.pairPrice, rec.optimal!.pairPrice, rec.premium!.pairPrice];
  const span = Math.max(...prices) - Math.min(...prices);
  assert(span >= 1000 || differentiationOk(rec), `portfolio should differ in price or axes, span=${span}`);

  for (const tier of ['practical', 'optimal', 'premium'] as const) {
    const note = rec.compare!.byTier[tier];
    assert(note.vsOthers.length >= 1, `${tier} needs vsOthers`);
    assert(
      note.vsOthers.some((l) => /₽|покрыт|тон|толщ|бренд|Дешевле|Дороже|Экономия|Доплата|середина/i.test(l)) ||
        (note.moneyStory != null && note.moneyStory.length > 0),
      `${tier} compare must talk money or product axes`,
    );
  }
  console.log(
    '✓ portfolio differs',
    rec.practical!.pairPrice,
    rec.optimal!.pairPrice,
    rec.premium!.pairPrice,
    rec.compare!.byTier.premium.moneyStory,
  );
}

function differentiationOk(rec: ReturnType<typeof recommend>): boolean {
  const a = rec.practical!.lens;
  const b = rec.optimal!.lens;
  const c = rec.premium!.lens;
  const axes = (x: typeof a, y: typeof a) => {
    let d = 0;
    if (x.supplier !== y.supplier) d++;
    if (x.thinness !== y.thinness) d++;
    if (x.coatingLevel !== y.coatingLevel) d++;
    if (Math.abs((x.index ?? 0) - (y.index ?? 0)) >= 0.05) d++;
    return d;
  };
  return axes(a, b) + axes(b, c) >= 2;
}

caseLowMyopia();
caseHighMyopia();
caseIndex167From4();
caseComputer();
casePresbyopiaWarning();
caseAgeAloneNoProgressiveFamily();
casePhotoFilter();
caseSoftBudget();
caseRodenstockSphNotHardFiltered();
caseChildEscalation();
casePortfolioDiffers();
caseBrandsVisible();
console.log('All engine fixtures passed');

function caseBrandsVisible() {
  assert(brandsVisible(), 'brands visible');
  const lens = getCatalog()[0];
  const title = clientTitle(lens);
  assert(title.includes(lens.supplier), `title should include brand, got ${title}`);
  console.log('✓ brands in client title', title);
}
