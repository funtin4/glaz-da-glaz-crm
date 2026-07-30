# Архитектура: Lens Path (Цифровой оптик)

Масштаб цели: 20 поставщиков · 100 000 клиентов · тысячи подборов/день.

---

## 1. Принцип

```
Channels          Orchestration         Intelligence           Data
─────────         ─────────────         ────────────           ────
glaz.online  ─┐
CRM          ─┼─► Session Service ─► Expert Engine ─► Lens Knowledge Graph
Avito link   ─┤                      Ranking + Rules     Price Imports
Telegram     ─┤                      Explainability      Prescriptions
Voice AI     ─┘                      (future LLM wrap)   Outcomes / orders
```

**Один движок — много каналов.** UI не содержит бизнес-логики подбора.

---

## 2. База данных (целевая, PostgreSQL)

### Ядро каталога
| Таблица | Назначение |
|--------|------------|
| `suppliers` | Поставщик, валюта, lead time |
| `price_lists` | Версия прайса, effective_from, source_file |
| `lens_skus` | Нормализованная линза (все поля сущности) |
| `lens_attributes` | EAV/JSON для редких свойств без миграций каждую неделю |
| `services` | Работа, тонировка, призма |
| `markup_rules` | Наценка салона / пакет «пара + работа» |

### Консультации
| Таблица | Назначение |
|--------|------------|
| `clients` | Связь с CRM client_id |
| `prescriptions` | OD/OS SPH CYL AX ADD PD, source (manual/ocr/crm) |
| `sessions` | Код `XXXX`, статус, канал, агент, бюджет |
| `session_answers` | Ответы адаптивного дерева |
| `recommendations` | Top-3 snapshot + scores + explanations |
| `outcomes` | Выбранный SKU → order_id CRM |

### Масштабирование
- Партиции `sessions` / `recommendations` по месяцу
- Read-replica для публичного `/select`
- Redis: session cache + rate limit ссылок
- Object storage: фото рецептов/оправ
- Не хранить «прайс HTML» как runtime source — только audit trail

### MVP сейчас
Статический `lenses.json` + localStorage sessions. Схема выше — контракт роста; код движка уже оперирует сущностями 1:1 с будущими таблицами.

---

## 3. Экспертная система

Не фильтр. Конвейер:

1. **Hard constraints** — отсев невозможного (SPH вне диапазона, тип линзы ≠ задаче, фотохром = нет).
2. **Safety / optics rules** — клинический здравый смысл (см. `rules.ts`).
3. **Preference scoring** — веса под ответы и рецепт.
4. **Portfolio construction** — 1 practical + 1 optimal + 1 premium с diversity (не три почти одинаковых SKU).
5. **Explanation** — человеческие причины на карточке.

Версии правил: `RULESET_VERSION`. A/B и откат без редеплоя UI.

---

## 4. Алгоритм рекомендаций (кратко)

```
eligible = hardFilter(catalog, rx, answers)
scored = eligible.map(sku => score(sku, rx, answers, rules))
buckets = {
  practical: best under budget*0.7 or cheapest good-enough,
  optimal:   best overall score in mid band,
  premium:   best comfort/quality above optimal
}
ensureDiverse(buckets) // разные индексы/фичи
return attachExplanations(buckets)
```

Ключевые правила (неполный список — в коде больше):

- |SPH| < 2.0 → штраф за 1.74 (оверселл)
- |SPH| ≥ 6.0 → штраф за 1.50 / толстые
- age≥45 или ADD>0 → поднять office/progressive check
- purpose=computer → blue filter / office / accommodation boost
- purpose=car → drive photo / polar boost; обычный фотохром — предупреждение про лобовое
- priority=min_price → резать premium band
- rimless → prefer higher index + aspheric
- kids → diameter/kids SKU, avoid progressive unless indicated

---

## 5. UX экранов

1. **Landing сессии** — бренд, «подобрали путь по вашему рецепту», CTA «Начать».
2. **Рецепт** — если пусто: простой ввод OD/OS; если префилл: подтверждение.
3. **Адаптивные вопросы** — 2–4 шага, визуал толщины без цифр индекса.
4. **Результаты** — hero «Рекомендуем» + 2 альтернативы; «Подробнее» = техслой.
5. **CTA** — «Хочу этот вариант» → статус session=chosen.
6. **Staff create** — `/staff` быстрый мастер ссылки для Авито.

---

## 6. API (контракт)

```
POST /api/v1/sessions              { prescription, budget, channel, agentNote }
GET  /api/v1/sessions/:code
PATCH /api/v1/sessions/:code/answers
POST /api/v1/sessions/:code/recommend
POST /api/v1/sessions/:code/choose { skuId, tier }
POST /api/v1/imports/price-lists   multipart HTML/CSV
GET  /api/v1/catalog/lenses        staff only
```

Публичный клиент знает только `code` сессии.

---

## 7. Компоненты (frontend)

- `SessionProvider`
- `WizardShell` / `StepPurpose` / `StepPriority` / `StepThickness` / `StepPhoto` / `StepBudget`
- `ThicknessVisual`
- `RecoHero` / `RecoAlt` / `TechDrawer`
- `StaffSessionForm`
- `engine/*` — чистый TS без React (переиспользуется в CRM/боте)

---

## 8. Новые поставщики

1. Кладём сырой прайс в `data/raw/`
2. Пишем/расширяем нормализатор → `lens_skus`
3. Маппинг покрытий/индексов в онтологию
4. Регрессионные фикстуры: 20 эталонных рецептов → ожидания
5. Без изменения UI

---

## 9. CRM

- Кнопка «Ссылка на подбор» в заказе изготовления
- Prefill рецепта из карточки клиента
- Callback `chosen` создаёт черновик позиций «Линзы» + работа
- Хранение `session_code` на заказе

---

## 10. Авито

- Менеджер: Staff UI → копирует ссылку в чат
- Позже: шаблон ответа + deep link
- Не автоматический бот Авито на старте (риск бана) — человек + ссылка

---

## 11. Telegram

- Бот как канал Session API
- Команды агента `/new`, клиенту — вопросы кнопками
- Тот же `recommend`

---

## 12. ИИ-консультант (фаза 2+)

LLM **не считает диоптрии**. Он:
- извлекает рецепт из фото (vision → structured)
- ведёт диалог, вызывая Expert Engine tool
- объясняет рекомендации словами салона

Детерминированный эксперт остаётся source of truth.

---

## Деплой MVP

`advisor/` — Vite static build → `glaz.online/select/*` (SPA fallback).  
CRM `index.html` пока отделён; интеграция — через session code и общий engine package.
