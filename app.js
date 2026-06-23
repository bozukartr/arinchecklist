import { firebaseConfig, COLLECTION, isFirebaseConfigured } from "./firebase-config.js";

// ---------------------------------------------------------------------------
// Görev şablonu (ARIN Resort Bodrum Misafir İlişkileri Günlük Operasyon Formu)
// ---------------------------------------------------------------------------
const TEMPLATE = [
  {
    id: "morning",
    title: "Sabah Operasyonu",
    icon: "🌅",
    cls: "morning",
    tasks: [
      "CRM üzerinden Inhouse, Arrival ve Departure kontrol edildi",
      "Günlük liste WhatsApp grubunda paylaşıldı",
      "Outlook mailleri kontrol edildi",
      "Gece vardiyasından gelen notlar ve acil durumlar incelendi",
      "Aksiyon planı oluşturuldu",
      "Doğum günü listesi çıkarıldı",
      "Yıl dönümü listesi çıkarıldı",
      "Evlilik teklifi ve özel organizasyonlar kontrol edildi",
      "Tebrik kartları hazırlandı",
      "Kartlar F&B departmanına teslim edildi",
      "Online yorumlar cevaplandı",
      "Yorum takip Excel dosyasına işlendi",
    ],
  },
  {
    id: "noon",
    title: "Öğle Operasyonu",
    icon: "☀️",
    cls: "noon",
    tasks: [
      "2 gün sonraki Arrival listesi kontrol edildi",
      "Telefon numarası bulunan misafirler arandı",
      "A la Carte rezervasyonları oluşturuldu",
      "Luna listesi ilgili departmanla paylaşıldı",
      "Solyra listesi ilgili departmanla paylaşıldı",
      "Departure misafirlerine teşekkür mesajı gönderildi",
      "Review talep mesajları gönderildi",
      "Booking ve Suite misafirleri karşılandı",
      "Guest Contact gerçekleştirildi",
      "WhatsApp mesajları cevaplandı",
      "E-mailler cevaplandı",
      "Desk misafirleri karşılandı",
      "Düşük puanlı anket misafirleri tespit edildi",
      "Misafirlerle görüşme sağlandı",
      "İkram dağıtımları kontrol edildi",
    ],
  },
  {
    id: "evening",
    title: "Akşam Operasyonu",
    icon: "🌙",
    cls: "evening",
    tasks: [
      "Günlük aktivite programı güncellendi",
      "APP güncellemeleri tamamlandı",
      "Luna Restaurant karşılama yapıldı",
      "Günlük alerjen bilgileri F&B ile paylaşıldı",
      "Misafir kartları güncellendi",
      "Sağlık durumu olan misafirler takip edildi",
      "Hemşire Gülay Hanım ile koordinasyon sağlandı",
      "Tepe Clinic süreçleri takip edildi",
      "İç anketler kontrol edildi",
      "Düşük puanlı anketler rapora işlendi",
      "Olumsuz yorum raporu güncellendi",
      "Kapanış raporu hazırlandı",
      "Ön Büro'ya vardiya devir notu bırakıldı",
    ],
  },
  {
    id: "summary",
    title: "Gün Sonu Kontrol",
    icon: "✅",
    cls: "summary",
    tasks: [
      "Tüm ikramlar gönderildi",
      "Tüm yorumlar cevaplandı",
      "Düşük puanlı anketler takip edildi",
      "Arrival misafirleri arandı",
      "Luna listesi paylaşıldı",
      "Solyra listesi paylaşıldı",
      "APP güncellendi",
      "Kapanış raporu tamamlandı",
      "Vardiya devri gerçekleştirildi",
    ],
  },
];

// Stabil görev kimliği üret (şablon değişse de eski veriyle uyumlu kalsın diye index tabanlı)
function taskKey(sectionId, idx) {
  return `${sectionId}:${idx}`;
}
function totalTaskCount() {
  return TEMPLATE.reduce((n, s) => n + s.tasks.length, 0);
}

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------
const state = {
  view: "daily",
  date: todayStr(),
  doc: blankDoc(),          // aktif günün verisi { tasks:{key:{done,note}}, sign:{...} }
  unsub: null,              // firestore aboneliği
  archive: [],              // arşiv görünümü için tüm günlerin özeti
};

let db = null;
let firestore = null; // modüler fonksiyonlar
let saveTimer = null;

function blankDoc() {
  return { tasks: {}, sign: { responsible: "", manager: "" }, updatedAt: null };
}

// ---------------------------------------------------------------------------
// Tarih yardımcıları
// ---------------------------------------------------------------------------
function todayStr() {
  return toStr(new Date());
}
function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftDate(s, days) {
  const d = fromStr(s);
  d.setDate(d.getDate() + days);
  return toStr(d);
}
function prettyDate(s) {
  const d = fromStr(s);
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
}

// ---------------------------------------------------------------------------
// Depolama katmanı (Firestore veya localStorage)
// ---------------------------------------------------------------------------
const LS_PREFIX = "arin_checklist_";

async function initFirebase() {
  if (!isFirebaseConfigured) {
    setSyncBadge(false, "Yerel");
    return false;
  }
  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    firestore = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app = appMod.initializeApp(firebaseConfig);
    db = firestore.getFirestore(app);
    setSyncBadge(true, "Canlı");
    return true;
  } catch (e) {
    console.warn("Firebase başlatılamadı, yerel moda geçiliyor:", e);
    setSyncBadge(false, "Yerel");
    db = null;
    return false;
  }
}

// Belirli bir günü dinle (realtime). Firestore yoksa localStorage'dan oku.
function subscribeDoc(date) {
  if (state.unsub) { state.unsub(); state.unsub = null; }

  if (db) {
    const ref = firestore.doc(db, COLLECTION, date);
    state.unsub = firestore.onSnapshot(ref, (snap) => {
      state.doc = snap.exists() ? normalizeDoc(snap.data()) : blankDoc();
      if (state.view === "daily") render();
    }, (err) => {
      console.warn("Snapshot hatası:", err);
      toast("Senkronizasyon hatası");
    });
  } else {
    const raw = localStorage.getItem(LS_PREFIX + date);
    state.doc = raw ? normalizeDoc(JSON.parse(raw)) : blankDoc();
    if (state.view === "daily") render();
  }
}

function normalizeDoc(d) {
  return {
    tasks: d.tasks || {},
    sign: d.sign || { responsible: "", manager: "" },
    updatedAt: d.updatedAt || null,
  };
}

// Aktif günü kaydet (debounce'lu).
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 500);
}

async function persist() {
  state.doc.updatedAt = new Date().toISOString();
  const payload = JSON.parse(JSON.stringify(state.doc));
  if (db) {
    try {
      await firestore.setDoc(firestore.doc(db, COLLECTION, state.date), payload, { merge: true });
    } catch (e) {
      console.warn("Kaydetme hatası:", e);
      toast("Kaydedilemedi");
    }
  } else {
    localStorage.setItem(LS_PREFIX + state.date, JSON.stringify(payload));
  }
}

// Arşiv / toplu görünümler için tüm günleri getir.
async function fetchAllDays() {
  if (db) {
    try {
      const snap = await firestore.getDocs(firestore.collection(db, COLLECTION));
      const out = [];
      snap.forEach((d) => out.push({ date: d.id, ...normalizeDoc(d.data()) }));
      return out;
    } catch (e) {
      console.warn(e);
      return [];
    }
  }
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) {
      out.push({ date: k.slice(LS_PREFIX.length), ...normalizeDoc(JSON.parse(localStorage.getItem(k))) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hesaplamalar
// ---------------------------------------------------------------------------
function docStats(doc) {
  const total = totalTaskCount();
  let done = 0;
  for (const sec of TEMPLATE) {
    sec.tasks.forEach((_, i) => {
      const t = doc.tasks?.[taskKey(sec.id, i)];
      if (t?.done) done++;
    });
  }
  return { done, total, remain: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function pctColor(pct) {
  if (pct >= 80) return "#2a8568";
  if (pct >= 50) return "#e0b85e";
  return "#e08a5e";
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const content = document.getElementById("content");
const signFooter = document.getElementById("signFooter");
const progressCard = document.getElementById("progressCard");

function render() {
  document.getElementById("dateLabel").textContent = prettyDate(state.date);
  document.getElementById("datePicker").value = state.date;

  if (state.view === "daily") return renderDaily();
  if (state.view === "weekly") return renderAggregate("weekly");
  if (state.view === "monthly") return renderAggregate("monthly");
  if (state.view === "archive") return renderArchive();
}

function renderDaily() {
  progressCard.classList.remove("hidden");
  signFooter.classList.remove("hidden");

  const stats = docStats(state.doc);
  updateProgressCard(stats);

  content.innerHTML = TEMPLATE.map((sec) => {
    const rows = sec.tasks.map((title, i) => {
      const key = taskKey(sec.id, i);
      const t = state.doc.tasks[key] || {};
      const hasNote = (t.note || "").trim().length > 0;
      return `
        <div class="task ${t.done ? "done" : ""}" data-key="${key}">
          <div class="check" data-action="toggle"></div>
          <div class="task-body">
            <div class="task-title" data-action="toggle">${escapeHtml(title)}</div>
            <button class="note-toggle ${hasNote ? "has-note" : ""}" data-action="note">
              ${hasNote ? "📝 Not: " + escapeHtml(t.note.slice(0, 40)) + (t.note.length > 40 ? "…" : "") : "+ Not ekle"}
            </button>
            <textarea class="task-note hidden" data-action="noteinput" placeholder="Not yazın...">${escapeHtml(t.note || "")}</textarea>
          </div>
        </div>`;
    }).join("");

    const secStats = sectionStats(sec);
    return `
      <section class="section">
        <div class="section-head">
          <div class="section-icon ${sec.cls}">${sec.icon}</div>
          <h2>${sec.title}</h2>
          <span class="sec-count">${secStats.done}/${secStats.total}</span>
        </div>
        <div class="task-list ${sec.id === "summary" ? "summary-list" : ""}">${rows}</div>
      </section>`;
  }).join("");

  // İmza alanları
  document.getElementById("signResponsible").value = state.doc.sign.responsible || "";
  document.getElementById("signManager").value = state.doc.sign.manager || "";

  bindDailyEvents();
}

function sectionStats(sec) {
  let done = 0;
  sec.tasks.forEach((_, i) => { if (state.doc.tasks[taskKey(sec.id, i)]?.done) done++; });
  return { done, total: sec.tasks.length };
}

function bindDailyEvents() {
  content.querySelectorAll(".task").forEach((el) => {
    const key = el.dataset.key;
    el.querySelectorAll('[data-action="toggle"]').forEach((node) => {
      node.addEventListener("click", () => toggleTask(key));
    });
    const noteBtn = el.querySelector('[data-action="note"]');
    const noteInput = el.querySelector('[data-action="noteinput"]');
    noteBtn.addEventListener("click", () => {
      noteInput.classList.toggle("hidden");
      if (!noteInput.classList.contains("hidden")) noteInput.focus();
    });
    noteInput.addEventListener("input", () => {
      ensureTask(key).note = noteInput.value;
      scheduleSave();
    });
    noteInput.addEventListener("blur", () => render());
  });
}

function ensureTask(key) {
  if (!state.doc.tasks[key]) state.doc.tasks[key] = { done: false, note: "" };
  return state.doc.tasks[key];
}

function toggleTask(key) {
  const t = ensureTask(key);
  t.done = !t.done;
  scheduleSave();
  render();
}

function updateProgressCard(stats) {
  const C = 2 * Math.PI * 52;
  document.getElementById("ringFg").style.strokeDashoffset = C * (1 - stats.pct / 100);
  document.getElementById("ringFg").style.stroke = pctColor(stats.pct);
  document.getElementById("ringPct").textContent = stats.pct + "%";
  document.getElementById("doneCount").textContent = stats.done;
  document.getElementById("totalCount").textContent = stats.total;
  document.getElementById("remainCount").textContent = stats.remain;
}

// ---------- Haftalık / Aylık ----------
async function renderAggregate(kind) {
  progressCard.classList.add("hidden");
  signFooter.classList.add("hidden");
  content.innerHTML = `<div class="empty-state"><div class="big">⏳</div>Yükleniyor...</div>`;

  const all = await fetchAllDays();
  const ref = fromStr(state.date);
  let start, end, label;

  if (kind === "weekly") {
    const dow = (ref.getDay() + 6) % 7; // Pazartesi = 0
    start = new Date(ref); start.setDate(ref.getDate() - dow);
    end = new Date(start); end.setDate(start.getDate() + 6);
    label = `${start.getDate()}.${start.getMonth() + 1} – ${end.getDate()}.${end.getMonth() + 1}`;
  } else {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    label = `${months[ref.getMonth()]} ${ref.getFullYear()}`;
  }

  const sStr = toStr(start), eStr = toStr(end);
  const days = all.filter((d) => d.date >= sStr && d.date <= eStr);

  // Toplam ortalama tamamlanma
  let sumPct = 0, activeDays = 0;
  days.forEach((d) => { const st = docStats(d); if (st.done > 0) { sumPct += st.pct; activeDays++; } });
  const avg = activeDays ? Math.round(sumPct / activeDays) : 0;

  // Bölüm bazlı ortalama
  const secAgg = TEMPLATE.map((sec) => {
    let done = 0, total = 0;
    days.forEach((d) => {
      sec.tasks.forEach((_, i) => {
        total++;
        if (d.tasks?.[taskKey(sec.id, i)]?.done) done++;
      });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { sec, pct, done, total };
  });

  let html = `
    <div class="agg-range">
      <div><strong>${kind === "weekly" ? "Haftalık" : "Aylık"} Özet</strong><br><span>${label}</span></div>
      <div style="text-align:right"><strong style="font-size:26px;color:${pctColor(avg)}">${avg}%</strong><br><span>${activeDays} aktif gün</span></div>
    </div>`;

  html += secAgg.map(({ sec, pct, done, total }) => `
    <div class="bar-row">
      <div class="bar-top"><span>${sec.icon} ${sec.title}</span><b>${done}/${total} · ${pct}%</b></div>
      <div class="bar-track"><div class="bar-fill ${pct < 50 ? "low" : pct < 80 ? "mid" : ""}" style="width:${pct}%"></div></div>
    </div>`).join("");

  if (!days.length) {
    html += `<div class="empty-state"><div class="big">📭</div>Bu dönemde kayıt yok</div>`;
  }

  content.innerHTML = html;
}

// ---------- Arşiv ----------
async function renderArchive() {
  progressCard.classList.add("hidden");
  signFooter.classList.add("hidden");
  content.innerHTML = `<div class="empty-state"><div class="big">⏳</div>Yükleniyor...</div>`;

  const all = (await fetchAllDays()).sort((a, b) => b.date.localeCompare(a.date));
  if (!all.length) {
    content.innerHTML = `<div class="empty-state"><div class="big">🗂️</div>Henüz arşivlenmiş gün yok</div>`;
    return;
  }

  content.innerHTML = all.map((d) => {
    const st = docStats(d);
    return `
      <div class="archive-item" data-date="${d.date}">
        <div class="archive-pct" style="background:${pctColor(st.pct)}">${st.pct}%</div>
        <div class="archive-date">
          <strong>${prettyDate(d.date)}</strong>
          <span>${st.done}/${st.total} görev tamamlandı</span>
        </div>
        <div style="font-size:22px;color:var(--ink-soft)">›</div>
      </div>`;
  }).join("");

  content.querySelectorAll(".archive-item").forEach((el) => {
    el.addEventListener("click", () => {
      setDate(el.dataset.date);
      setView("daily");
    });
  });
}

// ---------------------------------------------------------------------------
// Navigasyon
// ---------------------------------------------------------------------------
function setView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  render();
}

function setDate(date) {
  state.date = date;
  subscribeDoc(date);
  render();
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function setSyncBadge(online, text) {
  const b = document.getElementById("syncBadge");
  b.classList.toggle("online", online);
  b.classList.toggle("offline", !online);
  b.querySelector(".sync-text").textContent = text;
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------------------------------------------------------------------------
// Olay bağlama
// ---------------------------------------------------------------------------
document.getElementById("tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) setView(tab.dataset.view);
});
document.getElementById("prevDay").addEventListener("click", () => setDate(shiftDate(state.date, -1)));
document.getElementById("nextDay").addEventListener("click", () => setDate(shiftDate(state.date, 1)));
document.getElementById("datePicker").addEventListener("change", (e) => { if (e.target.value) setDate(e.target.value); });
document.getElementById("signResponsible").addEventListener("input", (e) => { state.doc.sign.responsible = e.target.value; scheduleSave(); });
document.getElementById("signManager").addEventListener("input", (e) => { state.doc.sign.manager = e.target.value; scheduleSave(); });

// ---------------------------------------------------------------------------
// Başlat
// ---------------------------------------------------------------------------
(async function init() {
  await initFirebase();
  subscribeDoc(state.date);
  render();
})();
