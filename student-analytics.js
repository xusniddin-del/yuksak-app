// Haqiqiy ma'lumotlardan (davomat, baholar, vazifalar, to'lovlar) o'quvchi tahlili.
// Ilova har chizishda window.__APPDATA ga joriy holatni qo'yadi.
(function () {
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const MONTHS_CAP = MONTHS.map(m => m[0].toUpperCase() + m.slice(1));
  const WD = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
  const WDF = { Ya: "yakshanba", Du: "dushanba", Se: "seshanba", Ch: "chorshanba", Pa: "payshanba", Ju: "juma", Sh: "shanba" };
  const fmt = s => { if (!s) return "—"; const [, m, d] = s.split("-"); return `${+d}-${MONTHS[+m - 1]}`; };
  const money = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const isCame = s => s === "keldi" || s === "kech";
  const liso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function analyze(x, g, o) {
    o = o || {};
    const A = window.__APPDATA || {};
    const today = o.today || liso(new Date());
    const att = A.att || {}, grd = A.grades || {};
    const lessons = (A.lessons || [])
      .filter(l => l.g === x.g && l.date <= today && l.status !== "cancel" && l.status !== "moved" && att[l.id] && att[l.id][x.id])
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .map(l => ({ date: l.date, wd: WD[new Date(l.date + "T00:00:00").getDay()], status: att[l.id][x.id], grade: (grd[l.id] || {})[x.id] || "" }));
    const n = lessons.length;
    const attendedL = lessons.filter(l => isCame(l.status));
    const attPct = pct(attendedL.length, n);
    const chunk = Math.min(6, Math.floor(n / 2));
    const first = lessons.slice(0, chunk), last = lessons.slice(-chunk);
    const attR = arr => arr.length ? arr.filter(l => isCame(l.status)).length / arr.length : 0;
    const trend = chunk >= 3 ? attR(last) - attR(first) : 0;
    const lastVisit = attendedL.length ? attendedL[attendedL.length - 1].date : null;
    let absentStreak = 0; for (let i = n - 1; i >= 0 && !isCame(lessons[i].status); i--) absentStreak++;
    let best = 0, cur = 0; lessons.forEach(l => { if (isCame(l.status)) { cur++; best = Math.max(best, cur); } else cur = 0; });
    const late = lessons.filter(l => l.status === "kech");
    const lateWd = Object.entries(late.reduce((a, l) => (a[l.wd] = (a[l.wd] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1])[0];
    const excused = lessons.filter(l => l.status === "sababli").length;
    const unexcused = lessons.filter(l => l.status === "sababsiz").length;

    const grades = lessons.filter(l => l.grade).map(l => ({ n: Number(l.grade), date: fmt(l.date) }));
    const gv = grades.map(z => z.n);
    const gAvg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    const avg = gAvg(gv);
    const h = Math.max(1, Math.floor(gv.length / 2));
    const gFirst = gAvg(gv.slice(0, h)), gLast = gAvg(gv.slice(-h));
    const gTrend = gv.length >= 4 ? gLast - gFirst : 0;
    const fives = gv.filter(v => v === 5).length;

    const myHw = (A.hw || []).filter(z => z.sid === x.id);
    const tasksN = Math.max(myHw.length, (A.tasks || []).filter(t => t.g === x.g).length);
    const hwDone = myHw.filter(z => z.status !== "rejected").length;
    const hwPct = tasksN ? pct(hwDone, tasksN) : 100;
    const hwGr = myHw.filter(z => z.grade).map(z => Number(z.grade));

    // haftalik davomat
    const weeksMap = {};
    lessons.forEach(l => { const d = new Date(l.date + "T00:00:00"); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = liso(mon); (weeksMap[k] = weeksMap[k] || []).push(l); });
    const weeks = Object.keys(weeksMap).sort().map(k => ({ label: fmt(k).replace(/-(\w{3})\w*/, " $1"), pct: Math.round(attR(weeksMap[k]) * 100) }));

    // to'lovlar
    const pays = (x.payments || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const delays = pays.map(p => Math.max(0, Number(String(p.date).slice(8, 10)) - 1));
    const avgDelay = delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
    const lastPay = pays[pays.length - 1];
    const benefitKam = o.benefit ? o.benefit.type === "kam" : (x.benefit && x.benefit.type === "kam");
    const payments = pays.map(p => ({ month: MONTHS_CAP[+String(p.date).slice(5, 7) - 1] || "", date: p.date, amount: p.amount, method: p.method, status: "To'langan", delay: Math.max(0, Number(String(p.date).slice(8, 10)) - 1),
      dateLabel: fmt(p.date), amountLabel: money(p.amount) + " so'm", delayLabel: "" }));

    const hasData = n > 0;
    let risk = hasData ? (1 - attPct / 100) * 110 + Math.max(0, -trend) * 90 + (avg ? Math.max(0, 4.5 - avg) * 12 : 0) + (1 - hwPct / 100) * 35 + (o.status === "unpaid" ? 10 : 0) + absentStreak * 9 + Math.max(0, -gTrend) * 12 : 10;
    risk = clamp(Math.round(risk), 2, 97);
    const level = risk < 25 ? "good" : risk < 50 ? "watch" : "risk";
    const levelLabel = { good: "Yaxshi", watch: "E'tibor kerak", risk: "Ketib qolish xavfi" }[level];
    const retention = clamp(Math.round(100 - risk * 0.85), 12, 98);
    const expGrade = clamp(avg + gTrend * 0.6, 2, 5);
    const expAtt = clamp(Math.round(attPct + trend * 60), 20, 100);
    const nm = new Date(today + "T00:00:00"); nm.setMonth(nm.getMonth() + 1);

    const facts = [];
    if (!hasData) facts.push({ tone: "info", text: "Hali davomat olinmagan — tahlil darslardan keyin paydo bo'ladi." });
    if (hasData && attPct >= 95 && n >= 4) facts.push({ tone: "good", text: `Deyarli dars qoldirmaydi: davomat ${attPct}%.` });
    if (trend <= -0.15) facts.push({ tone: "bad", text: `Oxirgi ${chunk} darsda davomat ${Math.round(attR(last) * 100)}% ga tushdi, avval ${Math.round(attR(first) * 100)}% edi.` });
    if (trend >= 0.12) facts.push({ tone: "good", text: `Davomat yaxshilanmoqda: ${Math.round(attR(first) * 100)}% → ${Math.round(attR(last) * 100)}%.` });
    if (absentStreak >= 2) facts.push({ tone: "bad", text: `Oxirgi ${absentStreak} darsga ketma-ket kelmagan.` });
    if (late.length >= 2 && lateWd) facts.push({ tone: "warn", text: `${late.length} marta kech qolgan, ko'pincha ${WDF[lateWd[0]]} kunlari.` });
    if (best >= 8) facts.push({ tone: "good", text: `Eng uzun ketma-ket qatnashuvi: ${best} dars.` });
    if (gTrend >= 0.4) facts.push({ tone: "good", text: `Baholari o'smoqda: o'rtacha ${gFirst.toFixed(1)} → ${gLast.toFixed(1)}.` });
    if (gTrend <= -0.4) facts.push({ tone: "bad", text: `Baholari pasaymoqda: o'rtacha ${gFirst.toFixed(1)} → ${gLast.toFixed(1)}.` });
    if (fives >= 5) facts.push({ tone: "good", text: `Darslarda ${fives} marta "5" olgan.` });
    if (tasksN && hwPct < 70) facts.push({ tone: "bad", text: `Uyga vazifalarning faqat ${hwPct}% ini topshirgan.` });
    if (unexcused >= 2) facts.push({ tone: "warn", text: `${unexcused} ta dars sababsiz qoldirilgan.` });
    if (excused >= 1) facts.push({ tone: "info", text: `${excused} ta darsni oldindan aytib qoldirgan.` });
    if (o.rank === 1 && o.coins) facts.push({ tone: "good", text: `Guruhda coin bo'yicha 1-o'rinda (${o.coins} coin).` });
    if (o.payModeLabel === "Davomat bo'yicha") facts.push({ tone: "info", text: "To'lovi davomat bo'yicha hisoblanadi." });
    if (o.benefitLabel) facts.push({ tone: "info", text: o.benefitLabel });

    const recs = [];
    if (hasData && level === "risk") recs.push("Ota-ona bilan shu hafta ichida bog'lanib, sababini aniqlash.");
    if (absentStreak >= 2) recs.push("Keyingi darsdan oldin o'quvchiga shaxsan yozib, eslatish.");
    if (tasksN && hwPct < 70) recs.push("Uyga vazifalarni kichikroq qismlarga bo'lib berish.");
    if (gTrend <= -0.4) recs.push("Qo'shimcha takrorlash darsi yoki mentor biriktirish.");
    if (late.length >= 3) recs.push("Kech qolish sababini so'rash, dars vaqtini qayta ko'rib chiqish.");
    if (hasData && level === "good") recs.push("Rag'batlantirish: bonus coin yoki guruhda namunaviy o'quvchi sifatida tilga olish.");
    if (!recs.length) recs.push("Hozirgi holatni kuzatishda davom etish.");

    return {
      levelKey: level, levelLabel, risk, retention,
      attPct, trendPct: Math.round(trend * 100), lessonsTotal: n, attended: attendedL.length, late: late.length, excused, unexcused,
      lastVisit: lastVisit ? fmt(lastVisit) : "—", absentStreak, bestStreak: best,
      avgGrade: avg ? avg.toFixed(1) : "—", gradeTrend: gTrend, fives, hwPct, hwDone, hwTotal: tasksN, hwAvg: hwGr.length ? gAvg(hwGr).toFixed(1) : "—",
      avgDelay: Math.round(avgDelay), lastPay: lastPay ? `${fmt(lastPay.date)} · ${lastPay.method}` : "—",
      weeks, grades: grades.slice(-14),
      log: lessons.slice(-14).reverse().map(l => ({ date: fmt(l.date), wd: WDF[l.wd], status: l.status, grade: l.grade || "" })),
      payments,
      forecast: [
        { label: "Kursni davom ettirish ehtimoli", value: hasData ? retention + "%" : "—" },
        { label: "Kutilayotgan o'rtacha baho", value: avg ? expGrade.toFixed(1) : "—" },
        { label: "Keyingi oy davomati", value: hasData ? "≈ " + expAtt + "%" : "—" },
        { label: MONTHS_CAP[nm.getMonth()] + " to'lovi", value: benefitKam ? "Imtiyozli" : `≈ ${1 + Math.round(avgDelay)}-${MONTHS[nm.getMonth()]}` }
      ],
      facts, recs, startLabel: lessons.length ? fmt(lessons[0].date) : fmt(today)
    };
  }
  window.StudentAnalytics = { analyze, fmt, money };
})();
