(function () {
  "use strict";
  var cfg = window.DUEBRIEF || {};
  var price = document.getElementById("price");
  if (price) price.textContent = "$" + cfg.priceUSD;

  var buy = document.getElementById("buy");
  var panel = document.getElementById("buy-panel");
  if (!buy) return;

  buy.addEventListener("click", function () {
    if (cfg.checkoutUrl) {
      window.location.href = cfg.checkoutUrl;
      return;
    }
    if (panel) panel.hidden = false;
  });

  var mail = document.getElementById("mail-buy");
  if (mail && cfg.contactEmail) {
    mail.href =
      "mailto:" +
      cfg.contactEmail +
      "?subject=" +
      encodeURIComponent("Duebrief") +
      "&body=" +
      encodeURIComponent(
        "Hi Luke — I want to buy Duebrief ($" +
          cfg.priceUSD +
          "). Please send a payment link."
      );
  }
})();
