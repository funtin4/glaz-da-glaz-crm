import raw from '../data/owner-config.json';

export type OwnerConfig = typeof raw;

export const ownerConfig = raw as OwnerConfig;

export function childAgeLimit(): number {
  return ownerConfig.safety.child_max_age_exclusive_online_full_auto;
}

export function isChildCase(age: number | null | undefined): boolean {
  return age != null && age < childAgeLimit();
}

export function ctaPhone(): string {
  return ownerConfig.product.cta.phone_display;
}

export function ctaPhoneRaw(): string {
  return ownerConfig.product.cta.phone;
}

export function salonEscalationText(): string {
  return ownerConfig.product.escalation_visit.message_ru;
}

export function photoCarDisclaimer(): string {
  return ownerConfig.product.photochromic_car_darkening_note;
}

export function brandsVisible(): boolean {
  return ownerConfig.product.brands_visible_to_client;
}

export function budgetIsSoft(): boolean {
  return ownerConfig.product.budget_mode === 'soft';
}

export function blueFilterOnlyIfAsked(): boolean {
  return ownerConfig.product.blue_filter_policy === 'only_if_client_asks';
}
