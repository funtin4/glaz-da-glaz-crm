import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/ui';
import { createSession, listSessions } from '../engine/sessions';
import type { Prescription } from '../engine/types';
import { emptyRx } from '../engine/types';

export function StaffPage() {
  const [rx, setRx] = useState<Prescription>(emptyRx());
  const [name, setName] = useState('');
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
      budgetPair: budget,
    });
    setCreated(s.code);
  }

  const link =
    created != null
      ? `${window.location.origin}${import.meta.env.BASE_URL}${created}`
      : '';

  const staffLink = link ? `${link}?me=1` : '';

  return (
    <Shell>
      <div className="panel">
        <h2>Ссылка для Авито</h2>
        <p className="lead">
          Вбили рецепт с фото клиента → скопировали ссылку в чат. Клиент видит бренды и 3 варианта
          простым языком (без индексов и кодов покрытий).
        </p>

        <div className="rx-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Как в Авито зовут</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Заметка себе</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="своя оправа, хочет хамелеон…"
            />
          </div>

          <div className="eye-label">Правый (OD)</div>
          <Num label="SPH" value={rx.od.sph} onChange={(v) => setEye('od', 'sph', v)} />
          <Num label="CYL" value={rx.od.cyl} onChange={(v) => setEye('od', 'cyl', v)} />
          <Num label="AX" value={rx.od.ax} onChange={(v) => setEye('od', 'ax', v)} />
          <Num label="ADD" value={rx.od.add} onChange={(v) => setEye('od', 'add', v)} />
          <div className="eye-label">Левый (OS)</div>
          <Num label="SPH" value={rx.os.sph} onChange={(v) => setEye('os', 'sph', v)} />
          <Num label="CYL" value={rx.os.cyl} onChange={(v) => setEye('os', 'cyl', v)} />
          <Num label="AX" value={rx.os.ax} onChange={(v) => setEye('os', 'ax', v)} />
          <Num label="ADD" value={rx.os.add} onChange={(v) => setEye('os', 'add', v)} />
          <Num
            label="Возраст"
            value={rx.age}
            onChange={(v) => setRx({ ...rx, age: v.trim() === '' ? null : Number(v) })}
          />
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label>Бюджет, который обсуждали</label>
          <select
            value={budget ?? ''}
            onChange={(e) => setBudget(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="8000">До 8 тыс</option>
            <option value="15000">До 15 тыс</option>
            <option value="25000">До 25 тыс</option>
            <option value="40000">До 40 тыс</option>
            <option value="">Без потолка</option>
          </select>
        </div>

        <div className="nav-row">
          <Link to="/" className="btn quiet" style={{ textDecoration: 'none' }}>
            На главную
          </Link>
          <button type="button" className="btn solid" onClick={create}>
            Сделать ссылку
          </button>
        </div>

        {created ? (
          <div className="success" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>Клиенту в Авито:</div>
            <a href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn quiet" onClick={() => navigator.clipboard.writeText(link)}>
                Копировать
              </button>
              <button
                type="button"
                className="btn quiet"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `По ссылке ответьте на пару вопросов — покажу 3 варианта с брендами. Можно и по телефону 8 919 270-61-64:\n${link}`,
                  )
                }
              >
                Текст для Авито
              </button>
              <a className="btn quiet" href={staffLink} style={{ textDecoration: 'none' }}>
                Открыть как я (?me=1)
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Последние ссылки</h2>
        <p className="lead">Пока в этом телефоне/браузере. Потом уедет в CRM.</p>
        <div className="options">
          {sessions.length === 0 ? (
            <div className="option" style={{ cursor: 'default' }}>
              Пока пусто
            </div>
          ) : (
            sessions.map((s) => (
              <Link
                key={s.code}
                to={`/${s.code}?me=1`}
                className="option"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="code-pill">{s.code}</span> {s.clientName || 'без имени'}
                <small>
                  {new Date(s.createdAt).toLocaleString('ru-RU')}
                  {s.chosen ? ` · выбрал ${s.chosen.tier}` : ''}
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
