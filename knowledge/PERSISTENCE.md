# PERSISTENCE — загрузка оптического knowledge pack

Этот файл обязателен для **любого** будущего агента (и человека), который меняет тексты консультанта, правила подбора линз или Авито-скрипты проекта «Глаз Да Глаз» / Lens Path.

---

## 1. Что загрузить перед работой

Читать **в этом порядке**:

1. `/workspace/knowledge/PERSISTENCE.md` (этот файл)
2. `/workspace/knowledge/domain-facts.json` — машинные факты (`confirmed` / `expert_judgment` / `unknown`)
3. `/workspace/docs/optics-knowledge/research-report.md` — выводы, запреты, план
4. `/workspace/docs/optics-knowledge/13-sources.md` — приоритет источников и надёжность (`[SRC-…]`)
5. `/workspace/docs/optics-knowledge/15-open-questions.md` — что ещё не утверждено владельцем
6. Ядро оптики `01`–`08` (рецепт, типы, материалы, дизайны, покрытия, фотохром/sun, progressive, office)
7. Тематические файлы по задаче:
   - `09-frame-and-thickness.md` — оправа, толщина, blank, rimless
   - `10-sales-consultation.md` — консультация, 3 опции, Авито-поток
   - `11-objections.md` — ответы на возражения
   - `12-safety-and-escalation.md` — уровни A/B/C, эскалация
   - `14-glossary.md` — термины RU/EN
8. При работе с каталогом: `/workspace/data/lenses.json` и сырые прайсы `/workspace/data/raw/`
9. При работе с продуктом: `/workspace/docs/PRODUCT_AUDIT.md`, `/workspace/docs/ARCHITECTURE.md`

---

## 2. Жёсткие правила для агентов

1. **Не выдумывать факты.** Нет в knowledge pack / IFU / утверждённом ответе владельца → пометить как open question, не кодировать как истину.
2. **Не подменять источники.** Маркетинг дистрибьютора и карточки маркетплейсов не побеждают manufacturer IFU и peer-review (особенно blue-light).
3. **Пороги (возраст, SPH, мм края, цены работ, наценка)** — только из заполненных ответов в `15-open-questions.md` или явной инструкции владельца в текущем чате.
4. **Онлайн ≠ финальный заказ** для progressive, rimless, wrap, детей (по политике), меджалоб.
5. **Запрещённые обещания клиенту:**
   - гарантия толщины в мм без параметров оправы и посадки;
   - «защита глаз / лечение / профилактика болезни» от компьютера или синего света;
   - фотохром в авто без оговорки про лобовое стекло;
   - точная цена пары до понимания оправы/диаметра/наличия;
   - авто-назначение progressive только по возрасту.
6. **Не менять** UI/engine «заодно», если задача — документация; и наоборот: меняя engine, сверять тексты с `10`/`11`/`12`.
7. При конфликте кода и knowledge pack — **исправлять код под pack** (после approval на числовые пороги), не «подгонять» документы под баг.
8. Новые внешние факты добавлять в `13-sources.md` с датой доступа и маркером надёжности.

---

## 3. Карта путей

```
/workspace/knowledge/PERSISTENCE.md          ← точка входа для агентов
/workspace/knowledge/domain-facts.json       ← структурированные факты для движка
/workspace/docs/optics-knowledge/
  01-prescription-basics.md
  02-lens-types.md
  03-materials-and-indexes.md
  04-lens-designs.md
  05-coatings.md
  06-photochromic-and-sun.md
  07-progressive-lenses.md
  08-office-lenses.md
  09-frame-and-thickness.md
  10-sales-consultation.md
  11-objections.md
  12-safety-and-escalation.md
  13-sources.md
  14-glossary.md
  15-open-questions.md
  research-report.md
/workspace/data/lenses.json                  ← SKU/цены (не клиника)
/workspace/data/raw/                         ← HTML-прайсы поставщиков
/workspace/advisor/src/engine/               ← код правил (менять только осознанно)
```

---

## 4. Контекст продукта (не изобретать заново)

- Частный мастер, бренд **«Глаз Да Глаз»**, Курск, канал **Авито**.
- Услуга: **вставка линз в оправу клиента**.
- Поставщики в прайсе: **Shamir, Maxxee, Rodenstock (white label возможен), Weiya**.
- Продукт подборщика — консультант с **3 вариантами**, не интернет-магазин на 205 SKU.

---

## 5. После изменений

1. Если закрыт вопрос владельца — обновить `15-open-questions.md` и §7 `research-report.md`.
2. Если добавлен источник — строка в `13-sources.md`.
3. Если менялись клиентские фразы — сверить с запретами §11 `research-report.md`.
4. Не удалять этот файл и не «сжимать» pack до потери ограничений по безопасности.

---

*Создано: 2026-07-24. Фаза research: код приложения не менялся.*
