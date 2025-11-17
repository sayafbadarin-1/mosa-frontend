// main.js (نهائي): token auth, superadmin-only admin button, force dark theme, logout for admins
// ⚠️ عدِّل BACKEND إلى سيرفرك (مثلاً http://localhost:4000 أثناء التطوير)
const BACKEND = "https://mosa-backend-dr63.onrender.com";
let authToken = localStorage.getItem("authToken") || null;
let currentRole = localStorage.getItem("currentRole") || null;
let currentUsername = localStorage.getItem("currentUsername") || null;

// --- Cloudinary config (ضع القيم الحقيقية إن رغبت بالرفع مباشرة) ---
const CLOUDINARY_CLOUD = "dkdnq0zj3";
const CLOUDINARY_PRESET = "unsigned_posts_preset";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("enterBtn").addEventListener("click", onEnter);
  document.querySelectorAll(".navbar a").forEach(a => a.addEventListener("click", () => showPage(a.dataset.section)));
  document.getElementById("backBtn").addEventListener("click", () => showPage("videosPage"));

  document.getElementById("cornerLogin").addEventListener("click", openLoginModal);
  // themeToggle hidden in HTML

  document.getElementById("loginCancel").addEventListener("click", closeLoginModal);
  document.getElementById("loginForm").addEventListener("submit", onLoginSubmit);

  document.getElementById("closeAdminPanel").addEventListener("click", closeAdminPanel);
  document.getElementById("createAdminForm").addEventListener("submit", onCreateAdmin);
  document.getElementById("changeOwnPassForm").addEventListener("submit", onChangeOwnPassword);

  // logout inside panel
  document.getElementById("panelLogout").addEventListener("click", () => {
    if (!confirm("هل تريد تسجيل الخروج؟")) return;
    logout();
  });

  const uploadBookForm = document.getElementById("upload-book");
  if (uploadBookForm) uploadBookForm.addEventListener("submit", onUploadBook);
  const uploadTipForm = document.getElementById("upload-tip");
  if (uploadTipForm) uploadTipForm.addEventListener("submit", onUploadTip);
  const uploadPostForm = document.getElementById("upload-post");
  if (uploadPostForm) uploadPostForm.addEventListener("submit", onUploadPost);

  document.getElementById("tgBtn").href = "https://t.me/musaahmadkh";
  document.getElementById("waBtn").href = "https://chat.whatsapp.com/JaAji0WfEat8dVI1CPB4c1?mode=hqrt1";

  // force dark theme
  forceDarkTheme();

  updateCornerUI();
  // site loads after overlay dismissed
});

function onEnter() {
  document.getElementById("overlay").style.display = "none";
  initializeSite();
}
function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
  loadPosts();
  showPage("videosPage");
  if (authToken) fetchMe();
}

/* ===== Theme: force dark only ===== */
function forceDarkTheme() {
  document.body.classList.remove("light");
  document.body.classList.add("dark");
  try { localStorage.setItem("theme", "dark"); } catch (e) {}
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.style.display = "none";
}

/* ===== Auth UI and placeholders ===== */
function updateCornerUI() {
  const lbtn = document.getElementById("cornerLogin");
  if (authToken) {
    lbtn.textContent = "●";
    lbtn.classList.add("logged");
    if (currentRole === "superadmin") {
      ensureAdminPlaceholderForSuperadmin();
    } else {
      ensureLogoutPlaceholderForAdmin();
    }
  } else {
    lbtn.textContent = "🔒";
    lbtn.classList.remove("logged");
    removeAdminPlaceholder();
  }
}
function ensureAdminPlaceholderForSuperadmin() {
  const ph = document.getElementById("adminAreaPlaceholder");
  ph.innerHTML = `
    <button id="openAdminPanel" class="admin-open-btn">لوحة الإدارة</button>
    <button id="footerLogout" class="admin-logout-foot">تسجيل خروج</button>
  `;
  document.getElementById("openAdminPanel").addEventListener("click", openAdminPanel);
  document.getElementById("footerLogout").addEventListener("click", () => {
    if (!confirm("هل تريد تسجيل الخروج؟")) return;
    logout();
  });
}
function ensureLogoutPlaceholderForAdmin() {
  const ph = document.getElementById("adminAreaPlaceholder");
  ph.innerHTML = `
    <button id="footerLogout" class="admin-logout-foot">تسجيل خروج</button>
  `;
  document.getElementById("footerLogout").addEventListener("click", () => {
    if (!confirm("هل تريد تسجيل الخروج؟")) return;
    logout();
  });
}
function removeAdminPlaceholder() {
  const ph = document.getElementById("adminAreaPlaceholder");
  ph.innerHTML = "";
}

function openLoginModal() {
  if (authToken) return openAdminPanel();
  const modal = document.getElementById("loginModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.querySelector("#loginForm input[name='username']").focus();
}
function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("loginMsg").textContent = "";
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const username = f.username.value.trim();
  const password = f.password.value.trim();
  if (!username || !password) return showLoginMsg("أدخل اسم المستخدم وكلمة المرور.");
  try {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return showLoginMsg(j.message || "فشل تسجيل الدخول.");
    authToken = j.token;
    currentRole = j.role;
    currentUsername = j.username;
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("currentRole", currentRole);
    localStorage.setItem("currentUsername", currentUsername);
    updateCornerUI();
    closeLoginModal();
    alert("تم تسجيل الدخول.");
    if (currentRole === "superadmin") showSuperadminControls();
    else hideSuperadminControls();
    showAdminUploadForms();
    fetchMe();
  } catch (err) {
    console.error("login error:", err);
    showLoginMsg("حدث خطأ أثناء الاتصال بالخادم.");
  }
}
function showLoginMsg(m) { document.getElementById("loginMsg").textContent = m; }

function logout() {
  authToken = null;
  currentRole = null;
  currentUsername = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentRole");
  localStorage.removeItem("currentUsername");
  updateCornerUI();
  hideSuperadminControls();
  hideAdminPanel();
  hideAdminUploadForms();
  alert("تم تسجيل الخروج.");
}

/* fetch /auth/me */
async function fetchMe() {
  try {
    const res = await fetch(`${BACKEND}/auth/me`, { headers: { "x-auth-token": authToken }});
    if (!res.ok) { console.warn("token invalid, logging out"); logout(); return; }
    const j = await res.json();
    currentRole = j.role;
    currentUsername = j.username;
    localStorage.setItem("currentRole", currentRole);
    localStorage.setItem("currentUsername", currentUsername);
    if (currentRole === "superadmin") showSuperadminControls();
    else hideSuperadminControls();
    showAdminUploadForms();
    updateCornerUI();
  } catch (err) { console.error("fetchMe:", err); }
}

/* ===== Admin Panel (superadmin parts) ===== */
function openAdminPanel() {
  document.getElementById("adminPanel").classList.remove("hidden");
  document.getElementById("adminPanel").setAttribute("aria-hidden", "false");
  if (currentRole === "superadmin") {
    document.getElementById("superadminControls").style.display = "block";
    loadUsersList();
  } else {
    document.getElementById("superadminControls").style.display = "none";
  }
}
function closeAdminPanel() {
  document.getElementById("adminPanel").classList.add("hidden");
  document.getElementById("adminPanel").setAttribute("aria-hidden", "true");
}
function hideAdminPanel() { closeAdminPanel(); }

function showSuperadminControls() {
  const el = document.getElementById("superadminControls");
  if (el) el.style.display = "block";
}
function hideSuperadminControls() {
  const el = document.getElementById("superadminControls");
  if (el) el.style.display = "none";
}

function showAdminUploadForms() {
  document.getElementById("upload-book").style.display = (currentRole === "admin" || currentRole === "superadmin") ? "block" : "none";
  document.getElementById("upload-tip").style.display = (currentRole === "admin" || currentRole === "superadmin") ? "block" : "none";
  document.getElementById("upload-post").style.display = (currentRole === "admin" || currentRole === "superadmin") ? "block" : "none";
}
function hideAdminUploadForms() {
  document.getElementById("upload-book").style.display = "none";
  document.getElementById("upload-tip").style.display = "none";
  document.getElementById("upload-post").style.display = "none";
}

/* create admin (superadmin) */
async function onCreateAdmin(e) {
  e.preventDefault();
  if (currentRole !== "superadmin") return alert("ليس لديك الصلاحية.");
  const f = e.target;
  const username = f.newUsername.value.trim();
  const password = f.newPassword.value.trim();
  const role = f.newRole.value;
  if (!username || !password) return alert("أكمل الحقول المطلوبة.");
  try {
    const res = await fetch(`${BACKEND}/auth/create-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ username, password, role })
    });
    const j = await res.json();
    if (!res.ok) return alert(j.message || "فشل الإنشاء.");
    alert(j.message || "تم إنشاء المستخدم.");
    f.reset();
    loadUsersList();
  } catch (err) {
    console.error("createAdmin:", err);
    alert("حدث خطأ أثناء الإنشاء.");
  }
}

/* load users list (superadmin) */
async function loadUsersList() {
  try {
    const res = await fetch(`${BACKEND}/auth/users`, { headers: { "x-auth-token": authToken }});
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      document.getElementById("usersList").innerHTML = `<div class="muted">غير متاح: ${j.message || res.status}</div>`;
      return;
    }
    const users = j.data || [];
    if (!users.length) {
      document.getElementById("usersList").innerHTML = `<div class="muted">لا يوجد مستخدمون</div>`;
      return;
    }
    document.getElementById("usersList").innerHTML = users.map(u => {
      return `
        <div class="user-row">
          <div class="user-info"><strong>${escapeHtml(u.username)}</strong> — ${escapeHtml(u.role)}</div>
          <div class="user-actions">
            <button data-user="${escapeAttr(u.username)}" class="btn-change-pass">تغيير كلمة المرور</button>
          </div>
        </div>
      `;
    }).join("");
    document.querySelectorAll(".btn-change-pass").forEach(b => b.addEventListener("click", onSuperChangePassword));
  } catch (err) {
    console.error("loadUsersList:", err);
    document.getElementById("usersList").innerHTML = `<div class="muted">خطأ أثناء جلب المستخدمين.</div>`;
  }
}

/* superadmin changes other user's password */
async function onSuperChangePassword(e) {
  const username = e.currentTarget.dataset.user;
  const newPass = prompt(`أدخل كلمة المرور الجديدة للمستخدم ${username}:`);
  if (newPass === null) return;
  if (newPass.length < 4) return alert("يجب أن تكون كلمة المرور 4 أحرف على الأقل.");
  try {
    const res = await fetch(`${BACKEND}/auth/change-password/${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ newPassword: newPass })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return alert(j.message || "فشل تغيير كلمة المرور.");
    alert(j.message || "تم تغيير كلمة المرور للمستخدم.");
  } catch (err) {
    console.error("super change pass:", err);
    alert("حدث خطأ.");
  }
}

/* change own password (any admin) */
async function onChangeOwnPassword(e) {
  e.preventDefault();
  const f = e.target;
  const currentPassword = f.currentPassword.value.trim();
  const newPassword = f.newPassword.value.trim();
  if (!currentPassword || !newPassword) return alert("أكمل الحقول المطلوبة.");
  if (newPassword.length < 4) return alert("كلمة المرور قصيرة جداً.");
  try {
    const res = await fetch(`${BACKEND}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تغيير كلمة المرور.");
    alert(j.message || "تم تغيير كلمة المرور.");
    f.reset();
  } catch (err) {
    console.error("change own pass:", err);
    alert("حدث خطأ أثناء تغيير كلمة المرور.");
  }
}

/* ===== helpers ===== */
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
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll("\n", ""); }

/* ===== Videos ===== */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const container = document.getElementById("videos");
  container.innerHTML = `<p class="muted">جارٍ تحميل الفيديوهات...</p>`;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    if (!res.ok) throw new Error("فشل جلب الخلاصة");
    const data = await res.json();
    const items = (data.items || []).slice(0, 50);
    if (items.length === 0) {
      container.innerHTML = "<p class='muted'>لا توجد فيديوهات حالياً.</p>";
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
    container.innerHTML = "<p class='warn'>⚠️ تعذر تحميل الفيديوهات — تحقق من الاتصال.</p>";
  }
}

/* ===== Books ===== */
async function loadBooks() {
  const container = document.getElementById("book-list");
  container.innerHTML = `<p class="muted">جارٍ تحميل الكتب...</p>`;
  try {
    const res = await fetch(`${BACKEND}/books`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const books = json.ok ? json.data : [];
    if (!Array.isArray(books) || books.length === 0) {
      container.innerHTML = "<p class='muted'>لا توجد كتب مضافة بعد.</p>";
      return;
    }
    const isAdmin = !!authToken;
    container.innerHTML = books.map(b => {
      const match = (b.url || "").match(/\/d\/([^/]+)/);
      const preview = match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
      const safeTitle = escapeHtml(b.title || "بدون عنوان");
      const controls = isAdmin ? `<div class="tip-controls"><button data-id="${b.id}" class="delete-book">حذف</button></div>` : "";
      return `
      <div class="book">
        <h3 style="padding:12px 10px;margin:0;color:var(--gold)"> ${safeTitle} </h3>
        ${preview ? `<iframe src="${preview}" width="100%" height="400" loading="lazy"></iframe>` : `<p class="muted" style="padding:12px;">🔗 لا يمكن عرض معاينة — <a href="${escapeAttr(b.url)}" target="_blank" rel="noopener">افتح الرابط</a></p>`}
        ${controls}
      </div>`;
    }).join("");
    document.querySelectorAll(".delete-book").forEach(btn => btn.addEventListener("click", onDeleteBook));
  } catch (err) {
    console.error("loadBooks:", err);
    container.innerHTML = "<p class='warn'>⚠️ تعذر تحميل المكتبة.</p>";
  }
}
async function onUploadBook(e) {
  e.preventDefault();
  if (!authToken) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const title = e.target.title.value.trim();
  const url = e.target.url.value.trim();
  if (!title || !url) return alert("أكمل الحقول المطلوبة.");
  const payload = { title, url };
  try {
    const res = await fetch(`${BACKEND}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل إضافة الكتاب.");
    alert(j.message || "تمت إضافة الكتاب بنجاح");
    e.target.reset();
    loadBooks();
  } catch (err) {
    console.error("onUploadBook error:", err);
    alert("حدث خطأ أثناء الإرسال.");
  }
}
async function onDeleteBook(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذا الكتاب نهائياً؟")) return;
  try {
    const res = await fetch(`${BACKEND}/books/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": authToken || "" }
    });
    const j = await res.json().catch(()=>({}));
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
  container.innerHTML = `<p class="muted">جارٍ تحميل الإرشادات...</p>`;
  try {
    const res = await fetch(`${BACKEND}/tips`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const tips = json.ok ? json.data : [];
    if (!Array.isArray(tips) || tips.length === 0) {
      container.innerHTML = "<p class='muted'>لا توجد إرشادات بعد.</p>";
      return;
    }
    const isAdmin = !!authToken;
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
    container.innerHTML = "<p class='warn'>⚠️ تعذر تحميل الإرشادات.</p>";
  }
}
async function onUploadTip(e) {
  e.preventDefault();
  if (!authToken) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const text = e.target.text.value.trim();
  if (!text) return alert("أدخل نصاً.");
  try {
    const res = await fetch(`${BACKEND}/tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ text })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الإضافة.");
    alert(j.message || "تمت الإضافة");
    if (res.ok) {
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
      headers: { "x-auth-token": authToken || "" }
    });
    const j = await res.json().catch(()=>({}));
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadTips();
  } catch (err) {
    console.error("onDeleteTip:", err);
    alert("حدث خطأ أثناء الحذف.");
  }
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
      headers: { "Content-Type": "application/json", "x-auth-token": authToken || "" },
      body: JSON.stringify({ text: newText.trim() })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تعديل الإرشاد.");
    if (currentEl) currentEl.textContent = newText.trim();
    alert(j.message || "تم تعديل الإرشاد.");
  } catch (err) {
    console.error("onEditTip:", err);
    alert("حدث خطأ أثناء التعديل.");
  }
}

/* ===== Posts ===== */
async function loadPosts() {
  const container = document.getElementById("post-list");
  container.innerHTML = `<p class="muted">جارٍ تحميل المشاركات...</p>`;
  try {
    const res = await fetch(`${BACKEND}/posts`);
    if (!res.ok) throw new Error("شبكة");
    const json = await res.json();
    const posts = json.ok ? json.data : [];
    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = "<p class='muted'>لا توجد مشاركات بعد.</p>";
      return;
    }
    const isAdmin = !!authToken;
    container.innerHTML = posts.map(p => {
      const safeTitle = escapeHtml(p.title || "بدون عنوان");
      const safeDesc = escapeHtml(p.description || "");
      const videoEmbed = p.videoUrl ? `<video controls src="${escapeAttr(p.videoUrl)}" style="width:100%;max-height:360px;border-radius:8px;" preload="metadata"></video>` : `<p class="muted">لا يوجد فيديو</p>`;
      const controls = isAdmin ? `<div class="tip-controls"><button data-id="${p.id}" class="edit-post">تعديل</button><button data-id="${p.id}" class="delete-post">حذف</button></div>` : "";
      return `
        <div class="book" style="padding:12px;text-align:right;">
          <h3 style="margin:0 0 8px 0;padding:0;color:var(--gold)">${safeTitle}</h3>
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
    container.innerHTML = "<p class='warn'>⚠️ تعذر تحميل المشاركات.</p>";
  }
}

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) throw new Error("يرجى ضبط إعدادات Cloudinary في main.js");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error("فشل رفع الملف إلى Cloudinary");
  return res.json();
}

async function onUploadPost(e) {
  e.preventDefault();
  if (!authToken) return alert("يجب تسجيل الدخول كمشرف أولاً.");
  const title = e.target.title.value.trim();
  const description = e.target.description.value.trim();
  const fileInput = e.target.videoFile;
  if (!title || !fileInput || !fileInput.files || fileInput.files.length === 0) return alert("أكمل الحقول المطلوبة واختر فيديو.");
  const file = fileInput.files[0];

  try {
    const upRes = await uploadToCloudinary(file);
    const videoUrl = upRes.secure_url;
    if (!videoUrl) throw new Error("لم نتحصل على رابط الفيديو من Cloudinary");

    const res = await fetch(`${BACKEND}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
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
    console.error("onUploadPost:", err);
    alert("حدث خطأ أثناء رفع المشاركة: " + (err.message || err));
  }
}

async function onDeletePost(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("هل تريد حذف هذه المشاركة؟")) return;
  try {
    const res = await fetch(`${BACKEND}/posts/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": authToken || "" }
    });
    const j = await res.json().catch(()=>({}));
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadPosts();
  } catch (err) {
    console.error("onDeletePost:", err);
    alert("حدث خطأ أثناء الحذف.");
  }
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
      headers: { "Content-Type": "application/json", "x-auth-token": authToken || "" },
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تعديل المشاركة.");
    alert(j.message || "تم تعديل المشاركة.");
    loadPosts();
  } catch (err) {
    console.error("onEditPost:", err);
    alert("حدث خطأ أثناء التعديل.");
  }
}

/* ===== UI pages ===== */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  const page = document.getElementById(id);
  if (page) page.classList.add("visible");
  const backBtn = document.getElementById("backBtn");
  backBtn.style.display = id === "videosPage" ? "none" : "block";
}
