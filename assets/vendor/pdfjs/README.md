# pdf.js

`pdf.min.js` і `pdf.worker.min.js` — pdf.js 3.11.174 (Mozilla) з
https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/, без змін.
Ліцензія Apache 2.0: https://github.com/mozilla/pdf.js/blob/master/LICENSE

Потрібен лише для вставки PDF на дошку сторінками-картинками
(assets/js/pdfpages.js). Вантажиться ліниво, групою `pdf` у app.js.
Версія 3 — бо вона ще має звичайний скрипт (UMD); з 4-ї лише ES-модулі.

SHA-256:
- pdf.min.js — 5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946
- pdf.worker.min.js — feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b
