// Ilovani telefonga o'rnatish: Android'da "O'rnatish" tugmasi, iPhone'da yo'riqnoma.
(function () {
  if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var inTelegram = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
  if (standalone || inTelegram) return;
  try { if (localStorage.getItem("yt_install_hide") === "1") return; } catch (e) {}

  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/.test(ua);
  var deferred = null;

  function bar(html, onInstall) {
    var old = document.getElementById("yt-install"); if (old) old.remove();
    var el = document.createElement("div");
    el.id = "yt-install";
    el.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99;max-width:520px;margin:0 auto;background:#fff;color:#14202e;border-radius:18px;padding:12px 12px 12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 14px 34px rgba(0,0,0,.28);font-family:Onest,system-ui,sans-serif";
    el.innerHTML = '<img src="icon-192.png" alt="" style="width:42px;height:42px;border-radius:12px;flex-shrink:0">' +
      '<div style="flex:1;min-width:0;font-size:13px;line-height:1.35">' + html + '</div>' +
      (onInstall ? '<button id="yt-inst-btn" style="height:38px;padding:0 14px;border:none;border-radius:11px;background:linear-gradient(180deg,#4fb0ff,#1f7fea);color:#fff;font:inherit;font-size:14px;font-weight:800">O\'rnatish</button>' : '') +
      '<button id="yt-inst-x" aria-label="Yopish" style="width:30px;height:30px;border:none;border-radius:9px;background:#eef1f5;color:#4a5563;font-size:16px">✕</button>';
    document.body.appendChild(el);
    document.getElementById("yt-inst-x").onclick = function () { el.remove(); try { localStorage.setItem("yt_install_hide", "1"); } catch (e) {} };
    if (onInstall) document.getElementById("yt-inst-btn").onclick = onInstall;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    bar("<b>Yuksak ta'lim</b> ilovasini telefoningizga o'rnating", function () {
      deferred.prompt();
      deferred.userChoice.finally(function () { var b = document.getElementById("yt-install"); if (b) b.remove(); });
    });
  });
  window.addEventListener("appinstalled", function () { var b = document.getElementById("yt-install"); if (b) b.remove(); });

  if (isIOS) window.addEventListener("load", function () {
    setTimeout(function () { bar("<b>Ilovani o'rnatish:</b> pastdagi <b>Ulashish</b> ⬆️ tugmasini bosing → <b>«Bosh ekranga qo'shish»</b>"); }, 1500);
  });
})();
