// main.js — نسخة متوافقة مع الباك إند القديم (x-admin-pass)
// ⚠ ضع BACKEND إلى رابط سيرفرك (مثلاً http://localhost:4000 أو الرابط النهائي)
const BACKEND = "https://mosa-backend-dr63.onrender.com";

let adminPass = null; // محفوظ مؤقتاً بالمتصفح (ذاكرة الجلسة فقط)

// Cloudinary (إن كنت تستخدمه) — عدِّل القيم أو اترك فارغة إذا ما تستخدم
const CLOUDINARY_CLOUD = "dkdnq0zj3";
const CLOUDINARY_PRESET = "unsigned_posts_preset";

/* -------------------- attach init safely -------------------- */
function initApp() {
  // overlay enter button (inline onclick in HTML موجود كـ fallback أيضاً)
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) enterBtn.addEventListener("click", onEnter);

  // navbar
  document.querySelectorAll(".navbar a").forEach(a => a.addEventListener("click", () => showPage(a.dataset.section)));
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => showPage("videosPage"));

  // corner login button
  const corner = document.getElementById("cornerLogin");
  if (corner) corner.addEventListener("click", onAdminToggle);

  // login modal controls
  const loginCancel = document.getElementById("loginCancel");
  if (loginCancel) loginCancel.addEventListener("click", closeLoginModal);
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", onLoginSubmit);

  // admin panel controls
  const closeAdmin = document.getElementById("closeAdminPanel");
  if (closeAdmin) closeAdmin.addEventListener("click", closeAdminPanel);
  const panelLogout = document.getElementById("panelLogout");
  if (panelLogout) panelLogout.addEventListener("click", onPanelLogout);
  const createLocalForm = document.getElementById("createLocalAdminForm");
  if (createLocalForm) createLocalForm.addEventListener("submit", onCreateLocalAdmin);
  const changeGlobalPassForm = document.getElementById("changeGlobalPassForm");
  if (changeGlobalPassForm) changeGlobalPassForm.addEventListener("submit", onChangeGlobalPass);

  // upload forms
  const uploadBookForm = document.getElementById("upload-book");
  if (uploadBookForm) uploadBookForm.addEventListener("submit", onUploadBook);
  const uploadTipForm = document.getElementById("upload-tip");
  if (uploadTipForm) uploadTipForm.addEventListener("submit", onUploadTip);
  const uploadPostForm = document.getElementById("upload-post");
  if (uploadPostForm) uploadPostForm.addEventListener("submit", onUploadPost);

  // channels links
  const tg = document.getElementById("tgBtn"); if (tg) tg.href = "https://t.me/musaahmadkh";
  const wa = document.getElementById("waBtn"); if (wa) wa.href = "https://chat.whatsapp.com/JaAji0WfEat8dVI1CPB4c1?mode=hqrt1";

  // force dark
  document.body.classList.remove("light");
  document.body.classList.add("dark");

  // update UI (admin controls hidden by default)
  updateAdminUI();

  // do not auto-initialize site content here; it will load after onEnter to maintain UX
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
else initApp();

/* -------------------- overlay enter -------------------- */
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

/* -------------------- admin toggle (legacy: prompt) -------------------- */
function onAdminToggle() {
  // if already "logged in" (adminPass set), this button will logout
  if (adminPass) {
    if (!confirm("هل تريد تسجيل الخروج من وضع المسؤول؟")) return;
    adminPass = null;
    updateAdminUI();
    alert("تم تسجيل الخروج.");
    return;
  }
  // show login modal if exists, else prompt
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
    const input = loginModal.querySelector("input[name='username']");
    if (input) input.focus();
    return;
  }
  // fallback prompt (rare)
  const pass = prompt("ادخل كلمة مرور المشرف:");
  if (!pass) return;
  adminPass = pass;
  updateAdminUI();
  alert("وضع المسؤول مفعل محلياً.");
}
function closeLoginModal() {
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
  }
  const msg = document.getElementById("loginMsg"); if (msg) msg.textContent = "";
}

/* -------------------- login form submit (username+password) -------------------- */
async function onLoginSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const username = (f.username.value || "").trim();
  const password = (f.password.value || "").trim();
  const msgEl = document.getElementById("loginMsg");

  if (!username || !password) {
    if (msgEl) msgEl.textContent = "أكمل الحقول";
    return;
  }

  // Since backend only validates password (legacy), we test by calling a protected endpoint with header x-admin-pass
  try {
    const res = await fetch(`${BACKEND}/books`, { headers: { "x-admin-pass": password } });
    if (!res.ok) {
      if (msgEl) msgEl.textContent = "كلمة المرور غير صحيحة أو السيرفر لا يستجيب";
      return;
    }
    // success: accept login
    adminPass = password;
    // save username locally in sessionStorage for UI decisions (not secure, but for UI only)
    sessionStorage.setItem("adm_username", username);
    sessionStorage.setItem("adm_role", (username === "sayafbadarin") ? "superadmin" : "admin");
    updateAdminUI();
    closeLoginModal();
    alert("تم تسجيل الدخول.");
  } catch (err) {
    console.error("login err", err);
    if (msgEl) msgEl.textContent = "خطأ بالاتصال";
  }
}

/* -------------------- updateAdminUI: shows/hides admin controls -------------------- */
function updateAdminUI() {
  const adminBtn = document.getElementById("cornerLogin");
  const uploadBook = document.getElementById("upload-book");
  const uploadTip = document.getElementById("upload-tip");
  const uploadPost = document.getElementById("upload-post");
  const adminPlaceholder = document.getElementById("adminAreaPlaceholder");
  const loggedUsername = sessionStorage.getItem("adm_username") || null;
  const loggedRole = sessionStorage.getItem("adm_role") || null;

  // default hide
  if (uploadBook) uploadBook.style.display = "none";
  if (uploadTip) uploadTip.style.display = "none";
  if (uploadPost) uploadPost.style.display = "none";
  if (adminPlaceholder) adminPlaceholder.innerHTML = "";

  if (adminPass) {
    if (adminBtn) { adminBtn.textContent = "تسجيل خروج"; adminBtn.title = "تسجيل خروج المشرف"; }
    // show upload forms to any admin who provided correct pass
    if (uploadBook) uploadBook.style.display = "block";
    if (uploadTip) uploadTip.style.display = "block";
    if (uploadPost) uploadPost.style.display = "block";

    // if superadmin (by username saved in sessionStorage)
    if (loggedRole === "superadmin" && adminPlaceholder) {
      adminPlaceholder.innerHTML = `<button id="openAdminPanel">لوحة الإدارة</button> <button id="footerLogout">تسجيل خروج</button>`;
      const openBtn = document.getElementById("openAdminPanel");
      if (openBtn) openBtn.addEventListener("click", openAdminPanel);
      const footerLogout = document.getElementById("footerLogout");
      if (footerLogout) footerLogout.addEventListener("click", () => {
        if (confirm("هل تريد تسجيل الخروج؟")) { adminPass = null; sessionStorage.removeItem("adm_username"); sessionStorage.removeItem("adm_role"); updateAdminUI(); alert("تم تسجيل الخروج."); }
      });
    } else if (adminPass && adminPlaceholder) {
      // admin (not super) gets only logout button
      adminPlaceholder.innerHTML = `<button id="footerLogout">تسجيل خروج</button>`;
      const footerLogout = document.getElementById("footerLogout");
      if (footerLogout) footerLogout.addEventListener("click", () => {
        if (confirm("هل تريد تسجيل الخروج؟")) { adminPass = null; sessionStorage.removeItem("adm_username"); sessionStorage.removeItem("adm_role"); updateAdminUI(); alert("تم تسجيل الخروج."); }
      });
    }
  } else {
    if (adminBtn) { adminBtn.textContent = "🔒"; adminBtn.title = "تسجيل دخول المشرف"; }
  }
}

/* -------------------- admin panel for superadmin: open/close -------------------- */
function openAdminPanel() {
  const username = sessionStorage.getItem("adm_username") || null;
  const role = sessionStorage.getItem("adm_role") || null;
  if (!adminPass || role !== "superadmin") { alert("ليس لديك الصلاحية"); return; }
  const panel = document.getElementById("adminPanel");
  if (panel) panel.classList.remove("hidden");
  renderLocalAdmins();
}
function closeAdminPanel() {
  const panel = document.getElementById("adminPanel");
  if (panel) panel.classList.add("hidden");
}

/* -------------------- local admins (optional temporary feature) -------------------- */
function loadLocalAdmins() {
  try {
    const raw = localStorage.getItem("localAdmins");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLocalAdmins(list) { localStorage.setItem("localAdmins", JSON.stringify(list)); }
function renderLocalAdmins() {
  const el = document.getElementById("localAdminsList");
  if (!el) return;
  const list = loadLocalAdmins();
  if (!list.length) { el.innerHTML = "<p style='color:#aaa'>لا يوجد مشرفين محليين</p>"; return; }
  el.innerHTML = list.map((u,i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;"><div>${u.username}</div><div><button data-i="${i}" class="delLocal">حذف</button></div></div>`).join("");
  Array.from(el.querySelectorAll(".delLocal")).forEach(b => b.addEventListener("click", (ev) => {
    const idx = Number(ev.currentTarget.dataset.i);
    const arr = loadLocalAdmins();
    arr.splice(idx,1);
    saveLocalAdmins(arr);
    renderLocalAdmins();
  }));
}
function onCreateLocalAdmin(e) {
  e.preventDefault();
  const f = e.target;
  const username = (f.newUsername.value||"").trim();
  const password = (f.newPassword.value||"").trim();
  if (!username || !password) return alert("أكمل الحقول");
  const arr = loadLocalAdmins();
  if (arr.find(a => a.username === username)) return alert("اسم موجود");
  arr.push({ username, password });
  saveLocalAdmins(arr);
  f.reset();
  renderLocalAdmins();
  alert("تم إنشاء مشرف محلي (محلي فقط)");
}

/* -------------------- change global password on server (legacy endpoint) -------------------- */
async function onChangeGlobalPass(e) {
  e.preventDefault();
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

/* -------------------- change pass panel logout -------------------- */
function onPanelLogout() {
  if (!confirm("هل تريد تسجيل الخروج؟")) return;
  adminPass = null;
  sessionStorage.removeItem("adm_username");
  sessionStorage.removeItem("adm_role");
  updateAdminUI();
  alert("تم تسجيل الخروج.");
}

/* -------------------- helper escape -------------------- */
function escapeHtml(s){ if (s==null) return ""; return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }

/* -------------------- Videos (using rss2json like before) -------------------- */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const container = document.getElementById("videos");
  if (!container) return;
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الفيديوهات...</p>`;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    if (!res.ok) throw new Error("فشل جلب الخلاصة");
    const data = await res.json();
    const items = (data.items || []).slice(0, 50);
    if (items.length === 0) { container.innerHTML = "<p style='color:#aaa'>لا توجد فيديوهات حالياً.</p>"; return; }
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

/* -------------------- Books -------------------- */
async function loadBooks() {
  const container = document.getElementById("book-list");
  if (!container) return;
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
      const controls = isAdmin ? `<div class="tip-controls"><button data-id="${b.id}" class="delete-book">حذف</button></div>` : "";
      return `
      <div class="book">
        <h3 style="padding:12px 10px;margin:0;">${safeTitle}</h3>
        ${preview ? `<iframe src="${preview}" width="100%" height="400" loading="lazy"></iframe>` : `<p style="color:#aaa;padding:12px;">🔗 لا يمكن عرض معاينة لهذا الرابط — <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener">افتح الرابط</a></p>`}
        ${controls}
      </div>`;
    }).join("");
    document.querySelectorAll(".delete-book").forEach(btn => btn.addEventListener("click", onDeleteBook));
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
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
      body: JSON.stringify({ title, url })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الإرسال");
    alert(j.message || "تمت إضافة الكتاب بنجاح");
    e.target.reset(); loadBooks();
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
      headers: { "x-admin-pass": adminPass || "" }
    });
    const j = await res.json().catch(()=>({}));
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadBooks();
  } catch (err) {
    console.error("onDeleteBook:", err);
    alert("حدث خطأ أثناء الحذف.");
  }
}

/* -------------------- Tips -------------------- */
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
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass || "" },
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

/* -------------------- Posts -------------------- */
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
      const videoEmbed = p.videoUrl ? `<video controls src="${escapeHtml(p.videoUrl)}" style="width:100%;max-height:360px;border-radius:8px;" preload="metadata"></video>` : `<p style="color:#aaa">لا يوجد فيديو</p>`;
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
  // In this simplified version we don't implement client-side Cloudinary upload if not configured
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    // allow adding a post without video (or ask user to provide a video URL)
    const videoUrl = prompt("أدخل رابط الفيديو (أو اتركه فارغاً للنشر بدون فيديو):", "");
    try {
      const res = await fetch(`${BACKEND}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
        body: JSON.stringify({ title, description, videoUrl })
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) return alert(j.message || "فشل الإضافة");
      alert(j.message || "تمت الإضافة");
      e.target.reset(); loadPosts();
      return;
    } catch (err) { console.error(err); alert("فشل الإضافة"); return; }
  }

  // if file exists, try uploading to Cloudinary (if configured)
  try {
    const file = fileInput.files[0];
    const upRes = await uploadToCloudinary(file);
    const videoUrl = upRes.secure_url || upRes.url || upRes;
    const res = await fetch(`${BACKEND}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
      body: JSON.stringify({ title, description, videoUrl })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل الإضافة");
    alert(j.message || "تمت الإضافة");
    e.target.reset(); loadPosts();
  } catch (err) {
    console.error("onUploadPost:", err);
    alert("حدث خطأ أثناء رفع المشاركة أو الاتصال بالسيرفر.");
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
    alert(j.message || (res.ok ? "تم الحذف" : "فشل"));
    if (res.ok && j.ok) loadPosts();
  } catch (err) { console.error(err); alert("حدث خطأ أثناء الحذف."); }
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
  } catch (err) { console.error(err); alert("حدث خطأ أثناء التعديل."); }
}

/* -------------------- Cloudinary upload helper (optional) -------------------- */
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

/* -------------------- helpers -------------------- */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll("\n", ""); }

/* -------------------- UI pages -------------------- */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  const page = document.getElementById(id);
  if (page) page.classList.add("visible");
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.style.display = id === "videosPage" ? "none" : "block";
}
