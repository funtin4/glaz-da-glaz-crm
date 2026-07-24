import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/ui';
import { createSession, ensureDemoSession } from '../engine/sessions';

export function HomePage() {
  const nav = useNavigate();

  return (
    <Shell>
      <section className="hero">
        <h1>Вставлю линзы в вашу оправу</h1>
        <p>
          Напишите в Авито «хочу вставить линзы» и пришлите рецепт — я пришлю ссылку. Там без прайсов
          и сложных названий: пару вопросов и три понятных варианта.
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
        <p className="lead">Не магазин и не салон в классическом виде — частный мастер, Курск.</p>
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
