// ---------- إعداد الـ BACKEND (غيّره إذا لازم) ----------
const BACKEND = "https://mosa-backend-dr63.onrender.com"; // ضع رابط سيرفرك أو http://localhost:4000

// ---------- حالة الجلسة محلياً ----------
let session = {
  username: localStorage.getItem("adm_username") || null,
  role: localStorage.getItem("adm_role") || null, // "superadmin" أو "admin" أو null
  pass: null // لا نخزن كلمة المرور الدائمة هنا، فقط أثناء الجلسة (ذاكرة)
};

// ---------- بيانات مشرفين محليين (محفوظ في localStorage كمؤقت) ----------
function loadLocalAdmins() {
  try {
    const raw = localStorage.getItem("localAdmins");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLocalAdmins(list) { localStorage.setItem("localAdmins", JSON.stringify(list)); }

// ---------- init (safe attach even لو DOMContentLoaded صار قبل تحميل السكربت) ----------
function initApp() {
  // عناصر أساسية
  const enterBtn = document.getElementById("enterBtn");
  const cornerLogin = document.getElementById("cornerLogin");
  const loginCancel = document.getElementById("loginCancel");

  if (enterBtn) enterBtn.addEventListener("click", onEnter);
  if (cornerLogin) cornerLogin.addEventListener("click", openLoginModal);
  if (loginCancel) loginCancel.addEventListener("click", closeLoginModal);

  // navbar links
  document.querySelectorAll(".navbar a").forEach(a => a.addEventListener("click", () => showPage(a.dataset.section)));
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => showPage("videosPage"));

  // upload forms (maybe hidden until login)
  const ub = document.getElementById("upload-book");
  const ut = document.getElementById("upload-tip");
  const up = document.getElementById("upload-post");
  if (ub) ub.addEventListener("submit", onUploadBook);
  if (ut) ut.addEventListener("submit", onUploadTip);
  if (up) up.addEventListener("submit", onUploadPost);

  // admin panel controls
  const closeAdminPanelBtn = document.getElementById("closeAdminPanel");
  if (closeAdminPanelBtn) closeAdminPanelBtn.addEventListener("click", closeAdminPanel);
  const panelLogout = document.getElementById("panelLogout");
  if (panelLogout) panelLogout.addEventListener("click", () => { if (confirm("تسجيل خروج؟")) doLogout(); });

  // superadmin local creation
  const createLocalAdminForm = document.getElementById("createLocalAdminForm");
  if (createLocalAdminForm) createLocalAdminForm.addEventListener("submit", onCreateLocalAdmin);

  // change global password form (calls legacy endpoint /admin/change-password)
  const changeGlobalPassForm = document.getElementById("changeGlobalPassForm");
  if (changeGlobalPassForm) changeGlobalPassForm.addEventListener("submit", onChangeGlobalPass);

  // channels links
  const tg = document.getElementById("tgBtn"); if (tg) tg.href = "https://t.me/musaahmadkh";
  const wa = document.getElementById("waBtn"); if (wa) wa.href = "https://chat.whatsapp.com/JaAji0WfEat8dVI1CPB4c1?mode=hqrt1";

  // force dark
  document.body.classList.remove("light");
  document.body.classList.add("dark");

  // تحديث واجهة حسب الجلسة إن كان هناك جلسة محفوظة
  restoreSessionUI();
}

// attach init safely
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
else initApp();

/* =======================
   شاشة البداية وتهيئة الموقع
   ======================= */
function onEnter() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";
  // بعد الدخول نحمّل المحتوى
  loadVideos(); loadBooks(); loadTips(); loadPosts();
  showPage("videosPage");
}

/* =======================
   فتح/غلق مودال تسجيل الدخول
   ======================= */
function openLoginModal() {
  // إذا المسجل حالياً فتح لوحة الادارة إن كان superadmin او فقط اعرض مودال لغير المسجلين
  if (session.username && session.role) {
    // لو سوبر ادمين افتح اللوحة، ولو admin فقط نظهر زر الخروج في المكان
    if (session.role === "superadmin") openAdminPanel();
    else alert("أنت مسجل كـ مشرف عادي.");
    return;
  }
  const modal = document.getElementById("loginModal");
  if (modal) { modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false"); }
}
function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) { modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
  const msg = document.getElementById("loginMsg"); if (msg) msg.textContent = "";
}

/* =======================
   تسجيل الدخول (username + password)
   كيفية التحقق:
   1) نحاول التحقق عبر الباك إند (نرسل طلب GET /books مع هيدر x-admin-pass=pass)
      — إن نجح (status 200/ok) نعتبر كلمة المرور صحيحة.
   2) إن فشل، نتحقق من قائمة المشرفين المحفوظة محلياً (localAdmins) — هذا حل مؤقت فقط.
   الدور: إذا اسم المستخدم === "sayafbadarin" نعتبره superadmin (إذا كانت كلمة المرور صحيحة).
   ======================= */
document.addEventListener("submit", async (e) => {
  if (!e.target || e.target.id !== "loginForm") return;
  e.preventDefault();
  const f = e.target;
  const username = (f.username.value || "").trim();
  const password = (f.password.value || "").trim();
  const msgEl = document.getElementById("loginMsg");

  if (!username || !password) { if (msgEl) msgEl.textContent = "أكمل الحقول"; return; }

  // تجربة التحقق عبر الباك إند (طريقة legacy: x-admin-pass)
  let backendOk = false;
  try {
    const res = await fetch(`${BACKEND}/books`, { headers: { "x-admin-pass": password } });
    if (res.ok) backendOk = true;
  } catch (err) { backendOk = false; }

  // لو فشل التحقق عبر الباك إند، نتحقق من localAdmins (محلي فقط)
  let localOk = false;
  if (!backendOk) {
    const admins = loadLocalAdmins();
    const found = admins.find(a => a.username === username && a.password === password);
    if (found) localOk = true;
  }

  if (!backendOk && !localOk) {
    if (msgEl) msgEl.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
    return;
  }

  // تسجيل النجاح محلياً (لا نخزن كلمة المرور الدائمة في localStorage)
  session.username = username;
  session.pass = password;
  session.role = (username === "sayafbadarin") ? "superadmin" : "admin";

  localStorage.setItem("adm_username", session.username);
  localStorage.setItem("adm_role", session.role);

  // تحديث الواجهة
  restoreSessionUI();

  closeLoginModal();
  alert("تم تسجيل الدخول كـ " + session.role);
});

/* =======================
   استعادة واجهة الجلسة عند التحميل
   ======================= */
function restoreSessionUI() {
  const adminPlaceholder = document.getElementById("adminAreaPlaceholder");
  if (!adminPlaceholder) return;

  adminPlaceholder.innerHTML = ""; // نبدأ فارغاً

  const cornerBtn = document.getElementById("cornerLogin");
  if (session.username && session.role) {
    cornerBtn.textContent = "●";
    // لو سوبر ادمين نعرض زر فتح لوحة الإدارة + زر خروج
    if (session.role === "superadmin") {
      adminPlaceholder.innerHTML = `<button id="openAdminPanel">لوحة الإدارة</button> <button id="footerLogout">تسجيل خروج</button>`;
      document.getElementById("openAdminPanel").addEventListener("click", openAdminPanel);
      document.getElementById("footerLogout").addEventListener("click", () => { if (confirm("تسجيل خروج؟")) doLogout(); });
      // نظهر أيضاً قسم إدارة المشرفين المحليين في اللوحة عند فتحها
    } else {
      // مشرف عادي: نظهر فقط زر تسجيل الخروج في الفوتر
      adminPlaceholder.innerHTML = `<button id="footerLogout">تسجيل خروج</button>`;
      document.getElementById("footerLogout").addEventListener("click", () => { if (confirm("تسجيل خروج؟")) doLogout(); });
    }

    // إظهار نماذج الرفع للمشرفين (عادي أو رئيسي)
    document.getElementById("upload-book").style.display = "block";
    document.getElementById("upload-tip").style.display = "block";
    document.getElementById("upload-post").style.display = "block";
  } else {
    cornerBtn.textContent = "🔒";
    // زائر: لا تظهر أي عناصر إدارية
    adminPlaceholder.innerHTML = "";
    document.getElementById("upload-book").style.display = "none";
    document.getElementById("upload-tip").style.display = "none";
    document.getElementById("upload-post").style.display = "none";
  }

  // عند سوبر ادمين، جهّز قائمة المشرفين المحليين في اللوحة إن فتحت
  renderLocalAdminsList();
}

/* =======================
   خروج من الجلسة
   ======================= */
function doLogout() {
  session = { username: null, role: null, pass: null };
  localStorage.removeItem("adm_username");
  localStorage.removeItem("adm_role");
  restoreSessionUI();
  alert("تم تسجيل الخروج");
}

/* =======================
   فتح لوحة الإدارة (مكونات خاصة بالسوبر ادمين)
   ======================= */
function openAdminPanel() {
  if (!session.username || session.role !== "superadmin") { alert("ليس لديك الصلاحية"); return; }
  const panel = document.getElementById("adminPanel");
  if (panel) { panel.classList.remove("hidden"); panel.setAttribute("aria-hidden","false"); }
  // تحديث قائمة المشرفين المحليين داخل اللوحة
  renderLocalAdminsList();
}
function closeAdminPanel() {
  const panel = document.getElementById("adminPanel");
  if (panel) { panel.classList.add("hidden"); panel.setAttribute("aria-hidden","true"); }
}

/* =======================
   إدارة المشرفين المحليين (محلي فقط، temporary)
   ======================= */
function renderLocalAdminsList() {
  const el = document.getElementById("localAdminsList");
  if (!el) return;
  const list = loadLocalAdmins();
  if (!list.length) { el.innerHTML = "<p class='small-muted'>لا يوجد مشرفين محليين</p>"; return; }
  el.innerHTML = list.map((u, idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #222;">
      <div><strong>${escapeHtml(u.username)}</strong></div>
      <div style="display:flex;gap:6px;">
        <button data-idx="${idx}" class="localDel">حذف</button>
      </div>
    </div>
  `).join("");
  Array.from(el.querySelectorAll(".localDel")).forEach(btn => btn.addEventListener("click", (e) => {
    const i = Number(e.currentTarget.dataset.idx);
    const arr = loadLocalAdmins();
    arr.splice(i,1);
    saveLocalAdmins(arr);
    renderLocalAdminsList();
  }));
}

function onCreateLocalAdmin(e) {
  e.preventDefault();
  if (!session || session.role !== "superadmin") return alert("ليس لديك الصلاحية");
  const f = e.target;
  const username = (f.newUsername.value||"").trim();
  const password = (f.newPassword.value||"").trim();
  if (!username || !password) return alert("أكمل الحقول");
  const arr = loadLocalAdmins();
  if (arr.find(a => a.username === username)) return alert("اسم المستخدم موجود محلياً");
  arr.push({ username, password });
  saveLocalAdmins(arr);
  f.reset();
  renderLocalAdminsList();
  alert("تم إنشاء مشرف محلي (محلي فقط)");
}

/* =======================
   تغيير كلمة المرور على الخادم (legacy endpoint)
   نستخدم endpoint الموجود عندك: POST /admin/change-password
   يجب إرسال هيدر x-admin-pass: currentPassword
   ورسال newPassword في body.
   ======================= */
async function onChangeGlobalPass(e) {
  e.preventDefault();
  if (!session || session.role !== "superadmin") return alert("ليس لديك الصلاحية");

  const f = e.target;
  const currentPassword = (f.currentPassword.value||"").trim();
  const newPassword = (f.newPassword.value||"").trim();
  if (!currentPassword || !newPassword) return alert("أكمل الحقول");
  if (newPassword.length < 4) return alert("كلمة المرور جديدة قصيرة");

  try {
    const res = await fetch(`${BACKEND}/admin/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pass": currentPassword },
      body: JSON.stringify({ newPassword })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل تغيير كلمة المرور");
    alert("تم تغيير كلمة المرور على الخادم");
    f.reset();
  } catch (err) {
    alert("فشل الاتصال");
  }
}

/* =======================
   بقية وظائف CRUD قصيرة (كتب، ارشادات، مشاركات)
   هذه تستدعي مسارات الباك إند الموجودة عندك (/books, /tips, /posts)
   وتستخدم header "x-admin-pass" = session.pass عند العمليات المحمية إن كانت متاحة
   ======================= */

function escapeHtml(s){ if (!s) return ""; return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }

async function loadBooks(){
  const c = document.getElementById("book-list");
  if (!c) return;
  c.innerHTML = "<p class='small-muted'>جارِ التحميل...</p>";
  try {
    const res = await fetch(`${BACKEND}/books`);
    const j = await res.json();
    const arr = j.ok ? j.data : [];
    if (!arr.length) { c.innerHTML = "<p class='small-muted'>لا توجد كتب</p>"; return; }
    const isAdmin = !!session.username;
    c.innerHTML = arr.map(b => {
      const safeTitle = escapeHtml(b.title||"بدون عنوان");
      const controls = isAdmin ? `<div style="margin-top:8px;"><button onclick="deleteBook('${b.id}')">حذف</button></div>` : "";
      return `<div class="book"><h3>${safeTitle}</h3><p><a href="${escapeHtml(b.url)}" target="_blank">فتح الرابط</a></p>${controls}</div>`;
    }).join("");
  } catch { c.innerHTML = "<p class='small-muted'>خطأ</p>"; }
}

async function onUploadBook(e){
  e.preventDefault();
  if (!session.username) return alert("سجّل دخولك");
  const f = e.target;
  const title = (f.title.value||"").trim();
  const url = (f.url.value||"").trim();
  if (!title || !url) return alert("أكمل الحقول");
  try {
    const res = await fetch(`${BACKEND}/books`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-admin-pass": session.pass || "" },
      body: JSON.stringify({ title, url })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل");
    alert("تمت الإضافة");
    f.reset(); loadBooks();
  } catch { alert("خطأ"); }
}

async function deleteBook(id){
  if (!confirm("حذف؟")) return;
  try {
    await fetch(`${BACKEND}/books/${id}`, { method: "DELETE", headers: { "x-admin-pass": session.pass || "" } });
    loadBooks();
  } catch { alert("خطأ"); }
}

/* Tips */
async function loadTips(){
  const c = document.getElementById("tip-list");
  if (!c) return;
  c.innerHTML = "<p class='small-muted'>جارِ التحميل...</p>";
  try {
    const res = await fetch(`${BACKEND}/tips`);
    const j = await res.json();
    const arr = j.ok ? j.data : [];
    if (!arr.length) { c.innerHTML = "<p class='small-muted'>لا توجد إرشادات</p>"; return; }
    c.innerHTML = arr.map(t => {
      return `<div class="book"><p>${escapeHtml(t.text||"")}</p>${session.username ? `<button onclick="editTip('${t.id}')">تعديل</button> <button onclick="deleteTip('${t.id}')">حذف</button>` : ""}</div>`;
    }).join("");
  } catch { c.innerHTML = "<p class='small-muted'>خطأ</p>"; }
}
async function onUploadTip(e){
  e.preventDefault(); if (!session.username) return alert("سجّل دخولك");
  const text = (e.target.text.value||"").trim(); if (!text) return alert("أدخل نص");
  try {
    const res = await fetch(`${BACKEND}/tips`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-admin-pass": session.pass || "" },
      body: JSON.stringify({ text })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) return alert(j.message || "فشل");
    e.target.reset(); loadTips();
  } catch { alert("خطأ"); }
}
async function editTip(id){
  const newt = prompt("نص جديد:");
  if (!newt) return;
  try {
    await fetch(`${BACKEND}/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type":"application/json", "x-admin-pass": session.pass || "" },
      body: JSON.stringify({ text: newt })
    });
    loadTips();
  } catch { alert("خطأ"); }
}
async function deleteTip(id){ if (!confirm("حذف؟")) return; try { await fetch(`${BACKEND}/tips/${id}`, { method:"DELETE", headers:{"x-admin-pass": session.pass||""} }); loadTips(); } catch { alert("خطأ"); } }

/* Posts (read-only unless logged-in) */
async function loadPosts(){
  const c = document.getElementById("post-list"); if (!c) return;
  c.innerHTML = "<p class='small-muted'>جارِ التحميل...</p>";
  try {
    const res = await fetch(`${BACKEND}/posts`);
    const j = await res.json();
    const arr = j.ok ? j.data : [];
    if (!arr.length) { c.innerHTML = "<p class='small-muted'>لا توجد مشاركات</p>"; return; }
    c.innerHTML = arr.map(p => `<div class="book"><h3>${escapeHtml(p.title||"")}</h3>${p.videoUrl ? `<video controls src="${escapeHtml(p.videoUrl)}" style="width:100%"></video>` : ""}<p>${escapeHtml(p.description||"")}</p>${session.username?`<button onclick="editPost('${p.id}')">تعديل</button> <button onclick="deletePost('${p.id}')">حذف</button>`:""}</div>`).join("");
  } catch { c.innerHTML = "<p class='small-muted'>خطأ</p>"; }
}
async function onUploadPost(e){ e.preventDefault(); if (!session.username) return alert("سجّل دخولك"); alert("رفع الفيديو غير مفعل في هذه النسخة"); }

async function editPost(id){ const t = prompt("عنوان جديد (اتركه فارغاً إن لم تتغير):"); const d = prompt("وصف جديد (اختياري):"); const payload = {}; if (t) payload.title=t; if (d) payload.description=d; if (!Object.keys(payload).length) return; try{ await fetch(`${BACKEND}/posts/${id}`, { method:"PUT", headers:{"Content-Type":"application/json","x-admin-pass": session.pass||""}, body: JSON.stringify(payload) }); loadPosts(); }catch{ alert("خطأ"); } }
async function deletePost(id){ if (!confirm("حذف؟")) return; try{ await fetch(`${BACKEND}/posts/${id}`, { method:"DELETE", headers:{"x-admin-pass": session.pass||""} }); loadPosts(); }catch{ alert("خطأ"); } }

/* =======================
   المساعدة: التنقّل بين الصفحات
   ======================= */
function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  const page = document.getElementById(id);
  if (page) page.classList.add("visible");
  document.getElementById("backBtn").style.display = (id === "videosPage") ? "none" : "block";
}
