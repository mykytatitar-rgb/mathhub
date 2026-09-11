/* 中文 — підписка через Google Play Billing у TWA (Digital Goods API).
   Працює ВСЕРЕДИНІ застосунку з Google Play (Trusted Web Activity), зібраного
   через PWABuilder — БЕЗ Android Studio. У звичайному браузері/PWA все тут «спить»
   (no-op), тож веб-версія поводиться так само, як і раніше.

   Реклама на цьому шляху — це HTML-банер усередині сторінки (елемент #adslot),
   який показується без підписки і зникає з нею. Нативний AdMob сюди не входить
   (він потребує окремої нативної збірки — див. mobile/README.md).

   SUB_PRODUCT_ID — ідентифікатор підписки з Google Play Console
   (Monetize → Subscriptions). Має збігатися рядок-у-рядок. */

(function (global) {
  'use strict';

  var SUB_PRODUCT_ID = 'remove_ads';
  var BILLING = 'https://play.google.com/billing';

  var hasDG = (typeof global.getDigitalGoodsService === 'function');
  var service = null;      // Digital Goods service
  var entitlementCb = null;
  var cachedPrice = null;

  function notify(active) { try { entitlementCb && entitlementCb(!!active); } catch (e) {} }

  async function getService() {
    if (service) return service;
    if (!hasDG) return null;
    try { service = await global.getDigitalGoodsService(BILLING); } catch (e) { service = null; }
    return service;
  }

  async function loadDetails() {
    var s = await getService(); if (!s) return;
    try {
      var items = await s.getDetails([SUB_PRODUCT_ID]);
      if (items && items[0] && items[0].price) {
        var p = items[0].price; // {currency, value}
        cachedPrice = p.value ? (p.value + ' ' + (p.currency || '')).trim() : null;
      }
    } catch (e) {}
  }

  async function checkEntitlement() {
    var s = await getService(); if (!s) return false;
    try {
      var purchases = await s.listPurchases();
      var owned = (purchases || []).some(function (x) { return x.itemId === SUB_PRODUCT_ID; });
      // Підтвердити покупку, якщо ще не підтверджена (вимога Play).
      if (owned) {
        try {
          for (var i = 0; i < purchases.length; i++) {
            if (purchases[i].itemId === SUB_PRODUCT_ID && s.acknowledge) {
              await s.acknowledge(purchases[i].purchaseToken).catch(function () {});
            }
          }
        } catch (e) {}
      }
      return owned;
    } catch (e) { return false; }
  }

  async function buy() {
    if (!hasDG || !global.PaymentRequest) return false;
    try {
      await getService();
      var req = new global.PaymentRequest(
        [{ supportedMethods: BILLING, data: { sku: SUB_PRODUCT_ID } }],
        { total: { label: 'Підписка', amount: { currency: 'UAH', value: '0' } } }
      );
      var resp = await req.show();
      var token = resp.details && resp.details.token;
      await resp.complete('success');
      var s = await getService();
      if (token && s && s.acknowledge) { await s.acknowledge(token).catch(function () {}); }
      var active = await checkEntitlement();
      notify(active);
      return active;
    } catch (e) { return false; }
  }

  async function restore() {
    notify(await checkEntitlement());
  }

  var Native = {
    // true, якщо доступний реальний біллінг (тобто ми всередині TWA з Play Billing)
    isNative: hasDG,
    async init(cb) {
      entitlementCb = cb || null;
      if (!hasDG) return;
      await loadDetails();
      notify(await checkEntitlement());
    },
    syncAds: function () { /* реклама тут — HTML-банер, керується перемальовкою */ },
    buy: buy,
    restore: restore,
    price: function () { return cachedPrice; }
  };

  global.Native = Native;
})(window);
