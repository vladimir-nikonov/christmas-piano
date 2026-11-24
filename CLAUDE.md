# Разработка «Снежных нот»

Всё приложение — один файл `index.html` (vanilla JS, без сборки). Сайт публикуется из ветки `main` через GitHub Pages, поэтому всё, что попало в `main` и запушено, сразу уходит детям на планшет.

## Каждая фича — в своём worktree

Над одним `index.html` часто работают несколько сессий одновременно. Чтобы они не затирали правки друг друга, в основной папке (`main`) напрямую не разрабатываем.

1. Создать ветку и worktree от свежего `main`:
   ```bash
   git switch main && git pull
   git worktree add ../christmas_piano-<фича> -b feature/<фича> main
   ```
   Дальше вся работа идёт только в `../christmas_piano-<фича>`.
2. Сделать фичу и проверить её в браузере, например в headless Chrome через playwright-core. Открывать `index.html` из папки worktree.
3. Закоммитить в ветку фичи. Коммит должен содержать только файлы этой фичи.
4. Подтянуть свежий `main` и разрешить конфликты в ветке фичи, а не в `main`:
   ```bash
   git fetch origin && git rebase origin/main
   ```
   После rebase ещё раз быстро проверить, что страница открывается без ошибок.
5. Влить в `main` и запушить (из основной папки):
   ```bash
   git switch main && git pull
   git merge --ff-only feature/<фича>
   git push origin main
   ```
   Если `--ff-only` не проходит, значит `main` ушёл вперёд: вернуться к шагу 4.
6. Убрать worktree и ветку:
   ```bash
   git worktree remove ../christmas_piano-<фича>
   git branch -d feature/<фича>
   ```

Фича считается готовой только после коммита и мерджа в `main`. Незакоммиченные правки в основной папке или ветка, не влитая в `main`, — это незаконченная работа.

## Что важно не сломать

- Данные детей хранятся в IndexedDB (`snezhnye-noty`, ключ `db`), запасной вариант — localStorage `snezhnye-noty-v2`. Меняя формат данных, сохраняйте совместимость со старыми записями и с файлами резервной копии (`format: "snezhnye-noty-backup"`).
- Целевое устройство: Huawei MatePad 11, Chrome или Huawei Browser, сервисов Google может не быть.
