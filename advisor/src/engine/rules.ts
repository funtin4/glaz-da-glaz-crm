import type { Answers, LensSku, Prescription, Purpose } from './types';
import {
  blueFilterOnlyIfAsked,
  budgetIsSoft,
  childAgeLimit,
  photoCarDisclaimer,
} from './ownerConfig';

export const RULESET_VERSION = '2026.07.3-compare';

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
    // Возраст сам по себе не назначает progressive — только ADD / явная нужда
    if (add) {
      return { prefer: ['progressive', 'office', 'bifocal', 'single_vision'], warnProgressive: true };
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

  // Index vs power — owner-config 2026-07-24
  // 1.50–1.56: max recommend ±3.0
  if (sph > 3 && lens.index != null && lens.index <= 1.56) {
    hits.push({
      code: 'index_150_156_over_cap',
      weight: -40,
      reason: '1.50–1.56 выше потолка владельца ±3.0',
      clientReason: 'При ваших диоптриях обычные линзы будут заметно толще — лучше потоньше',
    });
  }
  // 1.60 ok even from ~0 — mild boost as solid default, never penalize as overkill
  if (lens.index != null && lens.index >= 1.59 && lens.index < 1.65) {
    hits.push({
      code: 'index_160_ok',
      weight: sph <= 3 ? 8 : 12,
      reason: '1.60 допустим с любой малой/средней коррекцией',
      clientReason: sph > 3 ? 'Заметно тоньше в оправе' : 'Аккуратный вариант по толщине',
    });
  }
  // 1.67 almost required from ±4…±5
  if (sph >= 4 && lens.index != null && lens.index >= 1.66 && lens.index < 1.72) {
    hits.push({
      code: 'index_167_preferred',
      weight: 28,
      reason: '1.67 почти обязателен от ±4…±5',
      clientReason: 'При таких диоптриях обычно ставят потоньше — так край аккуратнее',
    });
  }
  if (sph >= 4 && lens.index != null && lens.index < 1.66) {
    hits.push({
      code: 'below_167_when_needed',
      weight: -30,
      reason: 'Ниже 1.67 при |SPH|≥4',
      clientReason: 'Есть смысл взять потоньше',
    });
  }
  // 1.74: interim — don't oversell below ±4; ok as premium thin for high Rx
  if (sph < 4 && lens.index != null && lens.index >= 1.74) {
    hits.push({
      code: 'overkill_174',
      weight: -32,
      reason: '1.74 рано при |SPH|<4 (порог владельца ещё уточняется)',
      clientReason: 'Сверхтонкий индекс для вашего рецепта обычно не обязателен',
    });
  }
  if (sph >= 6 && lens.index != null && lens.index >= 1.74) {
    hits.push({
      code: '174_high_rx',
      weight: 14,
      reason: '1.74 уместен на высокой коррекции',
      clientReason: 'Очень тонкие — меньше «линзы-донца»',
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

  // Purpose — computer: AR/comfort first; blue-filter only if asked (owner policy)
  if (purpose === 'computer') {
    if (lens.coatingLevel >= 3 || lens.suitableComputer || lens.office || lens.accommodationSupport) {
      hits.push({
        code: 'computer_fit',
        weight: 14,
        reason: 'Подходит для работы у экрана',
        clientReason: 'Меньше бликов — удобнее у экрана',
      });
    }
    // owner: blue-filter only if client asks (priority=computer), not just purpose=computer
    if (priority === 'computer' && lens.blueFilter) {
      hits.push({
        code: 'blue_on_request',
        weight: 10,
        reason: 'Blue-filter по запросу клиента',
        clientReason: 'Есть фильтр части сине-фиолетового света — комфорт у экрана индивидуален',
      });
    } else if (lens.blueFilter && blueFilterOnlyIfAsked()) {
      hits.push({ code: 'blue_optional', weight: 0, reason: 'Blue-filter без явного запроса' });
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
        reason: 'Обычный фотохром в авто',
        clientReason: photoCarDisclaimer(),
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
  if (priority === 'computer' && (lens.blueFilter || lens.accommodationSupport || lens.coatingLevel >= 3)) {
    hits.push({
      code: 'prio_pc',
      weight: lens.blueFilter ? 12 : 10,
      reason: 'Приоритет экранов',
      clientReason: lens.blueFilter
        ? 'Фильтр части сине-фиолетового света; комфорт индивидуален'
        : 'Меньше бликов у экрана',
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

  // Kids — owner: under 16
  if (rx.age != null && rx.age < childAgeLimit()) {
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

  // Soft budget nudge (owner: soft mode)
  if (budgetIsSoft() && answers.budgetPair != null) {
    if (lens.pricePairMin <= answers.budgetPair) {
      hits.push({ code: 'in_budget', weight: 10, reason: 'Внутри бюджета' });
    } else if (lens.pricePairMin <= answers.budgetPair * 1.2) {
      hits.push({
        code: 'slightly_over_budget',
        weight: -6,
        reason: 'Чуть выше ориентира',
        clientReason: 'Чуть выше вашего ориентира по деньгам',
      });
    } else {
      hits.push({
        code: 'over_budget_soft',
        weight: -18,
        reason: 'Выше бюджета (мягкий режим)',
        clientReason: 'Дороже вашего ориентира — можно обсудить',
      });
    }
  }

  // Popular mid-market sweet spot
  if (lens.supplier === 'Shamir' && lens.coatingLevel >= 3 && lens.index != null && lens.index >= 1.5 && lens.index <= 1.67) {
    hits.push({
      code: 'popular_choice',
      weight: 5,
      reason: 'Частый выбор салона',
      clientReason: 'Так часто ставлю',
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

  // Rodenstock SPH in legacy lenses.json were invented — do not hard-filter on them
  const trustSphRange = lens.supplier !== 'Rodenstock';

  if (trustSphRange) {
    for (const s of spheres) {
      if (lens.sphMin != null && s < lens.sphMin) return 'SPH ниже диапазона';
      if (lens.sphMax != null && s > lens.sphMax) return 'SPH выше диапазона';
    }
  }
  for (const c of cyls) {
    const abs = Math.abs(c);
    if (lens.cylMax != null && abs > Math.abs(lens.cylMax) + 0.01) {
      if (trustSphRange) return 'CYL вне диапазона';
    }
  }

  if (answers.photochromic === 'yes' && !lens.photochromic) return 'Нужен фотохром';
  if (answers.photochromic === 'no' && lens.photochromic) return 'Фотохром не нужен';

  // Polarized plano-only edge case (Shamir polar at 0.00)
  if (lens.polarized && lens.sphMin === 0 && lens.sphMax === 0 && spheres.some((s) => s !== 0)) {
    return 'Поляризация только без диоптрий в этой позиции';
  }

  // Budget: soft mode — never hard-reject on price (owner 2026-07-24)
  if (!budgetIsSoft()) {
    if (answers.priority === 'min_price' && answers.budgetPair != null) {
      if (lens.pricePairMin > answers.budgetPair * 1.05) return 'Выше бюджета';
    } else if (answers.budgetPair != null && lens.pricePairMin > answers.budgetPair * 1.15) {
      return 'Существенно выше бюджета';
    }
  } else if (answers.budgetPair != null && lens.pricePairMin > answers.budgetPair * 1.35) {
    // even soft mode: extreme outliers get soft handled in scoring, not hard reject here
  }

  return null;
}
