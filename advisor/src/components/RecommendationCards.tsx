import { useState } from 'react';
import type { ScoredLens, Tier } from '../engine/types';
import {
  clientReasons,
  clientTitle,
  ctaAfterChoice,
  ctaPhoneHref,
  ctaPhoneLabel,
  priceLine,
  tierClientLabel,
} from '../engine/clientCopy';

export function RecommendationCards({
  practical,
  optimal,
  premium,
  onChoose,
  chosenTier,
  staffMode = false,
}: {
  practical: ScoredLens | null;
  optimal: ScoredLens | null;
  premium: ScoredLens | null;
  onChoose: (tier: Tier, skuId: string) => void;
  chosenTier: Tier | null;
  staffMode?: boolean;
}) {
  const items: Array<{ tier: Tier; item: ScoredLens | null }> = [
    { tier: 'practical', item: practical },
    { tier: 'optimal', item: optimal },
    { tier: 'premium', item: premium },
  ];

  return (
    <div className="reco-grid three">
      {items.map(({ tier, item }) =>
        item ? (
          <RecoCard
            key={tier}
            tier={tier}
            item={item}
            featured={tier === 'optimal'}
            chosen={chosenTier === tier}
            onChoose={() => onChoose(tier, item.lens.id)}
            staffMode={staffMode}
          />
        ) : null,
      )}
    </div>
  );
}

function RecoCard({
  tier,
  item,
  featured,
  chosen,
  onChoose,
  staffMode,
}: {
  tier: Tier;
  item: ScoredLens;
  featured: boolean;
  chosen: boolean;
  onChoose: () => void;
  staffMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lens = item.lens;
  const price = priceLine(item);
  const reasons = clientReasons(item);

  return (
    <article className={`reco ${featured ? 'optimal' : ''}`}>
      <div className="badge">{tierClientLabel(tier, featured)}</div>
      <h3>{clientTitle(lens)}</h3>
      <div className="price">{price.main}</div>
      <div className="price-note">{price.sub}</div>
      <ul className="reasons">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div style={{ display: 'grid', gap: 8 }}>
        <button type="button" className={`btn ${featured ? 'solid' : 'quiet'} block`} onClick={onChoose}>
          {chosen ? 'Выбрал ✓' : 'Беру этот'}
        </button>
        {chosen ? (
          <div className="price-note" style={{ lineHeight: 1.45 }}>
            {ctaAfterChoice()}{' '}
            <a href={ctaPhoneHref()} style={{ color: 'inherit', fontWeight: 600 }}>
              {ctaPhoneLabel()}
            </a>
          </div>
        ) : null}
        <button type="button" className="btn quiet block" onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Чем отличаются'}
        </button>
      </div>
      {open ? (
        <div className="tech">
          {lens.drawbacks.length ? (
            <div>
              <b>Честно:</b> {lens.drawbacks.map(softenDrawback).join('. ')}
            </div>
          ) : (
            <div>Нормальный вариант, без подводных камней для вашего случая.</div>
          )}
          <div style={{ marginTop: 8 }}>
            <b>Бренд:</b> {lens.supplier}
            {lens.name ? ` · ${lens.name}` : ''}
          </div>
          {staffMode ? (
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              <b>Себе:</b> {lens.index} · {lens.coating} · {formatMoneyPair(item)} · score{' '}
              {Math.round(item.score)}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function softenDrawback(d: string): string {
  if (/толще/i.test(d)) return 'При сильных диоптриях будут заметнее в оправе';
  if (/блик/i.test(d)) return 'Без хорошего покрытия чаще бликуют';
  if (/стекло|тяжел|разобь/i.test(d)) return 'Стекло тяжелее и может разбиться';
  if (/лобов|машин/i.test(d)) return 'В машине темнеют слабее обычных «хамелеонов»';
  return d.replace(/1\.\d{2}|HMC|AR |UV-?\d*/gi, '').trim() || d;
}

function formatMoneyPair(item: ScoredLens): string {
  return `${item.pairPrice}₽/пара`;
}
