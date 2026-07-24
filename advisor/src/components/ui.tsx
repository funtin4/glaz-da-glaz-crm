import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand-mark">
          <div className="logo">Г</div>
          <div>
            <strong>Глаз Да Глаз</strong>
            <span>Цифровой подбор линз</span>
          </div>
        </Link>
        {right ?? (
          <Link className="staff-link" to="/staff">
            Для консультанта
          </Link>
        )}
      </header>
      <main className="main">{children}</main>
      <p className="footer-note">Не каталог — консультация. Цены за пару линз + оценка работы.</p>
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
    { v: 1, title: 'Стандартные', hint: 'Обычная толщина', h: 54 },
    { v: 2, title: 'Тоньше', hint: 'Заметно легче', h: 34 },
    { v: 3, title: 'Максимально тонкие', hint: 'Для высоких диоптрий', h: 18 },
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
