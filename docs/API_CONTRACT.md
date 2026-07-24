# API-контракт Lens Path (целевой)

Базовый URL: `https://glaz.online/api/v1`

## Сессии

### `POST /sessions`
Создать консультацию (CRM / Авито-агент / Telegram).

```json
{
  "channel": "avito",
  "clientName": "Анна",
  "clientPhone": "8919...",
  "agentNote": "хочет хамелеон",
  "budgetPair": 15000,
  "prescription": {
    "od": { "sph": -3.5, "cyl": -0.75, "ax": 180, "add": null },
    "os": { "sph": -3.25, "cyl": -0.5, "ax": 10, "add": null },
    "pd": 62,
    "age": 32
  }
}
```

Ответ: `{ "code": "K7Q2", "url": "https://glaz.online/select/K7Q2" }`

### `GET /sessions/:code`
Публично (по коду). Без PII телефона для анонимного клиента — маскировать.

### `PATCH /sessions/:code/answers`
Тело = partial Answers.

### `POST /sessions/:code/recommend`
Возвращает RecommendationSet (practical/optimal/premium + warnings).

### `POST /sessions/:code/choose`
```json
{ "tier": "optimal", "skuId": "..." }
```
Триггерит webhook в CRM / Telegram менеджеру.

## Каталог (staff)

### `GET /catalog/lenses?supplier=Shamir`
### `POST /imports/price-lists` multipart

## Webhooks исходящие

`session.chosen` → CRM создаёт черновик позиций «Линзы» + работа.

## MVP сейчас

Тот же контракт реализован locally в `advisor/src/engine/sessions.ts` (localStorage).
UI уже готов к замене на HTTP без смены UX.
