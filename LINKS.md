# Усі посилання, щоб запустити Anglo і Hola

Тут зібрано все, що тобі знадобиться. Іди зверху вниз.

---

## 🌐 Крок 1 — Викласти в інтернет (Netlify)

| Посилання | Навіщо |
|---|---|
| https://app.netlify.com/drop | Перетягни сюди папку `english/`, потім окремо `spanish/` — миттєвий сайт |
| https://www.netlify.com | Головна (тут зареєструватись, можна через Google) |
| https://app.netlify.com | Панель твоїх сайтів (перейменувати адресу тощо) |

> Інструкція: `LANG_APPS_GUIDE.md`, Частина 1.

---

## 📦 Крок 2 — Зробити Android-файл (.aab)

| Посилання | Навіщо |
|---|---|
| https://www.pwabuilder.com | Встав адресу свого сайту → отримаєш `.aab` + `assetlinks.json` |

> Інструкція: `PWABUILDER_GUIDE.md`, Етап A–B.

---

## 🏬 Крок 3 — Google Play

| Посилання | Навіщо |
|---|---|
| https://play.google.com/console/signup | Реєстрація розробника (разово $25) |
| https://play.google.com/console | Панель: створити застосунок, залити `.aab`, картка |
| https://support.google.com/googleplay/android-developer/answer/9859152 | Офіц. довідка: як залити застосунок |
| https://support.google.com/googleplay/android-developer/answer/140504 | Довідка: підписки (Subscriptions) |

> Інструкції: `PLAY_CONSOLE_CHECKLIST.md` (відповіді на анкети) + `STORE_LISTING.md` (тексти).

---

## 💰 Крок 4 — Реклама (коли захочеш реальні гроші з реклами)

| Посилання | Навіщо |
|---|---|
| https://admob.google.com | Акаунт AdMob (для нативної реклами — просунутий шлях, `mobile/README.md`) |
| https://myadcenter.google.com | Налаштування персональної реклами Google (для політики приватності) |

---

## 🖼️ Крок 5 — Значки і скріншоти

| Що | Де |
|---|---|
| Значок 512×512 | у репо: `english/assets/icon-512.png`, `spanish/assets/icon-512.png` |
| Скріншоти | зроби з телефона на своєму Netlify-сайті (див. розділ нижче) |

---

## 📁 Файли-інструкції в цьому репозиторії

Гілка: `claude/english-learning-android-app-0t7gdm`

| Файл | Про що |
|---|---|
| `LANG_APPS_GUIDE.md` | загальний огляд: Netlify + Google Play |
| `PWABUILDER_GUIDE.md` | детально: зробити `.aab`, підписка |
| `PLAY_CONSOLE_CHECKLIST.md` | готові відповіді на всі анкети Play |
| `STORE_LISTING.md` | назви й описи для крамниці |
| `mobile/README.md` | (просунуте) нативний AdMob через Capacitor |
| `english/privacy.html`, `spanish/privacy.html` | політика приватності (впиши свою пошту!) |

Прямі посилання на GitHub:
- Репозиторій: https://github.com/mykytatitar-rgb/mathhub/tree/claude/english-learning-android-app-0t7gdm

---

## 📸 Як зробити скріншоти для картки Play (5 екранів)

Зроби на телефоні, відкривши свій Netlify-сайт у браузері (кнопки гучності+живлення = знімок екрана):

1. **Головна-мапа** — маршрут уроків (видно рівні A0→B2).
2. **Картка слова** — з емодзі й транскрипцією.
3. **Тест** — питання з варіантами.
4. **Спряження дієслова** — таблиця часів (урок «Спряження»).
5. **Словник** — список вивчених слів із фільтрами.

Вимоги Google: JPG/PNG, від 320 до 3840 пікселів по стороні, 2–8 штук.
