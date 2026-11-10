// Face ID: ustoz yuzini tanish (face-api, telefonning o'zida ishlaydi).
// Rasm serverga yuborilmaydi — faqat yuzning 128 ta raqamdan iborat "izi" (descriptor) yuboriladi.
(function () {
  var C = window.APP_CONFIG || {};
  var BASE = C.FACE_BASE || "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/";
  var loading = null;

  function loadScript(src) {
    return new Promise(function (ok, bad) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error("Face ID kutubxonasi yuklanmadi. Internetni tekshiring")); }; document.head.appendChild(s); });
  }
  function ready() {
    if (loading) return loading;
    loading = (window.faceapi ? Promise.resolve() : loadScript(BASE + "dist/face-api.js")).then(function () {
      var f = window.faceapi, m = BASE + "model/";
      return Promise.all([f.nets.tinyFaceDetector.loadFromUri(m), f.nets.faceLandmark68Net.loadFromUri(m), f.nets.faceRecognitionNet.loadFromUri(m)]);
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  var opts = function (size) { return new window.faceapi.TinyFaceDetectorOptions({ inputSize: size || 416, scoreThreshold: 0.45 }); };

  // Yuz burilishi: burun uchi ko'zlar o'rtasidan qancha siljigan (-1..1)
  function yaw(lm) {
    var p = lm.positions, le = p[36], re = p[45], nose = p[30];
    var mid = (le.x + re.x) / 2, d = Math.abs(re.x - le.x) || 1;
    return (nose.x - mid) / d;
  }

  function fileToImage(file) {
    return new Promise(function (ok, bad) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { ok(img); }; img.onerror = function () { bad(new Error("Rasmni o'qib bo'lmadi")); };
      img.src = url;
    });
  }
  function thumb(img, size) {
    var c = document.createElement("canvas"), k = Math.min(1, size / Math.max(img.width, img.height));
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  }

  // Direktor yuklagan rasmdan yuz izini olish
  function fromFile(file) {
    return ready().then(function () { return fileToImage(file); }).then(function (img) {
      return window.faceapi.detectAllFaces(img, opts(608)).withFaceLandmarks().withFaceDescriptors().then(function (res) {
        if (!res.length) throw new Error("Rasmda yuz topilmadi. Yuz aniq ko'rinadigan rasm tanlang");
        if (res.length > 1) throw new Error("Rasmda bir nechta yuz bor. Faqat ustoz tushgan rasm kerak");
        return { desc: Array.from(res[0].descriptor).map(function (v) { return Math.round(v * 10000) / 10000; }), yaw: yaw(res[0].landmarks), thumb: thumb(img, 120) };
      });
    });
  }

  // Kirishda: kamera ochiladi, avval to'g'ri qarash, keyin boshni burish (jonli odam ekanini tekshirish)
  function verifyLive(title) {
    return new Promise(function (resolve, reject) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { reject(new Error("Bu qurilmada kamera ishlamaydi")); return; }
      var wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;inset:0;z-index:120;background:#0b1220;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;font-family:Onest,system-ui,sans-serif;color:#fff;text-align:center";
      wrap.innerHTML = '<span style="font-size:18px;font-weight:800">' + (title || "Face ID") + '</span>' +
        '<div style="position:relative;width:min(72vw,280px);aspect-ratio:1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 5px #4fb0ff">' +
        '<video playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video></div>' +
        '<span id="fz-msg" style="font-size:16px;font-weight:700;min-height:44px;max-width:300px">Yuklanmoqda…</span>' +
        '<div style="display:flex;gap:8px"><span id="fz-s1" style="width:46px;height:6px;border-radius:3px;background:rgba(255,255,255,.25)"></span><span id="fz-s2" style="width:46px;height:6px;border-radius:3px;background:rgba(255,255,255,.25)"></span></div>' +
        '<button style="height:46px;padding:0 24px;border:none;border-radius:14px;background:#fff;color:#14202e;font:inherit;font-size:15px;font-weight:800">Bekor qilish</button>';
      document.body.appendChild(wrap);
      var video = wrap.querySelector("video"), msg = wrap.querySelector("#fz-msg"), stream = null, done = false;
      var say = function (t) { msg.textContent = t; };
      function stop() { done = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); wrap.remove(); }
      wrap.querySelector("button").onclick = function () { stop(); reject(new Error("Bekor qilindi")); };
      var started = Date.now();
      ready().then(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false }); }).then(function (s) {
        stream = s; video.srcObject = s; return video.play();
      }).then(function () {
        var first = null, y0 = null;
        say("Kameraga to'g'ri qarang");
        (function tick() {
          if (done) return;
          if (Date.now() - started > 45000) { stop(); reject(new Error("Vaqt tugadi. Qayta urinib ko'ring")); return; }
          window.faceapi.detectSingleFace(video, opts(320)).withFaceLandmarks().withFaceDescriptor().then(function (r) {
            if (done) return;
            if (!r) { say(first ? "Yuzingiz ko'rinmayapti. Boshni sekin chapga yoki o'ngga buring" : "Yuzingizni doira ichiga keltiring"); setTimeout(tick, 200); return; }
            var y = yaw(r.landmarks), d = Array.from(r.descriptor);
            if (!first) {
              if (Math.abs(y) > 0.12) { say("Kameraga to'g'ri qarang"); setTimeout(tick, 200); return; }
              first = d; y0 = y; wrap.querySelector("#fz-s1").style.background = "#3ed17a";
              say("Endi boshingizni sekin chapga yoki o'ngga buring"); setTimeout(tick, 250); return;
            }
            if (Math.abs(y - y0) > 0.18) {
              wrap.querySelector("#fz-s2").style.background = "#3ed17a"; say("Tekshirilmoqda…");
              setTimeout(function () { stop(); resolve([first, d].map(function (a) { return a.map(function (v) { return Math.round(v * 10000) / 10000; }); })); }, 300);
              return;
            }
            setTimeout(tick, 200);
          }).catch(function () { setTimeout(tick, 400); });
        })();
      }).catch(function (e) { stop(); reject(new Error(e && e.name === "NotAllowedError" ? "Kameraga ruxsat berilmadi" : (e && e.message) || "Kamera ochilmadi")); });
    });
  }

  window.YTFace = { ready: ready, fromFile: fromFile, verifyLive: verifyLive };

  // Rasmni kichraytirish (profil rasmi, vazifa rasmi uchun)
  window.YTImg = {
    resize: function (file, max, quality) {
      return fileToImage(file).then(function (img) {
        var c = document.createElement("canvas"), k = Math.min(1, max / Math.max(img.width, img.height));
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", quality || 0.8);
      });
    },
    toBase64: function (file) {
      return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = function () { bad(new Error("Faylni o'qib bo'lmadi")); }; r.readAsDataURL(file); });
    }
  };
})();
