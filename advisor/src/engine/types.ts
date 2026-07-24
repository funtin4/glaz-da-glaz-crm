export type LensType =
  | 'single_vision'
  | 'progressive'
  | 'bifocal'
  | 'office';

export type StockType = 'stock' | 'rx';

export interface LensSku {
  id: string;
  supplier: string;
  name: string;
  subtitle: string;
  displayName: string;
  type: LensType;
  category: string;
  index: number | null;
  coating: string;
  coatingLevel: number;
  pricePerLensMin: number;
  pricePerLensMax: number;
  pricePairMin: number;
  pricePairMax: number;
  sphMin: number | null;
  sphMax: number | null;
  cylMin: number | null;
  cylMax: number | null;
  addMin: number | null;
  addMax: number | null;
  diameter: string | null;
  material: string;
  stockType: StockType;
  photochromic: boolean;
  blueFilter: boolean;
  polarized: boolean;
  aspheric: boolean;
  kids: boolean;
  drive: boolean;
  office: boolean;
  accommodationSupport: boolean;
  tintable: boolean;
  thinness: number;
  comfort: number;
  clarity: number;
  scratchProtection: number;
  suitableDaily: boolean;
  suitableComputer: boolean;
  suitableCar: boolean;
  suitableKids: boolean;
  suitableHighPower: boolean;
  benefits: string[];
  drawbacks: string[];
  source: string;
}

export type Purpose =
  | 'daily'
  | 'distance'
  | 'reading'
  | 'computer'
  | 'car'
  | 'work'
  | 'unknown';

export type Priority =
  | 'min_price'
  | 'thin'
  | 'comfort'
  | 'computer'
  | 'photochromic'
  | 'anti_glare'
  | 'max_quality';

export type ThicknessPref = 1 | 2 | 3;
export type PhotoPref = 'yes' | 'no' | 'unknown';
export type FrameType = 'full_rim' | 'semi_rim' | 'rimless' | 'unknown';

export interface EyeRx {
  sph: number | null;
  cyl: number | null;
  ax: number | null;
  add: number | null;
}

export interface Prescription {
  od: EyeRx;
  os: EyeRx;
  pd: number | null;
  age: number | null;
}

export interface Answers {
  purpose: Purpose | null;
  priority: Priority | null;
  thickness: ThicknessPref | null;
  photochromic: PhotoPref | null;
  budgetPair: number | null | undefined; // undefined = not answered, null = unlimited
  frameType: FrameType;
}

export interface ScoredLens {
  lens: LensSku;
  score: number;
  hardRejected: boolean;
  rejectReasons: string[];
  boostReasons: string[];
  penaltyReasons: string[];
  pairPrice: number;
  pairPriceMax: number;
  laborEstimate: number;
  totalEstimate: number;
  clientReasons: string[];
}

export type Tier = 'practical' | 'optimal' | 'premium';

export interface TierCompareNote {
  tier: Tier;
  hook: string;
  vsOthers: string[];
  moneyStory: string | null;
}

export interface PortfolioCompareNote {
  intro: string;
  byTier: Record<Tier, TierCompareNote>;
}

export interface RecommendationSet {
  practical: ScoredLens | null;
  optimal: ScoredLens | null;
  premium: ScoredLens | null;
  compare: PortfolioCompareNote | null;
  warnings: string[];
  rulesetVersion: string;
  eligibleCount: number;
}

export interface SessionRecord {
  code: string;
  createdAt: string;
  channel: 'web' | 'avito' | 'crm' | 'telegram' | 'staff';
  agentNote: string;
  prescription: Prescription;
  answers: Answers;
  recommendation: RecommendationSet | null;
  chosen: { tier: Tier; skuId: string } | null;
  clientName?: string;
  clientPhone?: string;
}

export const emptyRx = (): Prescription => ({
  od: { sph: null, cyl: null, ax: null, add: null },
  os: { sph: null, cyl: null, ax: null, add: null },
  pd: null,
  age: null,
});

export const emptyAnswers = (): Answers => ({
  purpose: null,
  priority: null,
  thickness: null,
  photochromic: null,
  budgetPair: undefined,
  frameType: 'unknown',
});
