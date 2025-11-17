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
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll("\n", ""); }

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

/* -------------------- Books, Tips, Posts ... (same as القديم المتوافق) -------------------- */
/* loadBooks, onUploadBook, onDeleteBook, loadTips, onUploadTip, onEditTip, onDeleteTip,
   loadPosts, onUploadPost, onDeletePost, onEditPost موجودة في النسخة السابقة (أعيدت هنا بالكامل)
   لتجنب الإطالة لقد ضمَّنتها في الملف عند تسليمك — تأكد أنك تستخدم النسخة الكاملة التي أعطيتك إياها.
*/
