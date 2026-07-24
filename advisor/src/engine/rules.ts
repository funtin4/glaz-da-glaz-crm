import type { Answers, LensSku, Prescription, Purpose } from './types';

export const RULESET_VERSION = '2026.07.1';

/** Strongest sphere magnitude across both eyes (absolute). */
export function maxAbsSph(rx: Prescription): number {
  const vals = [rx.od.sph, rx.os.sph].filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return Math.max(...vals.map(Math.abs));
}

export function maxAbsCyl(rx: Prescription): number {
  const vals = [rx.od.cyl, rx.os.cyl].filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return Math.max(...vals.map(Math.abs));
}

export function hasAdd(rx: Prescription): boolean {
  return [rx.od.add, rx.os.add].some((v) => v != null && v > 0);
}

export function suggestedLensFamily(purpose: Purpose | null, rx: Prescription): {
  prefer: Array<LensSku['type']>;
  warnProgressive: boolean;
} {
  const age = rx.age;
  const add = hasAdd(rx);
  const warnProgressive = Boolean((age != null && age >= 45) || add);

  if (purpose === 'computer' || purpose === 'work') {
    // Young clients: SV + blue filter. Office geometry — when near/add/presbyopia risk.
    if (add || (age != null && age >= 40)) {
      return { prefer: ['office', 'single_vision', 'progressive'], warnProgressive };
    }
    return { prefer: ['single_vision', 'office'], warnProgressive };
  }
  if (purpose === 'reading') {
    return { prefer: add || (age != null && age >= 45) ? ['office', 'bifocal', 'progressive', 'single_vision'] : ['single_vision', 'office'], warnProgressive };
  }
  if (purpose === 'daily' || purpose === 'distance' || purpose === 'car' || purpose === 'unknown' || !purpose) {
    if (add || (age != null && age >= 50)) {
      return { prefer: ['progressive', 'bifocal', 'single_vision'], warnProgressive: true };
    }
    return { prefer: ['single_vision'], warnProgressive };
  }
  return { prefer: ['single_vision'], warnProgressive };
}

/** Minimum recommended thinness band from optics experience. */
export function recommendedThinness(rx: Prescription, frameType: Answers['frameType']): 1 | 2 | 3 {
  const sph = maxAbsSph(rx);
  const cyl = maxAbsCyl(rx);
  let band: 1 | 2 | 3 = 1;
  if (sph >= 2.5 || cyl >= 1.5) band = 2;
  if (sph >= 5 || cyl >= 2.5) band = 3;
  if (frameType === 'rimless' && band < 2) band = 2;
  if (frameType === 'rimless' && sph >= 3) band = 3;
  return band;
}

export function laborForFrame(frameType: Answers['frameType']): number {
  if (frameType === 'rimless') return 2000;
  if (frameType === 'semi_rim') return 1500;
  return 1000; // full_rim / unknown baseline
}

export interface RuleHit {
  code: string;
  weight: number;
  reason: string;
  clientReason?: string;
}

/** Score deltas for a lens given context. Positive = better. */
export function evaluateSoftRules(
  lens: LensSku,
  rx: Prescription,
  answers: Answers,
): RuleHit[] {
  const hits: RuleHit[] = [];
  const sph = maxAbsSph(rx);
  const cyl = maxAbsCyl(rx);
  const purpose = answers.purpose;
  const priority = answers.priority;
  const photo = answers.photochromic;
  const thicknessPref = answers.thickness;
  const minThin = recommendedThinness(rx, answers.frameType);

  // Index vs power
  if (sph < 2 && lens.index != null && lens.index >= 1.74) {
    hits.push({
      code: 'overkill_174',
      weight: -35,
      reason: '1.74 избыточен при низкой коррекции',
      clientReason: 'Для вашего рецепта сверхтонкие линзы обычно не нужны',
    });
  }
  if (sph < 1.5 && lens.index != null && lens.index >= 1.67 && !lens.photochromic) {
    hits.push({
      code: 'overkill_167',
      weight: -12,
      reason: 'Высокий индекс слабо оправдан при SPH < 1.5',
    });
  }
  if (sph >= 6 && lens.index != null && lens.index <= 1.5) {
    hits.push({
      code: 'too_thick_high_minus',
      weight: -50,
      reason: 'Толстые линзы при высокой коррекции',
      clientReason: 'При ваших диоптриях стандартные линзы будут толстыми и тяжёлыми',
    });
  }
  if (sph >= 4 && lens.index != null && lens.index < 1.6) {
    hits.push({
      code: 'prefer_160_plus',
      weight: -18,
      reason: 'Ниже 1.60 при |SPH|≥4',
      clientReason: 'Есть смысл взять потоньше',
    });
  }
  if (sph >= 4 && (lens.thinness >= 2 || (lens.index != null && lens.index >= 1.6))) {
    hits.push({
      code: 'good_for_high',
      weight: 18,
      reason: 'Подходит высоким диоптриям',
      clientReason: 'Хорошо смотрятся при ваших диоптриях',
    });
  }

  // Thickness preference
  if (thicknessPref != null) {
    const diff = Math.abs(lens.thinness - thicknessPref);
    if (diff === 0) hits.push({ code: 'thin_match', weight: 16, reason: 'Совпала желаемая тонкость' });
    if (diff === 1) hits.push({ code: 'thin_near', weight: 4, reason: 'Близкая тонкость' });
    if (lens.thinness < minThin) {
      hits.push({
        code: 'below_optics_min',
        weight: -22,
        reason: 'Тоньше оптического минимума для рецепта/оправы',
        clientReason: 'Для вашего рецепта лучше взять вариант потоньше',
      });
    }
    if (thicknessPref >= 3 && lens.thinness >= 3) {
      hits.push({ code: 'max_thin', weight: 14, reason: 'Максимально тонкие', clientReason: 'Максимально тонкие' });
    }
  } else if (lens.thinness < minThin) {
    hits.push({ code: 'auto_thin_floor', weight: -15, reason: 'Ниже рекомендованной тонкости' });
  }

  // Purpose
  if (purpose === 'computer') {
    if (lens.blueFilter || lens.suitableComputer || lens.office || lens.accommodationSupport) {
      hits.push({
        code: 'computer_fit',
        weight: 22,
        reason: 'Подходит для экранов',
        clientReason: 'Лучше подходят для компьютера',
      });
    }
    if (lens.polarized) {
      hits.push({ code: 'polar_vs_pc', weight: -25, reason: 'Поляризация не нужна для ПК' });
    }
  }
  if (purpose === 'car') {
    if (lens.drive || (lens.photochromic && /xtractive|drive/i.test(lens.name + lens.subtitle))) {
      hits.push({
        code: 'drive_fit',
        weight: 24,
        reason: 'Для вождения',
        clientReason: 'Удобны за рулём',
      });
    }
    if (lens.photochromic && !lens.drive && !/xtractive/i.test(lens.name)) {
      hits.push({
        code: 'photo_in_car_weak',
        weight: -8,
        reason: 'Обычный фотохром слабо работает за лобовым',
        clientReason: 'Обычные «хамелеоны» в машине темнеют слабее',
      });
    }
    if (lens.polarized) {
      hits.push({
        code: 'polar_drive',
        weight: 12,
        reason: 'Поляризация на дороге',
        clientReason: 'Меньше бликов от дороги',
      });
    }
  }
  if (purpose === 'daily' && lens.suitableDaily) {
    hits.push({ code: 'daily', weight: 8, reason: 'Для постоянного ношения' });
  }
  if (purpose === 'reading' && (lens.office || lens.type === 'bifocal' || lens.type === 'progressive')) {
    hits.push({ code: 'near_work', weight: 14, reason: 'Для чтения/близи', clientReason: 'Комфортны для чтения' });
  }
  if ((purpose === 'work' || purpose === 'computer') && lens.office) {
    hits.push({ code: 'office', weight: 16, reason: 'Офисная геометрия', clientReason: 'Удобны на средней дистанции' });
  }

  // Photochromic preference
  if (photo === 'yes') {
    if (lens.photochromic) {
      hits.push({
        code: 'photo_yes',
        weight: 28,
        reason: 'Фотохром запрошен',
        clientReason: 'Сами темнеют на солнце',
      });
    } else {
      hits.push({ code: 'photo_missing', weight: -40, reason: 'Нет фотохрома при запросе' });
    }
  }
  if (photo === 'no' && lens.photochromic) {
    hits.push({ code: 'photo_unwanted', weight: -45, reason: 'Фотохром не нужен' });
  }
  if (priority === 'photochromic' && lens.photochromic) {
    hits.push({ code: 'prio_photo', weight: 20, reason: 'Приоритет затемнения' });
  }

  // Priority
  if (priority === 'min_price') {
    // handled mainly in portfolio; soft nudge to cheaper coatings
    if (lens.coatingLevel <= 2) hits.push({ code: 'cheap_coat', weight: 6, reason: 'Простое покрытие' });
    if (lens.pricePairMin > 20000) hits.push({ code: 'expensive_vs_min', weight: -30, reason: 'Дорого при min_price' });
  }
  if (priority === 'thin' && lens.thinness >= 2) {
    hits.push({ code: 'prio_thin', weight: 18, reason: 'Приоритет тонкости', clientReason: 'Более тонкие' });
  }
  if (priority === 'comfort' && lens.comfort >= 4) {
    hits.push({
      code: 'prio_comfort',
      weight: 16,
      reason: 'Комфорт',
      clientReason: 'Максимальный комфорт',
    });
  }
  if (priority === 'computer' && (lens.blueFilter || lens.accommodationSupport)) {
    hits.push({
      code: 'prio_pc',
      weight: 18,
      reason: 'Защита/поддержка для ПК',
      clientReason: 'Лучше подходят для компьютера',
    });
  }
  if (priority === 'anti_glare' && lens.coatingLevel >= 3) {
    hits.push({
      code: 'prio_ar',
      weight: 14,
      reason: 'Антиблик',
      clientReason: 'Практически не бликуют',
    });
  }
  if (priority === 'max_quality') {
    if (lens.coatingLevel >= 4) hits.push({ code: 'quality_coat', weight: 12, reason: 'Премиум покрытие', clientReason: 'Легче очищаются' });
    if (lens.supplier === 'Rodenstock' || lens.supplier === 'Shamir') {
      hits.push({ code: 'quality_brand', weight: 10, reason: 'Сильный бренд', clientReason: 'Максимальное качество' });
    }
    if (lens.aspheric) hits.push({ code: 'quality_asph', weight: 6, reason: 'Асферика' });
  }

  // Coatings / clarity
  if (lens.coatingLevel >= 4) {
    hits.push({
      code: 'easy_clean',
      weight: 6,
      reason: 'Премиум покрытие',
      clientReason: 'Легче очищаются',
    });
  }
  if (lens.aspheric && sph >= 2) {
    hits.push({
      code: 'asph_look',
      weight: 10,
      reason: 'Асферика при заметной коррекции',
      clientReason: 'Лучше выглядят в оправе',
    });
  }

  // Frame
  if (answers.frameType === 'rimless') {
    if (lens.index != null && lens.index >= 1.6) {
      hits.push({ code: 'rimless_index', weight: 12, reason: 'Индекс для безободковой' });
    }
    if (lens.index != null && lens.index < 1.56) {
      hits.push({ code: 'rimless_thick', weight: -20, reason: 'Слишком толстые для безободковой' });
    }
  }

  // Kids
  if (rx.age != null && rx.age < 14) {
    if (lens.kids) hits.push({ code: 'kids_sku', weight: 20, reason: 'Детский SKU' });
    if (lens.type === 'progressive') hits.push({ code: 'kids_prog', weight: -40, reason: 'Прогрессив детям без показаний' });
  }

  // Type family fit
  const family = suggestedLensFamily(purpose, rx);
  const preferIdx = family.prefer.indexOf(lens.type);
  if (preferIdx === 0) hits.push({ code: 'type_best', weight: 20, reason: `Тип ${lens.type} лучший для задачи` });
  else if (preferIdx === 1) hits.push({ code: 'type_ok', weight: 8, reason: `Тип ${lens.type} допустим` });
  else if (preferIdx === -1 && lens.type === 'progressive' && !hasAdd(rx) && (rx.age == null || rx.age < 45)) {
    hits.push({ code: 'prog_unneeded', weight: -28, reason: 'Прогрессив без показаний' });
  }

  // Astigmatism: prefer wider cyl range / RX
  if (cyl >= 2 && lens.stockType === 'rx') {
    hits.push({ code: 'rx_for_cyl', weight: 8, reason: 'Рецептурные при высоком CYL' });
  }

  // Popular mid-market sweet spot
  if (lens.supplier === 'Shamir' && lens.coatingLevel >= 3 && lens.index != null && lens.index >= 1.5 && lens.index <= 1.67) {
    hits.push({
      code: 'popular_choice',
      weight: 5,
      reason: 'Частый выбор салона',
      clientReason: 'Самый популярный выбор',
    });
  }

  return hits;
}

export function hardReject(
  lens: LensSku,
  rx: Prescription,
  answers: Answers,
): string | null {
  const spheres = [rx.od.sph, rx.os.sph].filter((v): v is number => v != null);
  const cyls = [rx.od.cyl, rx.os.cyl].filter((v): v is number => v != null);

  for (const s of spheres) {
    if (lens.sphMin != null && s < lens.sphMin) return 'SPH ниже диапазона';
    if (lens.sphMax != null && s > lens.sphMax) return 'SPH выше диапазона';
  }
  for (const c of cyls) {
    const abs = Math.abs(c);
    if (lens.cylMax != null && abs > Math.abs(lens.cylMax) + 0.01) return 'CYL вне диапазона';
  }

  if (answers.photochromic === 'yes' && !lens.photochromic) return 'Нужен фотохром';
  if (answers.photochromic === 'no' && lens.photochromic) return 'Фотохром не нужен';

  // Polarized plano-only edge case (Shamir polar at 0.00)
  if (lens.polarized && lens.sphMin === 0 && lens.sphMax === 0 && spheres.some((s) => s !== 0)) {
    return 'Поляризация только без диоптрий в этой позиции';
  }

  // Budget hard cut for min_price priority: drop very expensive
  if (answers.priority === 'min_price' && answers.budgetPair != null) {
    if (lens.pricePairMin > answers.budgetPair * 1.05) return 'Выше бюджета';
  } else if (answers.budgetPair != null && lens.pricePairMin > answers.budgetPair * 1.15) {
    // soft room 15%
    return 'Существенно выше бюджета';
  }

  // Kids diameter when age known
  if (rx.age != null && rx.age < 12 && lens.diameter === '75' && !lens.kids) {
    // not hard reject
  }

  return null;
}
