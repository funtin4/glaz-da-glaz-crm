import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/ui';
import { ctaPhoneHref, ctaPhoneLabel } from '../engine/clientCopy';
import { createSession, ensureDemoSession } from '../engine/sessions';

export function HomePage() {
  const nav = useNavigate();

  return (
    <Shell>
      <section className="hero">
        <h1>Вставлю линзы в вашу оправу</h1>
        <p>
          Напишите в Авито «хочу вставить линзы» и пришлите рецепт — пришлю ссылку. Пара вопросов и
          три варианта с понятными брендами. Или сразу звоните:{' '}
          <a href={ctaPhoneHref()} style={{ color: 'inherit', fontWeight: 600 }}>
            {ctaPhoneLabel()}
          </a>
          .
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const s = createSession({ channel: 'avito' });
              nav(`/${s.code}`);
            }}
          >
            Попробовать подбор
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => nav(`/${ensureDemoSession().code}`)}
          >
            Пример с рецептом
          </button>
        </div>
      </section>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>Как это у меня работает</h2>
        <p className="lead">
          Частный мастер + салон в Москве (ул. Декабристов, 21, ежедневно 10:00–20:00). Основной поток —
          Авито.
        </p>
        <div className="options">
          <div className="option" style={{ cursor: 'default' }}>
            Пишете в Авито и кидаете рецепт
            <small>Фото листочка или просто цифры</small>
          </div>
          <div className="option" style={{ cursor: 'default' }}>
            Я присылаю личную ссылку
            <small>Отвечаете на короткие вопросы своим языком</small>
          </div>
          <div className="option" style={{ cursor: 'default' }}>
            Смотрите 3 варианта и пишете «беру»
            <small>Дальше согласуем оправу, срок и цену в чате</small>
          </div>
        </div>
        <div className="nav-row">
          <Link className="staff-link" to="/staff">
            Я мастер — сделать ссылку клиенту →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
