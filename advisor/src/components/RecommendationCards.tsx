import { useState } from 'react';
import type { ScoredLens, Tier } from '../engine/types';
import { formatMoney, tierLabel } from '../engine/recommend';

export function RecommendationCards({
  practical,
  optimal,
  premium,
  onChoose,
  chosenTier,
  staffMode,
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
  staffMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lens = item.lens;
  const price =
    item.pairPrice === item.pairPriceMax
      ? formatMoney(item.pairPrice)
      : `${formatMoney(item.pairPrice)} – ${formatMoney(item.pairPriceMax)}`;

  return (
    <article className={`reco ${featured ? 'optimal' : ''}`}>
      <div className="badge">
        {featured ? 'Рекомендуем' : tierLabel(tier)}
      </div>
      <h3>{lens.displayName}</h3>
      <div className="price">{price}</div>
      <div className="price-note">
        пара линз · работа ≈ {formatMoney(item.laborEstimate)} · итого от{' '}
        {formatMoney(item.totalEstimate)}
      </div>
      <ul className="reasons">
        {item.clientReasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div style={{ display: 'grid', gap: 8 }}>
        <button type="button" className={`btn ${featured ? 'solid' : 'quiet'} block`} onClick={onChoose}>
          {chosen ? 'Выбрано ✓' : 'Хочу этот вариант'}
        </button>
        <button type="button" className="btn quiet block" onClick={() => setOpen((v) => !v)}>
          {open ? 'Скрыть подробности' : 'Подробнее'}
        </button>
      </div>
      {open ? (
        <div className="tech">
          <div>
            <b>Для мастера:</b> {lens.supplier} · {lens.name}
          </div>
          <div>
            Индекс {lens.index ?? '—'} · {lens.coating} · {lens.stockType === 'rx' ? 'рецепт' : 'склад'}
          </div>
          <div>
            SPH {lens.sphMin ?? '—'}…{lens.sphMax ?? '—'}
            {lens.cylMax != null ? ` · CYL до ${Math.abs(lens.cylMax)}` : ''}
            {lens.diameter ? ` · Ø ${lens.diameter}` : ''}
          </div>
          {(staffMode || true) && item.boostReasons.length ? (
            <div style={{ marginTop: 8 }}>
              <b>Почему сработало:</b> {item.boostReasons.slice(0, 4).join('; ')}
            </div>
          ) : null}
          {lens.drawbacks.length ? (
            <div style={{ marginTop: 6 }}>
              <b>Учесть:</b> {lens.drawbacks.join('; ')}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
