/**
 * Offline fixtures for the expert engine.
 * Run: npx tsx src/engine/recommend.test.ts
 * or: node --experimental-strip-types (fallback via vite-node)
 */
import { recommend } from './recommend';
import { emptyAnswers, emptyRx } from './types';
import type { Answers, Prescription } from './types';

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
    l.blueFilter || l.suitableComputer || l.accommodationSupport || l.office,
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
  console.log('✓ age/ADD warnings', rec.warnings[0]);
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

caseLowMyopia();
caseHighMyopia();
caseComputer();
casePresbyopiaWarning();
casePhotoFilter();
console.log('All engine fixtures passed');
