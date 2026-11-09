// Telegramdan tashqarida (o'rnatilgan ilovada) QR kodni telefon kamerasi bilan skanerlash.
// BarcodeDetector bo'lmasa (masalan iPhone Safari) false qaytaradi — unda kod qo'lda kiritiladi.
window.ytScanQR = function (onCode) {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  var det;
  try { det = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { return false; }
  var wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;z-index:100;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:Onest,system-ui,sans-serif;color:#fff";
  wrap.innerHTML = '<div style="position:relative;width:min(80vw,320px);aspect-ratio:1;border-radius:24px;overflow:hidden;box-shadow:0 0 0 4px #3ed17a">' +
    '<video playsinline muted style="width:100%;height:100%;object-fit:cover"></video></div>' +
    '<span style="font-size:15px;font-weight:700">Ustoz ekranidagi QR kodni ramkaga to\'g\'rilang</span>' +
    '<button style="height:46px;padding:0 24px;border:none;border-radius:14px;background:#fff;color:#14202e;font:inherit;font-size:15px;font-weight:800">Bekor qilish</button>';
  document.body.appendChild(wrap);
  var video = wrap.querySelector("video"), stream = null, done = false;
  function stop() { done = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); wrap.remove(); }
  wrap.querySelector("button").onclick = stop;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
    stream = s; video.srcObject = s; video.play();
    (function tick() {
      if (done) return;
      det.detect(video).then(function (codes) {
        var c = codes && codes[0] && codes[0].rawValue;
        if (c) { stop(); onCode(c); } else setTimeout(tick, 250);
      }).catch(function () { setTimeout(tick, 400); });
    })();
  }).catch(function () { stop(); alert("Kameraga ruxsat berilmadi. Kodni qo'lda kiriting."); });
  return true;
};
