import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Shell({
  children,
  right,
  masterMode = true,
}: {
  children: ReactNode;
  right?: ReactNode;
  masterMode?: boolean;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand-mark">
          <div className="logo">Г</div>
          <div>
            <strong>Глаз Да Глаз</strong>
            <span>{masterMode ? 'Вставка линз · Курск' : 'Подбор линз'}</span>
          </div>
        </Link>
        {right ?? (
          <Link className="staff-link" to="/staff">
            Мне (Авито)
          </Link>
        )}
      </header>
      <main className="main">{children}</main>
      <p className="footer-note">Напишите в Авито — вставлю линзы в вашу оправу</p>
    </div>
  );
}

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="progress" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < step ? 'on' : ''} />
      ))}
    </div>
  );
}

export function OptionButton({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`option ${selected ? 'selected' : ''}`} onClick={onClick}>
      {title}
      {subtitle ? <small>{subtitle}</small> : null}
    </button>
  );
}

export function ThicknessVisual({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | null;
  onChange: (v: 1 | 2 | 3) => void;
}) {
  const items: Array<{ v: 1 | 2 | 3; title: string; hint: string; h: number }> = [
    { v: 1, title: 'Обычные', hint: 'Как в простых очках', h: 54 },
    { v: 2, title: 'Потоньше', hint: 'Аккуратнее смотрятся', h: 34 },
    { v: 3, title: 'Очень тонкие', hint: 'Если диоптрии большие', h: 18 },
  ];
  return (
    <div className="thickness">
      {items.map((item) => (
        <button
          key={item.v}
          type="button"
          className={`thick-card ${value === item.v ? 'selected' : ''}`}
          onClick={() => onChange(item.v)}
        >
          <div className="lens-stack">
            <div className="lens-bar" style={{ height: item.h }} />
          </div>
          <div>
            <strong>{item.title}</strong>
            <span>{item.hint}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
