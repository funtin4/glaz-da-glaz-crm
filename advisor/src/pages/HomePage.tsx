import { Link } from 'react-router-dom';
import { Shell } from '../components/ui';
import { createSession, ensureDemoSession } from '../engine/sessions';
import { getCatalogMeta } from '../engine/recommend';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const nav = useNavigate();
  const meta = getCatalogMeta();

  return (
    <Shell>
      <section className="hero">
        <h1>Глаз Да Глаз</h1>
        <p>
          Цифровой консультант подберёт линзы по рецепту — без прайсов и сотен названий. Несколько
          простых вопросов, три понятных варианта.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const s = createSession({ channel: 'web' });
              nav(`/${s.code}`);
            }}
          >
            Подобрать линзы
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const s = ensureDemoSession();
              nav(`/${s.code}`);
            }}
          >
            Демо с рецептом
          </button>
        </div>
      </section>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>Как это работает</h2>
        <p className="lead">
          База: {meta.lensCount} позиций · {meta.suppliers.join(', ')}. Клиент не видит каталог —
          внутри работает экспертная система салона.
        </p>
        <div className="options">
          <div className="option" style={{ cursor: 'default' }}>
            1. Консультант создаёт ссылку с рецептом
            <small>Авито, CRM или Telegram — один движок</small>
          </div>
          <div className="option" style={{ cursor: 'default' }}>
            2. Клиент отвечает на короткие вопросы
            <small>Без индексов и маркетинговых названий</small>
          </div>
          <div className="option" style={{ cursor: 'default' }}>
            3. Три варианта: практичный, оптимальный, премиум
            <small>С человеческими объяснениями и ценой за пару</small>
          </div>
        </div>
        <div className="nav-row">
          <Link className="staff-link" to="/staff">
            Открыть кабинет консультанта →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
