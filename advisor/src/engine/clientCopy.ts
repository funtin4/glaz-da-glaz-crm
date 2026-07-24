import type { LensSku, ScoredLens, Tier } from './types';

/** Client-facing titles — no indexes, coatings, or brand codes. */
export function clientTitle(lens: LensSku): string {
  const bits: string[] = [];

  if (lens.type === 'progressive') bits.push('Линзы «и вдаль, и вблизь»');
  else if (lens.type === 'bifocal') bits.push('Линзы с зоной для чтения');
  else if (lens.type === 'office' || lens.office) bits.push('Линзы для работы и компьютера');
  else bits.push('Линзы в вашу оправу');

  if (lens.photochromic) bits.push('темнеют на улице');
  else if (lens.polarized) bits.push('убирают блики');
  else if (lens.blueFilter) bits.push('мягче для экранов');
  else if (lens.thinness >= 3) bits.push('очень тонкие');
  else if (lens.thinness >= 2) bits.push('потоньше обычных');

  return bits.join(', ');
}

export function tierClientLabel(tier: Tier, featured: boolean): string {
  if (featured || tier === 'optimal') return 'Как я обычно ставлю';
  if (tier === 'practical') return 'Попроще и дешевле';
  return 'Поспокойнее для глаз';
}

export function softenWarning(w: string): string | null {
  const map: Array<[RegExp, string]> = [
    [/прогрессив|офисн|ADD|возраст/i, 'Если вам уже за 45 или в рецепте есть «добавка для чтения» — напишите мне, подскажу, нужны ли особые линзы.'],
    [/высоких диоптр|толст/i, 'У вас заметные диоптрии — взял варианты, которые не будут толстыми в оправе.'],
    [/автомобил|лобов/i, 'Для машины обычные «хамелеоны» темнеют слабее. Если часто за рулём — скажите, подберу правильные.'],
    [/потоньше|тонкий вариант/i, 'С учётом вашего рецепта лучше чуть потоньше — так аккуратнее смотрятся.'],
  ];
  for (const [re, text] of map) {
    if (re.test(w)) return text;
  }
  // drop raw technical warnings from client UI
  if (/SPH|CYL|1\.\d{2}|индекс|SKU|eligible/i.test(w)) return null;
  return w;
}

export function clientReasons(item: ScoredLens): string[] {
  const fromEngine = item.clientReasons.filter(
    (r) => !/1\.\d{2}|Glacier|HMC|AS |индекс|SPH|CYL|Rodenstock|Shamir|Maxxee|Weiya/i.test(r),
  );
  const extras: string[] = [];
  const l = item.lens;
  if (l.coatingLevel >= 4) extras.push('Легче протираются, меньше бликуют');
  if (l.thinness >= 2) extras.push('В оправе выглядят аккуратнее');
  if (l.photochromic) extras.push('На улице сами темнеют, в помещении светлые');
  if (l.blueFilter) extras.push('Комфортнее за компьютером и телефоном');
  if (l.stockType === 'stock') extras.push('Можно сделать быстрее');

  const merged = [...new Set([...fromEngine, ...extras])].slice(0, 3);
  return merged.length ? merged : ['Нормальный рабочий вариант под ваш рецепт'];
}

export function priceLine(item: ScoredLens): { main: string; sub: string } {
  const pair =
    item.pairPrice === item.pairPriceMax
      ? formatRub(item.pairPrice)
      : `от ${formatRub(item.pairPrice)}`;
  return {
    main: pair,
    sub: `линзы · вставка примерно ${formatRub(item.laborEstimate)} · вместе от ${formatRub(item.totalEstimate)}`,
  };
}

function formatRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}
