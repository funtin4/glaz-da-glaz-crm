# Persistence: optics knowledge pack

**Для любого будущего агента / доработки приложения.**

## Обязательно прочитать перед изменением кода рекомендаций

1. `docs/optics-knowledge/research-report.md`
2. `docs/optics-knowledge/16-decision-model.md`
3. `docs/optics-knowledge/12-safety-and-escalation.md`
4. `docs/optics-knowledge/17-client-questions.md`
5. `docs/optics-knowledge/13-sources.md`
6. `docs/optics-knowledge/15-open-questions.md`
7. `knowledge/domain-facts.json`
8. `data/normalized/catalog.json` (+ `catalog_summary.json`)
9. `rules/rules.draft.json`
10. `tests/scenarios/scenarios_v1.json`

Полный учебный корпус: `docs/optics-knowledge/01` … `15`.

## Жёсткие запреты

- Не выдумывать SPH/CYL/ADD/Abbe/corridor, если в прайсе/источнике нет.
- Не брать «факт» из старого `advisor/src/data/lenses.json` без сверки: там есть **искусственные** диапазоны Rodenstock.
- Не обещать лечение, «идеальное зрение», точную толщину без оправы, точную цену progressive без измерений.
- Blue filter: формулировки только честные (Cochrane 2023).
- Фотохром в авто: учитывать УФ-барьер лобового; XTRActive ≠ обычный фотохром.

## Разделение слоёв

| Слой | Путь |
|------|------|
| Сырые прайсы | `data/raw/` |
| Нормализованные факты | `data/normalized/` |
| Знания / факты JSON | `knowledge/` |
| Правила | `rules/` |
| Тексты клиента | `content/` (создавать при доработке) |
| Сценарии | `tests/scenarios/` |
| Документация | `docs/optics-knowledge/` |

## Статус

Исследовательская фаза. **Масштабная переработка engine/UI — только после ответа владельца на `15-open-questions.md`.**
