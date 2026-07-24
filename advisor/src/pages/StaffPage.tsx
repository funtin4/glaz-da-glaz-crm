import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/ui';
import { createSession, listSessions } from '../engine/sessions';
import type { Prescription } from '../engine/types';
import { emptyRx } from '../engine/types';

export function StaffPage() {
  const [rx, setRx] = useState<Prescription>(emptyRx());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [budget, setBudget] = useState<number | null>(15000);
  const [created, setCreated] = useState<string | null>(null);
  const sessions = useMemo(() => listSessions().slice(0, 12), [created]);

  function setEye(eye: 'od' | 'os', field: 'sph' | 'cyl' | 'ax' | 'add', raw: string) {
    const num = raw.trim() === '' ? null : Number(String(raw).replace(',', '.'));
    setRx({
      ...rx,
      [eye]: { ...rx[eye], [field]: Number.isFinite(num as number) ? num : null },
    });
  }

  function create() {
    const s = createSession({
      prescription: rx,
      channel: 'avito',
      agentNote: note,
      clientName: name,
      clientPhone: phone,
      budgetPair: budget,
    });
    setCreated(s.code);
  }

  const link =
    created != null
      ? `${window.location.origin}${import.meta.env.BASE_URL}${created}`
      : '';

  return (
    <Shell>
      <div className="panel">
        <h2>Кабинет консультанта</h2>
        <p className="lead">
          Создайте ссылку за 20 секунд и отправьте клиенту в Авито. Рецепт уже будет внутри сессии.
        </p>

        <div className="rx-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Клиент</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Телефон</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8…" />
          </div>

          <div className="eye-label">OD</div>
          <Num label="SPH" value={rx.od.sph} onChange={(v) => setEye('od', 'sph', v)} />
          <Num label="CYL" value={rx.od.cyl} onChange={(v) => setEye('od', 'cyl', v)} />
          <Num label="AX" value={rx.od.ax} onChange={(v) => setEye('od', 'ax', v)} />
          <Num label="ADD" value={rx.od.add} onChange={(v) => setEye('od', 'add', v)} />
          <div className="eye-label">OS</div>
          <Num label="SPH" value={rx.os.sph} onChange={(v) => setEye('os', 'sph', v)} />
          <Num label="CYL" value={rx.os.cyl} onChange={(v) => setEye('os', 'cyl', v)} />
          <Num label="AX" value={rx.os.ax} onChange={(v) => setEye('os', 'ax', v)} />
          <Num label="ADD" value={rx.os.add} onChange={(v) => setEye('os', 'add', v)} />
          <Num
            label="PD"
            value={rx.pd}
            onChange={(v) => setRx({ ...rx, pd: v.trim() === '' ? null : Number(v) })}
          />
          <Num
            label="Возраст"
            value={rx.age}
            onChange={(v) => setRx({ ...rx, age: v.trim() === '' ? null : Number(v) })}
          />
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label>Бюджет пары (префилл)</label>
          <select
            value={budget ?? ''}
            onChange={(e) => setBudget(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="8000">До 8 000</option>
            <option value="15000">До 15 000</option>
            <option value="25000">До 25 000</option>
            <option value="40000">До 40 000</option>
            <option value="">Без ограничений</option>
          </select>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Заметка агента</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Напр.: хочет хамелеон, оправа своя ободковая"
          />
        </div>

        <div className="nav-row">
          <Link to="/" className="btn quiet" style={{ textDecoration: 'none' }}>
            На сайт
          </Link>
          <button type="button" className="btn solid" onClick={create}>
            Создать ссылку
          </button>
        </div>

        {created ? (
          <div className="success" style={{ marginTop: 16 }}>
            Ссылка:{' '}
            <a href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn quiet"
                onClick={() => navigator.clipboard.writeText(link)}
              >
                Скопировать
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Последние сессии</h2>
        <p className="lead">Хранятся локально в браузере (MVP). В проде — CRM API.</p>
        <div className="options">
          {sessions.length === 0 ? (
            <div className="option" style={{ cursor: 'default' }}>
              Пока пусто
            </div>
          ) : (
            sessions.map((s) => (
              <Link
                key={s.code}
                to={`/${s.code}`}
                className="option"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="code-pill">{s.code}</span> {s.clientName || 'Без имени'} ·{' '}
                {s.channel}
                <small>
                  {new Date(s.createdAt).toLocaleString('ru-RU')}
                  {s.chosen ? ` · выбран ${s.chosen.tier}` : ''}
                  {s.recommendation ? ` · ${s.recommendation.eligibleCount} eligible` : ''}
                </small>
              </Link>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="—" />
    </div>
  );
}
