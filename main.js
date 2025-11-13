// main.js (نهائي وموافق مع server.js)
const BACKEND = "https://mosa-backend-dr63.onrender.com"; // غيّره إلى رابط السيرفر عند النشر (مثلاً رابط Render)
let adminPass = null; // سيُملأ عند تسجيل الدخول (لا تترك سرًا مكشوفًا بالفرونت في الإنتاج)

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("enterBtn").addEventListener("click", onEnter);
  document.querySelectorAll(".navbar a").forEach(a => {
    a.addEventListener("click", () => showPage(a.dataset.section));
  });
  document.getElementById("backBtn").addEventListener("click", () => showPage("videosPage"));
  document.getElementById("adminLogin").addEventListener("click", onAdminLogin);

  const uploadBookForm = document.getElementById("upload-book");
  if (uploadBookForm) uploadBookForm.addEventListener("submit", onUploadBook);

  const uploadTipForm = document.getElementById("upload-tip");
  if (uploadTipForm) uploadTipForm.addEventListener("submit", onUploadTip);
});

function onEnter() {
  document.getElementById("overlay").style.display = "none";
  initializeSite();
}

function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
  showPage("videosPage");
}

/* ===== YouTube ID helper ===== */
function extractYouTubeID(url) {
  if (!url) return null;
  const patterns = [
    /v=([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/watch\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (url.length >= 11) return url.slice(-11);
  return null;
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", "");
}

/* ===== Videos (from YouTube RSS) ===== */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const container = document.getElementById("videos");
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الفيديوهات...</p>`;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    if (!res.ok) throw new Error("فشل جلب الخلاصة");
    const data = await res.json();
    const items = (data.items || []).slice(0, 50);
    if (items.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد فيديوهات حالياً.</p>";
      return;
    }
    container.innerHTML = items.map(v => {
      const id = extractYouTubeID(v.link) || extractYouTubeID(v.guid) || "";
      const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
      return `
        <div class="video">
          <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">
            ${thumb ? `<img src="${thumb}" width="340" height="200" style="border-radius:10px;border:none;">` : ""}
          </a>
          <p>${escapeHtml(v.title)}</p>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("loadVideos:", err);
    container.innerHTML = "<p style='color:#faa'>⚠️ تعذر تحميل الفيديوهات — تحقق من الاتصال.</p>";
  }
}

/* ===== Books ===== */
async function loadBooks() {
  const container = document.getElementById("book-list");
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الكتب...</p>`;
  try {
    const res = await fetch(`${BACKEND}/books`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const books = json.ok ? json.data : [];
    if (!Array.isArray(books) || books.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد كتب مضافة بعد.</p>";
      return;
    }
    const isAdmin = !!adminPass;
    container.innerHTML = books.map(b => {
      const match = (b.url || "").match(/\/d\/([^/]+)/);
      const preview = match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
      const safeTitle = escapeHtml(b.title || "بدون عنوان");
      const controls = isAdmin ? `
        <div class="tip-controls">
          <button data-id="${b.id}" class="delete-book">حذف</button>
        </div>` : "";
      return `
      <div class="book">
        <h3 style="padding:12px 10px;margin:0;">${safeTitle}</h3>
        ${preview ? `<iframe src="${preview}" width="100%" height="400" loading="lazy"></iframe>` : `<p style="color:#aaa;padding:12px;">🔗 لا يمكن عرض معاينة لهذا الرابط — <a href="${escapeAttr(b.url)}" target="_blank" rel="noopener">افتح الرابط</a></p>`}
        ${controls}
      </div>`;
    }).join("");

    document.querySelectorAll(".delete-book").forEach(btn => {
      btn.addEventListener("click", onDeleteBook);
    });
  } catch (err) {
    console.error("loadBooks:", err);
    container.innerHTML = "<p style='color:#faa'>⚠️ تعذر تحميل المكتبة.</p>";
  }
}

async function onUploadBook(e) {
  e.preventDefault();
  if (!adminPass) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const title = e.target.title.value.trim();
  const url = e.target.url.value.trim();
  if (!title || !url) return alert("أكمل الحقول المطلوبة.");
  try {
    const res = await fetch(`${BACKEND}/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pass": adminPass
      },
      body: JSON.stringify({ title, url })
    });
    const j = await res.json();
    alert(j.message || (res.ok ? "تمت الإضافة" : "فشل"));
    if (res.ok && j.ok) {
      e.target.reset();
      loadBooks();
    }
  } catch (err) {
    console.error("onUploadBook:", err);
    alert("حدث خطأ أثناء الإرسال.");
  }
}

async function onDeleteBook(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذا الكتاب نهائياً؟")) return;
  try {
    const res = await fetch(`${BACKEND}/books/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pass": adminPass || "" }
    });
    const j = await res.json();
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadBooks();
  } catch (err) {
    console.error("onDeleteBook:", err);
    alert("حدث خطأ أثناء الحذف.");
  }
}

/* ===== Tips ===== */
async function loadTips() {
  const container = document.getElementById("tip-list");
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الإرشادات...</p>`;
  try {
    const res = await fetch(`${BACKEND}/tips`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const tips = json.ok ? json.data : [];
    if (!Array.isArray(tips) || tips.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد إرشادات بعد.</p>";
      return;
    }
    container.innerHTML = tips.map(t => `
      <div class="book" style="padding:12px;text-align:right;">
        <p style="white-space:pre-line;">${escapeHtml(t.text || t)}</p>
        ${adminPass ? `<div class="tip-controls"><button data-id="${t.id}" class="delete-tip">حذف</button></div>` : ""}
      </div>
    `).join("");
    document.querySelectorAll(".delete-tip").forEach(btn => btn.addEventListener("click", onDeleteTip));
  } catch (err) {
    console.error("loadTips:", err);
    container.innerHTML = "<p style='color:#faa'>⚠️ تعذر تحميل الإرشادات.</p>";
  }
}

async function onUploadTip(e) {
  e.preventDefault();
  if (!adminPass) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const text = e.target.text.value.trim();
  if (!text) return alert("أدخل نصاً.");
  try {
    const res = await fetch(`${BACKEND}/tips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pass": adminPass
      },
      body: JSON.stringify({ text })
    });
    const j = await res.json();
    alert(j.message || (res.ok ? "تمت الإضافة" : "فشل"));
    if (res.ok && j.ok) {
      e.target.reset();
      loadTips();
    }
  } catch (err) {
    console.error("onUploadTip:", err);
    alert("فشل إرسال الإرشاد.");
  }
}

async function onDeleteTip(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذا الإرشاد؟")) return;
  try {
    const res = await fetch(`${BACKEND}/tips/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pass": adminPass || "" }
    });
    const j = await res.json();
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadTips();
  } catch (err) {
    console.error("onDeleteTip:", err);
    alert("حدث خطأ أثناء الحذف.");
  }
}

/* ===== Admin login (يحفظ كلمة المرور مؤقتًا في المتصفح) ===== */
function onAdminLogin() {
  const pass = prompt("ادخل كلمة مرور المشرف:");
  if (!pass) return;
  adminPass = pass;
  // إظهار نماذج الرفع عند نجاح الدخول محليًا (لتستعملها تختبر لاحقاً)
  document.getElementById("upload-book").style.display = "block";
  document.getElementById("upload-tip").style.display = "block";
  alert("وضع المسؤول مُفعل محلياً. ملاحظة: تحقق من الباكند فعلياً بالبيئة لتأمين كلمة السر.");
}

/* ===== UI صفحات ===== */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  const page = document.getElementById(id);
  if (page) page.classList.add("visible");

  const backBtn = document.getElementById("backBtn");
  backBtn.style.display = id === "videosPage" ? "none" : "block";
}

