# Ponc 1.1.0 — Stable Core

Ponc — браузерная игра Pong против компьютерного соперника. Версия 1.1.0 переводит проект на модульное ядро ES Modules, отделяет игровую модель от DOM и Canvas и обеспечивает одинаковую скорость симуляции на дисплеях с разной частотой обновления.

## Возможности

- классический матч до 11 очков;
- состояния `MENU`, `COUNTDOWN`, `PLAYING`, `PAUSED`, `GAME_OVER`;
- управление мышью или стрелками с приоритетом последнего способа ввода;
- пауза по `Esc`, кнопке, потере фокуса или скрытию вкладки;
- фиксированный шаг физики 120 Гц с ограничением больших задержек кадра;
- независимое от DOM и Canvas детерминированное ядро;
- Vite production build, ESLint, Prettier, unit/integration и Playwright smoke-тесты;
- GitHub Actions для `push` и `pull_request` в `main`.

## Требования

- Node.js 22.12 или новее;
- npm 10 или новее.

## Установка и запуск

```bash
git clone https://github.com/Onmaynec/Ponc.git
cd Ponc
npm ci
npm run dev
```

Vite выведет адрес локального dev server. Прямое открытие `index.html` через `file://` не поддерживается из-за ES Modules.

## Команды

| Команда                | Назначение                                   |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Vite dev server                              |
| `npm run build`        | Production-сборка в `dist/`                  |
| `npm run preview`      | Локальный просмотр production-сборки         |
| `npm run lint`         | Статический анализ ESLint                    |
| `npm run format`       | Форматирование Prettier                      |
| `npm run format:check` | Проверка форматирования без изменения файлов |
| `npm test`             | Все core/unit/integration тесты Node.js      |
| `npm run test:e2e`     | Playwright smoke-тесты                       |

Версии Vite, ESLint, Prettier и Playwright зафиксированы в `devDependencies` и `package-lock.json`. Runtime-зависимости у приложения отсутствуют.

## Управление

- **Мышь / Pointer Events** — перемещение левой ракетки;
- **↑ / ↓** — клавиатурное управление;
- **Esc** — пауза или продолжение;
- **R** — полный перезапуск матча.

## Архитектура

```text
src/
├── config/       # централизованная конфигурация размеров, скоростей и матча
├── core/         # GameCore, state machine, события и fixed-step loop
├── entities/     # фабрики мяча и ракеток
├── systems/      # ввод, AI и физика
├── rendering/    # CanvasRenderer, только чтение состояния
└── ui/           # DOM-интерфейс и стили

tests/
├── core/         # state machine, счёт, события, frame-rate simulation
├── systems/      # физика и нормализация ввода
└── integration/  # полный розыгрыш от подачи до гола

e2e/              # Playwright browser smoke
.github/workflows # CI для main и pull requests
```

### Поток данных

1. `InputSystem` преобразует DOM-события в нормализованную команду.
2. `GameLoop` накапливает время кадра и вызывает ядро с фиксированным шагом `1/120` секунды.
3. `GameCore` управляет состояниями, счётом и событиями.
4. `PhysicsSystem` изменяет только игровую модель и возвращает факт гола.
5. `AISystem` получает снимок модели и формирует команду для AI.
6. `CanvasRenderer` и `GameUI` читают снимок, не изменяя физику.

Скорости задаются в логических единицах в секунду. Delta большого кадра ограничивается до 100 мс, а число catch-up обновлений — до 24 за кадр.

## Тестирование

```bash
npm ci
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Core-тесты не используют реальный Canvas, DOM или браузер. Отдельный тест имитирует интервалы обновления 60, 120 и 144 Гц и проверяет эквивалентное движение модели.

## Production build

```bash
npm run build
npm run preview
```

Vite использует относительную базу `./`, поэтому содержимое `dist/` можно публиковать на GitHub Pages или другом статическом хостинге без серверной части.

## Версия

Номер версии хранится в `package.json`, внедряется Vite в приложение и отображается в интерфейсе и диагностических `data-*` атрибутах документа.

## Лицензия

MIT — см. [LICENSE](LICENSE).
