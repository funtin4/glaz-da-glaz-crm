# Lens Path — цифровой подбор линз

SPA-консультант для салона **Глаз Да Глаз**.  
Не каталог и не магазин: клиент отвечает на вопросы → экспертная система выдаёт 3 варианта.

## Быстрый старт

```bash
cd advisor
npm install
npm run dev
```

Откроется `http://localhost:5173/select/`

- `/` — лендинг
- `/staff` — создание ссылки для Авито/CRM
- `/:CODE` — мастер клиента

## Сборка

```bash
npm run build
npm run preview
```

Статику из `dist/` можно отдавать с `glaz.online/select/` (base path уже `/select/`).

## Данные

- `src/data/lenses.json` — 205 нормализованных SKU (Shamir, Maxxee, Rodenstock, Weiya)
- `src/data/services.json` — работы и доп. услуги
- Сырые прайсы: `../data/raw/*.html`
- Пересборка базы: `python3 ../scripts/build_knowledge_base.py`

## Движок

`src/engine/` — чистый TypeScript без React (тот же код можно вызвать из CRM/бота):

- `rules.ts` — оптические и коммерческие правила
- `recommend.ts` — hard filter → score → portfolio (practical/optimal/premium)
- `sessions.ts` — MVP-сессии в localStorage

Фикстуры:

```bash
npx --yes tsx src/engine/recommend.test.ts
```

## Документация

- `../docs/PRODUCT_AUDIT.md` — критика исходного ТЗ
- `../docs/ARCHITECTURE.md` — целевая архитектура на 3 года
