import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RecommendationCards } from '../components/RecommendationCards';
import { OptionButton, Progress, Shell, ThicknessVisual } from '../components/ui';
import { ctaAfterChoice, softenWarning } from '../engine/clientCopy';
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

function buildSteps(answers: Answers, rx: Prescription, fromAvito: boolean): Step[] {
  const steps: Step[] = ['welcome'];
  // Avito: master already has the recipe photo — client never fills OD/SPH
  if (!hasRx(rx) && !fromAvito) steps.push('rx');
  steps.push('purpose', 'priority');
  if (answers.priority !== 'thin') steps.push('thickness');
  if (answers.priority !== 'photochromic') steps.push('photo');
  steps.push('budget', 'results');
  return steps;
}

export function SelectPage() {
  const { code = '' } = useParams();
  const [search] = useSearchParams();
  const staffMode = search.get('me') === '1';
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession(code);
    if (!s) {
      setError('Ссылка устарела. Напишите мне в Авито — пришлю новую.');
      return;
    }
    setSession(s);
    setStepIdx(0);
  }, [code]);

  const fromAvito = session?.channel === 'avito' || session?.channel === 'staff';

  const steps = useMemo(
    () => (session ? buildSteps(session.answers, session.prescription, fromAvito) : ['welcome']),
    [session, fromAvito],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)] as Step;

  function patchAnswers(partial: Partial<Answers>) {
    if (!session) return;
    const answers = { ...session.answers, ...partial };
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

  function goNext() {
    if (!session) return;
    const aboutToResults = steps[stepIdx + 1] === 'results' || step === 'budget';
    if (aboutToResults && step !== 'results') {
      const a = { ...session.answers };
      if (a.thickness == null) a.thickness = recommendedThinness(session.prescription, a.frameType);
      if (a.priority === 'photochromic') a.photochromic = 'yes';
      if (a.photochromic == null) a.photochromic = 'unknown';
      // Avito without rx: still recommend with soft defaults
      saveAnswers(session.code, a);
      const updated = runRecommend(session.code);
      if (updated) {
        setSession(updated);
        setStepIdx(steps.indexOf('results'));
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
          <h2>Ссылка не открылась</h2>
          <p className="lead">{error}</p>
        </div>
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell>
        <div className="panel">
          <p className="lead">Секунду…</p>
        </div>
      </Shell>
    );
  }

  const progressStep = step === 'results' ? steps.length : stepIdx + 1;
  const clientWarnings = (session.recommendation?.warnings ?? [])
    .map(softenWarning)
    .filter((w): w is string => Boolean(w));

  return (
    <Shell right={<span className="staff-link">подбор линз</span>}>
      {step === 'welcome' ? (
        <section className="hero">
          <h1>Давайте подберём линзы</h1>
          <p>
            {hasRx(session.prescription)
              ? 'Рецепт у меня есть. Пара простых вопросов — и покажу три варианта под вас. Без сложных названий.'
              : fromAvito
                ? 'Напишите мне рецепт в Авито, если ещё не отправили. А пока ответьте на пару вопросов — так я быстрее попаду в нужную цену и комфорт.'
                : 'Пара простых вопросов — покажу три понятных варианта. Цифры с рецепта, если есть, можно ввести дальше.'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn primary" onClick={goNext}>
              Поехали
            </button>
          </div>
        </section>
      ) : (
        <div className="panel">
          <Progress step={progressStep} total={steps.length} />

          {step === 'rx' && (
            <RxStep rx={session.prescription} onChange={patchRx} onNext={goNext} onBack={back} />
          )}

          {step === 'purpose' && (
            <>
              <h2>Очки в основном для чего?</h2>
              <p className="lead">Выберите одно главное.</p>
              <div className="options">
                {(
                  [
                    ['daily', 'Ношу почти всегда'],
                    ['distance', 'Смотреть вдаль / на улицу'],
                    ['reading', 'Читать / телефон'],
                    ['computer', 'Компьютер'],
                    ['car', 'За рулём'],
                    ['work', 'На работе'],
                    ['unknown', 'Пока не знаю'],
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
              <div style={{ marginTop: 16 }}>
                <p className="lead" style={{ marginBottom: 8 }}>
                  Оправа какая?
                </p>
                <div className="options">
                  {(
                    [
                      ['full_rim', 'Обычная, с ободком'],
                      ['semi_rim', 'На леске / полуободок'],
                      ['rimless', 'На винтиках, без ободка'],
                      ['unknown', 'Пока без оправы / не знаю'],
                    ] as Array<[FrameType, string]>
                  ).map(([id, label]) => (
                    <OptionButton
                      key={id}
                      title={label}
                      selected={session.answers.frameType === id}
                      onClick={() => patchAnswers({ frameType: id })}
                    />
                  ))}
                </div>
              </div>
              <Nav onBack={back} onNext={goNext} disabled={!session.answers.purpose} />
            </>
          )}

          {step === 'priority' && (
            <>
              <h2>Что важнее?</h2>
              <p className="lead">Одно главное — остальное учту сам.</p>
              <div className="options">
                {(
                  [
                    ['min_price', 'Чтобы недорого'],
                    ['thin', 'Чтобы не толстые'],
                    ['comfort', 'Чтобы было комфортно'],
                    ['computer', 'Чтобы глаза меньше уставали у экрана'],
                    ['photochromic', 'Чтобы темнели на солнце'],
                    ['anti_glare', 'Чтобы не бликовали'],
                    ['max_quality', 'Хочу получше, готов доплатить'],
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
              <Nav onBack={back} onNext={goNext} disabled={!session.answers.priority} />
            </>
          )}

          {step === 'thickness' && (
            <>
              <h2>Линзы потоньше нужны?</h2>
              <p className="lead">Так понятнее, чем цифры с упаковки.</p>
              <ThicknessVisual
                value={session.answers.thickness}
                onChange={(thickness: ThicknessPref) => patchAnswers({ thickness })}
              />
              <Nav onBack={back} onNext={goNext} disabled={!session.answers.thickness} />
            </>
          )}

          {step === 'photo' && (
            <>
              <h2>Чтобы на улице сами темнели?</h2>
              <p className="lead">Как очки-хамелеон. Если не уверены — «Не знаю».</p>
              <div className="options">
                {(
                  [
                    ['yes', 'Да, хочу'],
                    ['no', 'Нет, обычные светлые'],
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
              <Nav onBack={back} onNext={goNext} disabled={!session.answers.photochromic} />
            </>
          )}

          {step === 'budget' && (
            <>
              <h2>На линзы примерно сколько?</h2>
              <p className="lead">
                Ориентир, не жёсткий потолок. Только линзы — за вставку скажу отдельно (обычно
                800–2000 ₽).
              </p>
              <div className="options">
                {[
                  [8000, 'До 8 тысяч'],
                  [15000, 'До 15 тысяч'],
                  [25000, 'До 25 тысяч'],
                  [40000, 'До 40 тысяч'],
                  [null, 'Как скажете, лишь бы хорошо'],
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
                onNext={goNext}
                nextLabel="Показать варианты"
                disabled={session.answers.budgetPair === undefined}
              />
            </>
          )}

          {step === 'results' && session.recommendation && (
            <>
              <h2>Вот что я бы поставил</h2>
              <p className="lead">
                Три варианта. Средний — как я обычно ставлю. Бренды названы открыто.
              </p>
              {session.chosen ? <div className="success">{ctaAfterChoice()}</div> : null}
              {clientWarnings.length ? (
                <div className="warns">
                  {clientWarnings.map((w) => (
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
                staffMode={staffMode}
              />
              <div className="nav-row">
                <button type="button" className="btn quiet" onClick={back}>
                  Назад
                </button>
                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => setStepIdx(steps.indexOf('purpose'))}
                >
                  Заново
                </button>
              </div>
              {staffMode ? (
                <p className="lead" style={{ marginTop: 12 }}>
                  Режим мастера · код {session.code} · подходящих в базе{' '}
                  {session.recommendation.eligibleCount}
                </p>
              ) : null}
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
  nextLabel = 'Дальше',
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
      <h2>Цифры с рецепта</h2>
      <p className="lead">
        Если рецепт уже отправили в Авито — можно пропустить и написать мне. Иначе сфотографируйте
        листочек и перепишите верхние числа.
      </p>
      <div className="rx-grid">
        <div className="eye-label">Правый глаз</div>
        <Field label="Сфера" value={rx.od.sph} onChange={(v) => setEye('od', 'sph', v)} />
        <Field label="Цилиндр" value={rx.od.cyl} onChange={(v) => setEye('od', 'cyl', v)} />
        <Field label="Ось" value={rx.od.ax} onChange={(v) => setEye('od', 'ax', v)} />
        <Field label="Для чтения" value={rx.od.add} onChange={(v) => setEye('od', 'add', v)} />
        <div className="eye-label">Левый глаз</div>
        <Field label="Сфера" value={rx.os.sph} onChange={(v) => setEye('os', 'sph', v)} />
        <Field label="Цилиндр" value={rx.os.cyl} onChange={(v) => setEye('os', 'cyl', v)} />
        <Field label="Ось" value={rx.os.ax} onChange={(v) => setEye('os', 'ax', v)} />
        <Field label="Для чтения" value={rx.os.add} onChange={(v) => setEye('os', 'add', v)} />
        <Field
          label="Возраст"
          value={rx.age}
          onChange={(v) =>
            onChange({ ...rx, age: v.trim() === '' ? null : Number(v.replace(',', '.')) })
          }
        />
      </div>
      <div className="nav-row">
        <button type="button" className="btn quiet" onClick={onBack}>
          Назад
        </button>
        <button type="button" className="btn quiet" onClick={onNext}>
          Пропустить
        </button>
        <button
          type="button"
          className="btn solid"
          onClick={onNext}
          disabled={rx.od.sph == null && rx.os.sph == null}
        >
          Дальше
        </button>
      </div>
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
