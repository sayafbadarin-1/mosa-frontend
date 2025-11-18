// main.js — كامل ومفعل رفع الفيديو إلى Cloudinary (unsigned)
// متوافق مع الباك-إند القديم الذي يستخدم x-admin-pass
// تذكّر: عدّل القيم التالية إلى القيم الحقيقية لسيرفرك وحساب Cloudinary
const BACKEND = "https://mosa-backend-dr63.onrender.com"; // <-- ضع رابط سيرفرك هنا
const CLOUDINARY_CLOUD = "dkdnq0zj3";                    // <-- ضع cloud name هنا
const CLOUDINARY_PRESET = "unsigned_posts_preset";       // <-- ضع upload preset unsigned هنا

let adminPass = null;      // كلمة المرور الجارية (محلياً أثناء الجلسة)
let loggedUsername = null; // يكون "sayafbadarin" عند نجاح الدخول

/* ================= INIT ================= */
function initApp() {
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) enterBtn.addEventListener("click", onEnter);

  document.querySelectorAll(".navbar a").forEach(a => a.addEventListener("click", () => showPage(a.dataset.section)));
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => showPage("videosPage"));

  // corner login button
  const corner = document.getElementById("cornerLogin");
  if (corner) corner.addEventListener("click", onAdminToggle);

  // login modal
  const loginCancel = document.getElementById("loginCancel");
  if (loginCancel) loginCancel.addEventListener("click", closeLoginModal);
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", onLoginSubmit);

  // admin panel buttons
  const closeAdmin = document.getElementById("closeAdminPanel");
  if (closeAdmin) closeAdmin.addEventListener("click", closeAdminPanel);
  const panelLogout = document.getElementById("panelLogout");
  if (panelLogout) panelLogout.addEventListener("click", onPanelLogout);

  // upload forms
  const uploadBookForm = document.getElementById("upload-book");
  if (uploadBookForm) uploadBookForm.addEventListener("submit", onUploadBook);
  const uploadTipForm = document.getElementById("upload-tip");
  if (uploadTipForm) uploadTipForm.addEventListener("submit", onUploadTip);
  const uploadPostForm = document.getElementById("upload-post");
  if (uploadPostForm) uploadPostForm.addEventListener("submit", onUploadPost);

  // channels
  const tg = document.getElementById("tgBtn"); if (tg) tg.href = "https://t.me/musaahmadkh";
  const wa = document.getElementById("waBtn"); if (wa) wa.href = "https://chat.whatsapp.com/JaAji0WfEat8dVI1CPB4c1?mode=hqrt1";

  // default dark
  document.body.classList.remove("light");
  document.body.classList.add("dark");

  // restore session username if any
  const stored = sessionStorage.getItem("adm_username");
  if (stored) loggedUsername = stored;

  updateAdminUI();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
else initApp();

/* ================= Overlay / Initialization content ================= */
function onEnter() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";
  initializeSite();
}
function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
  loadPosts();
  showPage("videosPage");
}

/* ================= Admin UI / Login ================= */
function onAdminToggle() {
  if (adminPass) {
    if (!confirm("هل تريد تسجيل الخروج من وضع المسؤول؟")) return;
    adminPass = null; loggedUsername = null;
    sessionStorage.removeItem("adm_username");
    updateAdminUI();
    alert("تم تسجيل الخروج.");
    return;
  }
  const modal = document.getElementById("loginModal");
  if (modal) modal.classList.remove("hidden");
}
function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.classList.add("hidden");
  const msg = document.getElementById("loginMsg"); if (msg) msg.textContent = "";
}

// تسجيل الدخول: لقبول المشرف الوحيد sayafbadarin، التحقق من كلمة المرور عبر x-admin-pass
async function onLoginSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const username = (f.username.value || "").trim();
  const password = (f.password.value || "").trim();
  const msgEl = document.getElementById("loginMsg");

  if (!username || !password) { if (msgEl) msgEl.textContent = "أكمل الحقول"; return; }

  // قبول فقط للمشرف الرئيسي — رفض صامت إن الاسم غير مطابق
  if (username !== "sayafbadarin") {
    // رفض صامت كما طلبت — لا رسالة.
    return;
  }

  // تحقق كلمة المرور عبر الباك إند: نطلب /books مع الهيدر x-admin-pass
  try {
    const res = await fetch(`${BACKEND}/books`, { headers: { "x-admin-pass": password } });
    if (!res.ok) {
      if (msgEl) msgEl.textContent = "❌ كلمة المرور غير صحيحة";
      return;
    }
    // دخول ناجح
    adminPass = password;
    loggedUsername = username;
    sessionStorage.setItem("adm_username", username);
    updateAdminUI();
    closeLoginModal();
    alert("تم تسجيل الدخول كمشرف رئيسي.");
  } catch (err) {
    console.error("login err", err);
    if (msgEl) msgEl.textContent = "خطأ بالاتصال";
  }
}

function updateAdminUI() {
  const adminBtn = document.getElementById("cornerLogin");
  const uploadBook = document.getElementById("upload-book");
  const uploadTip = document.getElementById("upload-tip");
  const uploadPost = document.getElementById("upload-post");
  const adminPlaceholder = document.getElementById("adminAreaPlaceholder");
  const storedUser = sessionStorage.getItem("adm_username");

  if (uploadBook) uploadBook.style.display = "none";
  if (uploadTip) uploadTip.style.display = "none";
  if (uploadPost) uploadPost.style.display = "none";
  if (adminPlaceholder) adminPlaceholder.innerHTML = "";

  if (adminPass && storedUser === "sayafbadarin") {
    if (adminBtn) { adminBtn.textContent = "تسجيل خروج"; adminBtn.title = "تسجيل خروج المشرف"; }

    // إظهار نماذج الرفع
    if (uploadBook) uploadBook.style.display = "block";
    if (uploadTip) uploadTip.style.display = "block";
    if (uploadPost) uploadPost.style.display = "block";

    // أزرار الفوتر للادمن
    if (adminPlaceholder) {
      adminPlaceholder.innerHTML = `<button id="openAdminPanel">لوحة الإدارة</button> <button id="footerLogout">تسجيل خروج</button>`;
      const openBtn = document.getElementById("openAdminPanel");
      if (openBtn) openBtn.addEventListener("click", openAdminPanel);
      const footerLogout = document.getElementById("footerLogout");
      if (footerLogout) footerLogout.addEventListener("click", () => {
        if (confirm("هل تريد تسجيل الخروج؟")) { adminPass = null; loggedUsername = null; sessionStorage.removeItem("adm_username"); updateAdminUI(); alert("تم تسجيل الخروج."); }
      });
    }
  } else {
    if (adminBtn) { adminBtn.textContent = "🔒"; adminBtn.title = "تسجيل دخول المشرف"; }
  }
}

function openAdminPanel() {
  const storedUser = sessionStorage.getItem("adm_username");
  if (!adminPass || storedUser !== "sayafbadarin") { alert("ليس لديك الصلاحية"); return; }
  const panel = document.getElementById("adminPanel");
  if (panel) panel.classList.remove("hidden");
}
function closeAdminPanel() {
  const panel = document.getElementById("adminPanel");
  if (panel) panel.classList.add("hidden");
}
function onPanelLogout() {
  if (!confirm("هل تريد تسجيل الخروج؟")) return;
  adminPass = null; loggedUsername = null;
  sessionStorage.removeItem("adm_username");
  updateAdminUI();
  alert("تم تسجيل الخروج.");
}

/* ================= Change global password (server) ================= */
async function onChangeGlobalPass(e) {
  e.preventDefault();
  if (!adminPass) return alert("يجب تسجيل الدخول أولاً.");
  const f = e.target;
  const current = (f.currentPassword.value||"").trim();
  const neo = (f.newPassword.value||"").trim();
  if (!current || !neo) return alert("أكمل الحقول");
  if (neo.length < 4) return alert("كلمة قصيرة");
  try {
    const res = await fetch(`${BACKEND}/admin/change-password`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-admin-pass": current },
      body: JSON.stringify({ newPassword: neo })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل");
    alert("تم تغيير كلمة المرور على الخادم");
    f.reset();
  } catch (err) {
    console.error(err);
    alert("خطأ بالاتصال");
  }
}

/* ================= Helpers ================= */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("\n",""); }

/* ================= Videos (rss) - Enhanced: try rss2json then fallback to /youtube-feed proxy ================= */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const RSS2JSON = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

  const container = document.getElementById("videos");
  if (!container) return;
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الفيديوهات...</p>`;

  function showError(msg) {
    container.innerHTML = `<p style="color:#faa">⚠️ ${escapeHtml(msg)}</p>
      <p style="color:#aaa">يمكنك فتح القناة يدوياً: <a href="https://www.youtube.com/channel/${CHANNEL_ID}" target="_blank" rel="noopener noreferrer">افتح القناة</a></p>`;
  }

  function renderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد فيديوهات حالياً.</p>";
      return;
    }
    container.innerHTML = items.map(v => {
      const link = v.link || v.guid || "";
      const id = extractYouTubeID(link) || extractYouTubeID(v.enclosure && v.enclosure.link) || "";
      const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
      const title = v.title || (v["media:group"] && v["media:group"]["media:title"]) || "بدون عنوان";
      return `
        <div class="video">
          <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">
            ${thumb ? `<img src="${thumb}" width="340" height="200" loading="lazy">` : ""}
          </a>
          <p>${escapeHtml(title)}</p>
        </div>`;
    }).join("");
  }

  // 1) try rss2json
  try {
    const res = await fetch(RSS2JSON, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json().catch(()=>null);
      if (json && Array.isArray(json.items)) {
        renderItems(json.items.slice(0,50));
        return;
      }
    } else {
      console.warn("rss2json failed status:", res.status);
    }
  } catch (err) {
    console.warn("rss2json error:", err);
  }

  // 2) fallback to server proxy /youtube-feed
  try {
    const proxyUrl = `${BACKEND.replace(/\/$/,'')}/youtube-feed?channelId=${encodeURIComponent(CHANNEL_ID)}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) {
      showError("تعذر جلب الخلاصة من الخادم الوسيط. حاول إعادة المحاولة لاحقاً.");
      return;
    }
    const xmlText = await proxyRes.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const entries = Array.from(doc.querySelectorAll("entry"));
    if (entries.length === 0) {
      showError("لم نتمكن من استخراج الفيديوهات من خلاصة يوتيوب.");
      return;
    }
    const items = entries.map(en => {
      const title = en.querySelector("title")?.textContent || "";
      const linkEl = en.querySelector("link[rel='alternate']");
      const link = linkEl ? linkEl.getAttribute("href") : (en.querySelector("link")?.textContent || "");
      return { title, link };
    });
    renderItems(items);
    return;
  } catch (err) {
    console.error("fallback youtube-feed error:", err);
    showError("حدث خطأ أثناء محاولة جلب الفيديوهات (راجع Console).");
    return;
  }
}

function extractYouTubeID(url) {
  if (!url) return null;
  const patterns = [/v=([a-zA-Z0-9_-]{11})/, /\/embed\/([a-zA-Z0-9_-]{11})/, /youtu\.be\/([a-zA-Z0-9_-]{11})/, /\/watch\/([a-zA-Z0-9_-]{11})/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (url.length >= 11) return url.slice(-11);
  return null;
}

/* ================= Books (CRUD) ================= */
async function loadBooks(){
  const c = document.getElementById("book-list");
  if (!c) return;
  c.innerHTML = `<p style="color:#aaa">جارٍ تحميل الكتب...</p>`;
  try {
    const res = await fetch(`${BACKEND}/books`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const books = json.ok ? json.data : [];
    if (!Array.isArray(books) || books.length === 0) {
      c.innerHTML = "<p style='color:#aaa'>لا توجد كتب مضافة بعد.</p>";
      return;
    }
    const isAdmin = !!adminPass;
    c.innerHTML = books.map(b => {
      const match = (b.url || "").match(/\/d\/([^/]+)/);
      const preview = match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
      const safeTitle = escapeHtml(b.title || "بدون عنوان");
      const controls = isAdmin ? `<div class="tip-controls"><button data-id="${b.id}" class="delete-book">حذف</button></div>` : "";
      return `
      <div class="book">
        <h3 style="padding:12px 10px;margin:0;">${safeTitle}</h3>
        ${preview ? `<iframe src="${preview}" width="100%" height="400" loading="lazy"></iframe>` : `<p style="color:#aaa;padding:12px;">🔗 لا يمكن عرض معاينة لهذا الرابط — <a href="${escapeAttr(b.url)}" target="_blank" rel="noopener">افتح الرابط</a></p>`}
        ${controls}
      </div>`;
    }).join("");
    document.querySelectorAll(".delete-book").forEach(btn => btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (!confirm("هل تريد حذف هذا الكتاب نهائياً؟")) return;
      try {
        const res = await fetch(`${BACKEND}/books/${id}`, { method: "DELETE", headers: { "x-admin-pass": adminPass || "" } });
        const j = await res.json().catch(()=>({}));
        if (!res.ok) return alert(j.message || "فشل الحذف");
        alert(j.message || "تم الحذف");
        loadBooks();
      } catch { alert("فشل الحذف"); }
    }));
  } catch (err) {
    console.error(err);
    c.innerHTML = "<p style='color:#faa'>⚠️ تعذر تحميل المكتبة.</p>";
  }
}
async function onUploadBook(e){
  e.preventDefault();
  if (!adminPass) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const title = e.target.title.value.trim();
  const url = e.target.url.value.trim();
  if (!title || !url) return alert("أكمل الحقول المطلوبة.");
  try {
    const res = await fetch(`${BACKEND}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
      body: JSON.stringify({ title, url })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الإرسال");
    alert(j.message || "تمت الإضافة");
    e.target.reset();
    loadBooks();
  } catch { alert("حدث خطأ أثناء الإرسال."); }
}

/* ================= Tips ================= */
async function loadTips() {
  const container = document.getElementById("tip-list");
  if (!container) return;
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
    const isAdmin = !!adminPass;
    container.innerHTML = tips.map(t => `
      <div class="book" style="padding:12px;text-align:right;">
        <p id="tip-text-${t.id}" style="white-space:pre-line;">${escapeHtml(t.text || t)}</p>
        ${isAdmin ? `<div class="tip-controls"><button data-id="${t.id}" class="edit-tip">تعديل</button><button data-id="${t.id}" class="delete-tip">حذف</button></div>` : ""}
      </div>
    `).join("");
    document.querySelectorAll(".edit-tip").forEach(btn => btn.addEventListener("click", onEditTip));
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
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
      body: JSON.stringify({ text })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الإضافة.");
    alert(j.message || "تمت الإضافة");
    e.target.reset(); loadTips();
  } catch { alert("فشل إرسال الإرشاد."); }
}
async function onEditTip(e) {
  const id = e.currentTarget.dataset.id;
  const currentEl = document.getElementById(`tip-text-${id}`);
  const currentText = currentEl ? currentEl.textContent.trim() : "";
  const newText = prompt("حرّر الإرشاد ثم اضغط موافق:", currentText);
  if (newText === null) return;
  if (newText.trim().length === 0) return alert("النص لا يمكن أن يكون فارغاً.");
  try {
    const res = await fetch(`${BACKEND}/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass || "" },
      body: JSON.stringify({ text: newText.trim() })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تعديل الإرشاد.");
    if (currentEl) currentEl.textContent = newText.trim();
    alert(j.message || "تم تعديل الإرشاد.");
  } catch { alert("حدث خطأ أثناء التعديل."); }
}
async function onDeleteTip(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذا الإرشاد؟")) return;
  try {
    const res = await fetch(`${BACKEND}/tips/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pass": adminPass || "" }
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الحذف.");
    alert(j.message || "تم الحذف");
    loadTips();
  } catch { alert("حدث خطأ أثناء الحذف."); }
}

/* ================= Posts (with Cloudinary upload) ================= */

// رفع ملف إلى Cloudinary (unsigned upload)
// يعيد JSON من Cloudinary أو يرمي خطأ
async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) throw new Error("يرجى ضبط إعدادات Cloudinary في main.js");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  // resource_type للـvideo عادة يحدد تلقائياً من Cloudinary, لكن إذا احتجت force: fd.append('resource_type','video');
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error("فشل رفع الملف إلى Cloudinary. " + (txt || res.status));
  }
  return res.json();
}

async function loadPosts() {
  const container = document.getElementById("post-list");
  if (!container) return;
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل المشاركات...</p>`;
  try {
    const res = await fetch(`${BACKEND}/posts`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const posts = json.ok ? json.data : [];
    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد مشاركات بعد.</p>";
      return;
    }
    const isAdmin = !!adminPass;
    container.innerHTML = posts.map(p => {
      const safeTitle = escapeHtml(p.title || "بدون عنوان");
      const safeDesc = escapeHtml(p.description || "");
      const videoEmbed = p.videoUrl ? `<video controls src="${escapeAttr(p.videoUrl)}" style="width:100%;max-height:360px;border-radius:8px;" preload="metadata"></video>` : `<p style="color:#aaa">لا يوجد فيديو</p>`;
      const controls = isAdmin ? `<div class="tip-controls"><button data-id="${p.id}" class="edit-post">تعديل</button><button data-id="${p.id}" class="delete-post">حذف</button></div>` : "";
      return `
        <div class="book" style="padding:12px;text-align:right;">
          <h3 style="margin:0 0 8px 0;padding:0;">${safeTitle}</h3>
          ${videoEmbed}
          <p style="white-space:pre-line;margin-top:8px;">${safeDesc}</p>
          ${controls}
        </div>
      `;
    }).join("");
    document.querySelectorAll(".edit-post").forEach(btn => btn.addEventListener("click", onEditPost));
    document.querySelectorAll(".delete-post").forEach(btn => btn.addEventListener("click", onDeletePost));
  } catch (err) {
    console.error("loadPosts:", err);
    container.innerHTML = "<p style='color:#faa'>⚠️ تعذر تحميل المشاركات.</p>";
  }
}

async function onUploadPost(e) {
  e.preventDefault();
  if (!adminPass) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const title = e.target.title.value.trim();
  const description = e.target.description.value.trim();
  const fileInput = e.target.videoFile;

  if (!title) return alert("الرجاء إدخال عنوان المشاركة.");

  try {
    let videoUrl = "";

    // 1) إذا اختر ملف — ارفعه إلى Cloudinary
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // (اختياري) تحقق على الحجم — غير الحد لو أردت
      const maxMB = 500; // أقصى حجم مسموح في المتصفح قبل تحذير
      if (file.size > maxMB * 1024 * 1024) {
        if (!confirm(`الملف كبير (${Math.round(file.size/1024/1024)}MB). تود المتابعة والرفع؟`)) return;
      }

      // اعرض حالة مؤقتة على الزر
      const submitBtn = e.target.querySelector("button[type='submit']");
      const oldText = submitBtn ? submitBtn.textContent : null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "جارٍ الرفع..."; }

      const upRes = await uploadToCloudinary(file);
      videoUrl = upRes.secure_url || upRes.url || "";
      if (!videoUrl) throw new Error("لم نحصل على رابط الفيديو من Cloudinary");

      if (submitBtn) { submitBtn.disabled = false; if (oldText) submitBtn.textContent = oldText; }
    } else {
      // 2) لا ملف => طلب رابط من المستخدم (خيار بديل)
      const inputUrl = prompt("أدخل رابط الفيديو (مثال رابط Cloudinary أو CDN أو YouTube):", "");
      if (inputUrl === null) return; // ألغى
      videoUrl = (inputUrl || "").trim();
    }

    // 3) إرسال المشاركة للباك-إند
    const res = await fetch(`${BACKEND}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
      body: JSON.stringify({ title, description, videoUrl })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) {
      alert(j.message || "فشل حفظ المشاركة على الخادم.");
      return;
    }
    alert(j.message || "تمت إضافة المشاركة.");
    e.target.reset();
    loadPosts();
  } catch (err) {
    console.error("onUploadPost error:", err);
    alert("حدث خطأ أثناء رفع المشاركة: " + (err.message || err));
  }
}

async function onDeletePost(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذه المشاركة؟")) return;
  try {
    const res = await fetch(`${BACKEND}/posts/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pass": adminPass || "" }
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الحذف");
    alert(j.message || "تم الحذف");
    loadPosts();
  } catch { alert("حدث خطأ أثناء الحذف."); }
}

async function onEditPost(e) {
  const id = e.currentTarget.dataset.id;
  const currentTitle = prompt("ادخل العنوان الجديد (اتركه فارغاً إن لم تغير):", "");
  if (currentTitle === null) return;
  const currentDesc = prompt("ادخل الوصف الجديد (اتركه فارغاً إن لم تغير):", "");
  if (currentDesc === null) return;
  const newVideoUrl = prompt("إذا أردت تغيير فيديو المشاركة: الصق رابط الفيديو الجديد (أو اتركه فارغاً):", "");
  try {
    const payload = {};
    if ((currentTitle || "").trim().length) payload.title = currentTitle.trim();
    if ((currentDesc || "").trim().length) payload.description = currentDesc.trim();
    if ((newVideoUrl || "").trim().length) payload.videoUrl = newVideoUrl.trim();
    if (Object.keys(payload).length === 0) return alert("لم تغيّر أي شيء.");
    const res = await fetch(`${BACKEND}/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass || "" },
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تعديل المشاركة.");
    alert(j.message || "تم تعديل المشاركة.");
    loadPosts();
  } catch { alert("حدث خطأ أثناء التعديل."); }
}

/* ================= Navigation helper ================= */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  const page = document.getElementById(id);
  if (page) page.classList.add("visible");
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.style.display = id === "videosPage" ? "none" : "block";
}
