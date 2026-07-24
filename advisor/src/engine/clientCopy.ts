import { brandsVisible, ctaPhone, ctaPhoneRaw, salonEscalationText } from './ownerConfig';
import type { LensSku, ScoredLens, Tier } from './types';

/** Client-facing titles — brand yes (owner), no coating codes / indexes. */
export function clientTitle(lens: LensSku): string {
  const bits: string[] = [];

  if (brandsVisible() && lens.supplier) bits.push(lens.supplier);

  if (lens.type === 'progressive') bits.push('линзы «и вдаль, и вблизь»');
  else if (lens.type === 'bifocal') bits.push('линзы с зоной для чтения');
  else if (lens.type === 'office' || lens.office) bits.push('линзы для работы и компьютера');
  else bits.push('линзы в вашу оправу');

  if (lens.photochromic) bits.push('темнеют на улице');
  else if (lens.polarized) bits.push('убирают блики');
  else if (lens.blueFilter) bits.push('мягче для экранов');
  else if (lens.thinness >= 3) bits.push('очень тонкие');
  else if (lens.thinness >= 2) bits.push('потоньше обычных');

  const text = bits.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function tierClientLabel(tier: Tier, featured: boolean): string {
  if (featured || tier === 'optimal') return 'Как я обычно ставлю';
  if (tier === 'practical') return 'Попроще и дешевле';
  return 'Поспокойнее / премиум';
}

export function softenWarning(w: string): string | null {
  // Keep owner-approved strings intact
  if (w.includes('Декабристов') || w.includes(salonEscalationText().slice(0, 40))) return w;
  if (/30–40%|30-40%/.test(w) && /автомобил/i.test(w)) return w;
  if (/До 16 лет/i.test(w)) return w;
  if (/без PD|высоты|параметры оправы/i.test(w)) return w;
  if (/добавка для близи|добавка для чтения/i.test(w)) return w;

  const map: Array<[RegExp, string]> = [
    [
      /прогрессив|офисн|ADD|возраст/i,
      'Если вблизи стало хуже читаться — напишите мне, подскажем, нужны ли особые линзы.',
    ],
    [
      /диоптр|толст/i,
      'При таких диоптриях лучше не экономить на толщине — край в оправе будет аккуратнее.',
    ],
    [
      /автомобил|лобов|хамелеон/i,
      'В автомобиле обычные фотохромные линзы темнеют заметно слабее, ориентир — примерно до 30–40%.',
    ],
    [/потоньше|тонкий вариант/i, 'С учётом вашего рецепта лучше чуть потоньше — так аккуратнее смотрятся.'],
  ];
  for (const [re, text] of map) {
    if (re.test(w)) return text;
  }
  if (/SPH|CYL|1\.\d{2}|индекс|SKU|eligible/i.test(w)) return null;
  return w;
}

export function clientReasons(item: ScoredLens): string[] {
  const brandRe = brandsVisible()
    ? /1\.\d{2}|Glacier|HMC|AS |индекс|SPH|CYL/i
    : /1\.\d{2}|Glacier|HMC|AS |индекс|SPH|CYL|Rodenstock|Shamir|Maxxee|Weiya/i;

  const fromEngine = item.clientReasons.filter((r) => !brandRe.test(r));
  const extras: string[] = [];
  const l = item.lens;
  if (brandsVisible() && l.supplier) extras.push(`Бренд: ${l.supplier}`);
  if (l.coatingLevel >= 4) extras.push('Легче протираются, меньше бликуют');
  if (l.thinness >= 2) extras.push('В оправе выглядят аккуратнее');
  if (l.photochromic) extras.push('На улице сами темнеют, в помещении светлые');
  if (l.blueFilter) {
    extras.push('Фильтр части сине-фиолетового света; комфорт у экрана индивидуален');
  }
  if (l.stockType === 'stock') extras.push('Можно сделать быстрее');

  const merged = [...new Set([...fromEngine, ...extras])].slice(0, 4);
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

export function ctaAfterChoice(): string {
  return `Напишите в Авито «беру вот этот» или позвоните ${ctaPhone()} — уточним оправу и срок.`;
}

export function ctaPhoneHref(): string {
  return `tel:+${ctaPhoneRaw().replace(/^8/, '7')}`;
}

export function ctaPhoneLabel(): string {
  return ctaPhone();
}

function formatRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}
