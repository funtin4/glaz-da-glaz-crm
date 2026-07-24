import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RecommendationCards } from '../components/RecommendationCards';
import { OptionButton, Progress, Shell, ThicknessVisual } from '../components/ui';
import { recommendedThinness } from '../engine/rules';
import {
  chooseTier,
  getSession,
  runRecommend,
  saveAnswers,
  savePrescription,
} from '../engine/sessions';
import type {
  Answers,
  FrameType,
  PhotoPref,
  Prescription,
  Priority,
  Purpose,
  SessionRecord,
  ThicknessPref,
  Tier,
} from '../engine/types';

type Step =
  | 'welcome'
  | 'rx'
  | 'purpose'
  | 'priority'
  | 'thickness'
  | 'photo'
  | 'budget'
  | 'results';

function hasRx(rx: Prescription): boolean {
  return rx.od.sph != null || rx.os.sph != null;
}

function buildSteps(answers: Answers, rx: Prescription): Step[] {
  const steps: Step[] = ['welcome'];
  if (!hasRx(rx)) steps.push('rx');
  steps.push('purpose', 'priority');

  const skipThickness =
    answers.priority === 'thin' ||
    (hasRx(rx) && recommendedThinness(rx, answers.frameType) >= 3 && answers.priority === 'min_price');
  // Always ask thickness unless priority already = thin (we auto-set)
  if (answers.priority !== 'thin') steps.push('thickness');
  else {
    // auto
  }

  const skipPhoto =
    answers.priority === 'photochromic' ||
    answers.purpose === 'car'; // still ask for car? Better ask - drive photo vs clear
  // For car we still ask photo; for priority photochromic we auto yes
  if (answers.priority !== 'photochromic') steps.push('photo');

  steps.push('budget', 'results');
  void skipThickness;
  void skipPhoto;
  return steps;
}

export function SelectPage() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession(code);
    if (!s) {
      setError('Сессия не найдена. Попросите консультанта прислать новую ссылку.');
      return;
    }
    setSession(s);
    setStepIdx(0);
  }, [code]);

  const steps = useMemo(
    () => (session ? buildSteps(session.answers, session.prescription) : ['welcome']),
    [session],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)] as Step;

  function patchAnswers(partial: Partial<Answers>) {
    if (!session) return;
    const answers = { ...session.answers, ...partial };
    // adaptive autoset
    if (partial.priority === 'thin' && answers.thickness == null) answers.thickness = 3;
    if (partial.priority === 'photochromic') answers.photochromic = 'yes';
    const next = saveAnswers(session.code, answers);
    if (next) setSession({ ...next });
  }

  function patchRx(prescription: Prescription) {
    if (!session) return;
    const next = savePrescription(session.code, prescription);
    if (next) setSession({ ...next });
  }

  function next() {
    if (!session) return;
    if (step === 'budget' || (step !== 'results' && steps[stepIdx + 1] === 'results')) {
      // ensure thickness default from optics
      const a = { ...session.answers };
      if (a.thickness == null) a.thickness = recommendedThinness(session.prescription, a.frameType);
      if (a.priority === 'photochromic') a.photochromic = 'yes';
      if (a.photochromic == null) a.photochromic = 'unknown';
      saveAnswers(session.code, a);
      const updated = runRecommend(session.code);
      if (updated) {
        setSession(updated);
        setStepIdx(steps.indexOf('results') >= 0 ? steps.indexOf('results') : stepIdx + 1);
        return;
      }
    }
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setStepIdx((i) => Math.max(0, i - 1));
  }

  function onChoose(tier: Tier, skuId: string) {
    if (!session) return;
    const nextS = chooseTier(session.code, tier, skuId);
    if (nextS) setSession(nextS);
  }

  if (error) {
    return (
      <Shell>
        <div className="panel">
          <h2>Ссылка недействительна</h2>
          <p className="lead">{error}</p>
          <Link className="btn solid" to="/staff" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Создать новую сессию
          </Link>
        </div>
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell>
        <div className="panel">
          <p className="lead">Загрузка…</p>
        </div>
      </Shell>
    );
  }

  const progressStep = step === 'results' ? steps.length : stepIdx + 1;
  const progressTotal = steps.length;

  return (
    <Shell
      right={
        <span className="staff-link">
          сессия <span className="code-pill">{session.code}</span>
        </span>
      }
    >
      {step === 'welcome' ? (
        <section className="hero">
          <h1>Глаз Да Глаз</h1>
          <p>
            {hasRx(session.prescription)
              ? 'Мы уже получили ваш рецепт. Осталось несколько коротких вопросов — и покажем лучшие варианты.'
              : 'Ответьте на несколько простых вопросов. Каталог из сотен линз останется за кулисами.'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn primary" onClick={next}>
              Начать подбор
            </button>
          </div>
        </section>
      ) : (
        <div className="panel">
          <Progress step={progressStep} total={progressTotal} />

          {step === 'rx' && (
            <RxStep
              rx={session.prescription}
              onChange={patchRx}
              onNext={next}
              onBack={back}
            />
          )}

          {step === 'purpose' && (
            <>
              <h2>Для чего нужны очки?</h2>
              <p className="lead">Выберите главный сценарий — от этого зависит тип линз.</p>
              <div className="options">
                {(
                  [
                    ['daily', 'Постоянное ношение'],
                    ['distance', 'Только для дали'],
                    ['reading', 'Для чтения'],
                    ['computer', 'Для компьютера'],
                    ['car', 'Для автомобиля'],
                    ['work', 'Для работы'],
                    ['unknown', 'Не знаю'],
                  ] as Array<[Purpose, string]>
                ).map(([id, label]) => (
                  <OptionButton
                    key={id}
                    title={label}
                    selected={session.answers.purpose === id}
                    onClick={() => patchAnswers({ purpose: id })}
                  />
                ))}
              </div>
              <FrameRow
                value={session.answers.frameType}
                onChange={(frameType) => patchAnswers({ frameType })}
              />
              <Nav onBack={back} onNext={next} disabled={!session.answers.purpose} />
            </>
          )}

          {step === 'priority' && (
            <>
              <h2>Что важнее всего?</h2>
              <p className="lead">Один приоритет. Остальное эксперт учтёт сам.</p>
              <div className="options">
                {(
                  [
                    ['min_price', 'Минимальная цена'],
                    ['thin', 'Тонкие линзы'],
                    ['comfort', 'Максимальный комфорт'],
                    ['computer', 'Защита от компьютера'],
                    ['photochromic', 'Затемнение на солнце'],
                    ['anti_glare', 'Минимум бликов'],
                    ['max_quality', 'Максимальное качество'],
                  ] as Array<[Priority, string]>
                ).map(([id, label]) => (
                  <OptionButton
                    key={id}
                    title={label}
                    selected={session.answers.priority === id}
                    onClick={() => patchAnswers({ priority: id })}
                  />
                ))}
              </div>
              <Nav onBack={back} onNext={next} disabled={!session.answers.priority} />
            </>
          )}

          {step === 'thickness' && (
            <>
              <h2>Насколько важна тонкость?</h2>
              <p className="lead">Без цифр и индексов — просто как хотите видеть линзы в оправе.</p>
              <ThicknessVisual
                value={session.answers.thickness}
                onChange={(thickness: ThicknessPref) => patchAnswers({ thickness })}
              />
              <Nav onBack={back} onNext={next} disabled={!session.answers.thickness} />
            </>
          )}

          {step === 'photo' && (
            <>
              <h2>Хотите, чтобы линзы темнели на солнце?</h2>
              <p className="lead">Если не уверены — выберите «Не знаю», подберём с запасом вариантов.</p>
              <div className="options">
                {(
                  [
                    ['yes', 'Да'],
                    ['no', 'Нет'],
                    ['unknown', 'Не знаю'],
                  ] as Array<[PhotoPref, string]>
                ).map(([id, label]) => (
                  <OptionButton
                    key={id}
                    title={label}
                    selected={session.answers.photochromic === id}
                    onClick={() => patchAnswers({ photochromic: id })}
                  />
                ))}
              </div>
              <Nav onBack={back} onNext={next} disabled={!session.answers.photochromic} />
            </>
          )}

          {step === 'budget' && (
            <>
              <h2>Ориентировочный бюджет</h2>
              <p className="lead">За пару линз. Работу по оправе посчитаем отдельно.</p>
              <div className="options">
                {[
                  [8000, 'До 8 000 ₽'],
                  [15000, 'До 15 000 ₽'],
                  [25000, 'До 25 000 ₽'],
                  [40000, 'До 40 000 ₽'],
                  [null, 'Без ограничений'],
                ].map(([val, label]) => (
                  <OptionButton
                    key={String(label)}
                    title={label as string}
                    selected={session.answers.budgetPair === val}
                    onClick={() => patchAnswers({ budgetPair: val as number | null })}
                  />
                ))}
              </div>
              <Nav
                onBack={back}
                onNext={next}
                nextLabel="Показать варианты"
                disabled={session.answers.budgetPair === undefined}
              />
            </>
          )}

          {step === 'results' && session.recommendation && (
            <>
              <h2>Ваши варианты</h2>
              <p className="lead">
                Из {session.recommendation.eligibleCount} подходящих позиций эксперт оставил три.
                Технические названия — только в «Подробнее».
              </p>
              {session.chosen ? (
                <div className="success">
                  Выбор сохранён. Консультант салона увидит вариант в сессии {session.code}. Можно
                  написать нам в Авито или приехать на Косухина 37А.
                </div>
              ) : null}
              {session.recommendation.warnings.length ? (
                <div className="warns">
                  {session.recommendation.warnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              ) : null}
              <RecommendationCards
                practical={session.recommendation.practical}
                optimal={session.recommendation.optimal}
                premium={session.recommendation.premium}
                onChoose={onChoose}
                chosenTier={session.chosen?.tier ?? null}
              />
              <div className="nav-row">
                <button type="button" className="btn quiet" onClick={back}>
                  Назад
                </button>
                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => {
                    setStepIdx(hasRx(session.prescription) ? 1 : 1);
                    nav(`/${session.code}`);
                    setStepIdx(steps.indexOf('purpose'));
                  }}
                >
                  Пройти заново
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Shell>
  );
}

function Nav({
  onBack,
  onNext,
  disabled,
  nextLabel = 'Далее',
}: {
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="nav-row">
      <button type="button" className="btn quiet" onClick={onBack}>
        Назад
      </button>
      <button type="button" className="btn solid" onClick={onNext} disabled={disabled}>
        {nextLabel}
      </button>
    </div>
  );
}

function FrameRow({
  value,
  onChange,
}: {
  value: FrameType;
  onChange: (v: FrameType) => void;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <p className="lead" style={{ marginBottom: 8 }}>
        Какая оправа? (влияет на толщину)
      </p>
      <div className="options">
        {(
          [
            ['full_rim', 'Ободковая'],
            ['semi_rim', 'Полуободковая'],
            ['rimless', 'Безободковая'],
            ['unknown', 'Пока не знаю'],
          ] as Array<[FrameType, string]>
        ).map(([id, label]) => (
          <OptionButton key={id} title={label} selected={value === id} onClick={() => onChange(id)} />
        ))}
      </div>
    </div>
  );
}

function RxStep({
  rx,
  onChange,
  onNext,
  onBack,
}: {
  rx: Prescription;
  onChange: (rx: Prescription) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function setEye(eye: 'od' | 'os', field: 'sph' | 'cyl' | 'ax' | 'add', raw: string) {
    const num = raw.trim() === '' ? null : Number(String(raw).replace(',', '.'));
    onChange({
      ...rx,
      [eye]: { ...rx[eye], [field]: Number.isFinite(num as number) ? num : null },
    });
  }

  return (
    <>
      <h2>Ваш рецепт</h2>
      <p className="lead">Можно заполнить приблизительно — консультант уточнит в салоне.</p>
      <div className="rx-grid">
        <div className="eye-label">Правый глаз (OD)</div>
        <Field label="SPH" value={rx.od.sph} onChange={(v) => setEye('od', 'sph', v)} />
        <Field label="CYL" value={rx.od.cyl} onChange={(v) => setEye('od', 'cyl', v)} />
        <Field label="AX" value={rx.od.ax} onChange={(v) => setEye('od', 'ax', v)} />
        <Field label="ADD" value={rx.od.add} onChange={(v) => setEye('od', 'add', v)} />
        <div className="eye-label">Левый глаз (OS)</div>
        <Field label="SPH" value={rx.os.sph} onChange={(v) => setEye('os', 'sph', v)} />
        <Field label="CYL" value={rx.os.cyl} onChange={(v) => setEye('os', 'cyl', v)} />
        <Field label="AX" value={rx.os.ax} onChange={(v) => setEye('os', 'ax', v)} />
        <Field label="ADD" value={rx.os.add} onChange={(v) => setEye('os', 'add', v)} />
        <Field
          label="PD"
          value={rx.pd}
          onChange={(v) =>
            onChange({ ...rx, pd: v.trim() === '' ? null : Number(v.replace(',', '.')) })
          }
        />
        <Field
          label="Возраст"
          value={rx.age}
          onChange={(v) =>
            onChange({ ...rx, age: v.trim() === '' ? null : Number(v.replace(',', '.')) })
          }
        />
      </div>
      <Nav onBack={onBack} onNext={onNext} disabled={rx.od.sph == null && rx.os.sph == null} />
    </>
  );
}

function Field({
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
      <input
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}
