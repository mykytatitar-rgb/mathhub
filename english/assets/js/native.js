/* Anglo — нативний місток (реклама + підписка).
   Працює ЛИШЕ всередині Android-обгортки (Capacitor). У звичайному браузері/PWA
   усе тут — «пусто» (no-op), тож веб-версія поводиться так само, як і раніше.

   Що вмикає в нативному застосунку:
     • AdMob — банер унизу екрана (ховається, коли активна підписка);
     • Google Play Billing (через cordova-plugin-purchase) — підписка «Без реклами».

   ID нижче — ЗАГЛУШКИ. Заміни їх на свої з кабінетів AdMob і Google Play Console:
     ADMOB_BANNER_ID  — рекламний блок «Banner» з AdMob;
     SUB_PRODUCT_ID   — ідентифікатор підписки з Play Console (Monetize → Subscriptions).
   Тестові ID AdMob (ca-app-pub-3940256099942544/...) можна лишити на час розробки. */

(function (global) {
  'use strict';

  var ADMOB_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111'; // TEST banner — замінити
  var SUB_PRODUCT_ID  = 'remove_ads';                              // з Play Console

  var Cap = global.Capacitor;
  var isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

  // Плагіни підвантажуються обгорткою; звертаємось до них через feature-detect.
  function admob() { return (Cap && Cap.Plugins && Cap.Plugins.AdMob) || global.AdMob || null; }
  function store() { return (global.CdvPurchase && global.CdvPurchase.store) || null; }

  var bannerVisible = false;
  var entitlementCb = null; // викликаємо, коли статус підписки змінюється: cb(true|false)

  function notify(active) { try { entitlementCb && entitlementCb(!!active); } catch (e) {} }

  /* ---------- Реклама ---------- */
  async function initAds() {
    var a = admob(); if (!a) return;
    try { await a.initialize({ initializeForTesting: false }); } catch (e) {}
  }
  async function showBanner() {
    var a = admob(); if (!a || bannerVisible) return;
    try {
      await a.showBanner({
        adId: ADMOB_BANNER_ID,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0
      });
      bannerVisible = true;
    } catch (e) {}
  }
  async function hideBanner() {
    var a = admob(); if (!a || !bannerVisible) return;
    try { await a.removeBanner(); bannerVisible = false; } catch (e) {}
  }
  // Показати/сховати банер залежно від того, чи активна підписка.
  function syncAds(premium) { if (!isNative) return; premium ? hideBanner() : showBanner(); }

  /* ---------- Підписка (Google Play Billing) ---------- */
  var billingReady = false;
  function isSubActive(s) {
    try {
      var p = s.get(SUB_PRODUCT_ID);
      return !!(p && p.owned);
    } catch (e) { return false; }
  }
  async function initBilling() {
    var s = store(); if (!s || billingReady) return;
    try {
      s.register([{ id: SUB_PRODUCT_ID, type: s.PAID_SUBSCRIPTION, platform: s.GOOGLE_PLAY }]);
      s.when()
        .approved(function (t) { t.verify(); })
        .verified(function (r) { r.finish(); notify(true); })
        .owned(function () { notify(true); })
        .unverified(function () { /* нічого */ })
        .expired(function () { notify(false); });
      s.error(function () { /* тихо ігноруємо, лишаємось на попередньому статусі */ });
      await s.initialize([s.GOOGLE_PLAY]);
      billingReady = true;
      notify(isSubActive(s));
    } catch (e) {}
  }
  async function buy() {
    var s = store(); if (!s) return false;
    try {
      if (!billingReady) await initBilling();
      var offer = s.get(SUB_PRODUCT_ID) && s.get(SUB_PRODUCT_ID).getOffer();
      if (offer) { await s.order(offer); return true; }
    } catch (e) {}
    return false;
  }
  async function restore() {
    var s = store(); if (!s) return;
    try { await s.restorePurchases(); notify(isSubActive(s)); } catch (e) {}
  }
  // Локалізована ціна з магазину (щоб показати «₴59 / міс» реальну), або null.
  function priceOf() {
    var s = store(); if (!s) return null;
    try {
      var offer = s.get(SUB_PRODUCT_ID) && s.get(SUB_PRODUCT_ID).getOffer();
      var ph = offer && offer.pricingPhases && offer.pricingPhases[0];
      return ph ? ph.price : null;
    } catch (e) { return null; }
  }

  /* ---------- Публічний API ---------- */
  var Native = {
    isNative: isNative,
    // Викликати один раз на старті. cb(active) оновлює преміум-статус у застосунку.
    async init(cb) {
      entitlementCb = cb || null;
      if (!isNative) return;
      await initAds();
      await initBilling();
    },
    syncAds: syncAds,   // syncAds(premium)
    buy: buy,           // повертає Promise<bool> (успішно почато покупку)
    restore: restore,   // відновити покупки
    price: priceOf      // рядок ціни або null
  };

  global.Native = Native;
})(window);
