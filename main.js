//------------------------------------------------------
//            إعداد الرابط الخلفي
//------------------------------------------------------
const BACKEND = "https://mosa-backend-dr63.onrender.com";

//------------------------------------------------------
//            المتغيرات العامة للمصادقة
//------------------------------------------------------
let authToken = localStorage.getItem("authToken") || null;
let currentRole = localStorage.getItem("currentRole") || null;
let currentUsername = localStorage.getItem("currentUsername") || null;

//------------------------------------------------------
//            Cloudinary (مهم لو عندك مشاركات فيديو)
//------------------------------------------------------
const CLOUDINARY_CLOUD = "dkdnq0zj3"; 
const CLOUDINARY_PRESET = "unsigned_posts_preset";

//------------------------------------------------------
//            تشغيل التهيئة بمجرد تحميل DOM
//------------------------------------------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

//------------------------------------------------------
//                    التهيئة الرئيسية
//------------------------------------------------------
function initApp() {

  // ربط الأحداث الأساسية
  document.getElementById("cornerLogin").addEventListener("click", openLoginModal);
  document.getElementById("loginCancel").addEventListener("click", closeLoginModal);

  document.getElementById("loginForm").addEventListener("submit", onLoginSubmit);

  // لوحة الإدارة
  document.getElementById("closeAdminPanel").addEventListener("click", closeAdminPanel);
  document.getElementById("panelLogout").addEventListener("click", () => {
    if (confirm("هل تريد تسجيل الخروج؟")) logout();
  });

  document.getElementById("createAdminForm").addEventListener("submit", onCreateAdmin);
  document.getElementById("changeOwnPassForm").addEventListener("submit", onChangeOwnPassword);

  // صفحات الواجهة
  document.querySelectorAll(".navbar a").forEach(a =>
    a.addEventListener("click", () => showPage(a.dataset.section))
  );

  document.getElementById("backBtn").addEventListener("click", () => showPage("videosPage"));

  // نماذج الرفع
  document.getElementById("upload-book").addEventListener("submit", onUploadBook);
  document.getElementById("upload-tip").addEventListener("submit", onUploadTip);
  document.getElementById("upload-post").addEventListener("submit", onUploadPost);

  // الروابط الخارجية
  document.getElementById("tgBtn").href = "https://t.me/musaahmadkh";
  document.getElementById("waBtn").href = "https://chat.whatsapp.com/JaAji0WfEat8dVI1CPB4c1?mode=hqrt1";

  // الوضع الليلي فقط
  forceDarkTheme();

  // ترتيب الواجهة بناءً على حالة الدخول
  updateAdminAreaUI();

  // تحميل المحتوى بعد فتح الموقع
  // (onEnter سيستدعي initializeSite)
}

//------------------------------------------------------
//                  شاشة البداية
//------------------------------------------------------
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

//------------------------------------------------------
//                 تثبيت الوضع الليلي
//------------------------------------------------------
function forceDarkTheme() {
  document.body.classList.remove("light");
  document.body.classList.add("dark");
  try { localStorage.setItem("theme", "dark"); } catch(e){}
}

//------------------------------------------------------
//             تحديث واجهة منطقة الإدارة
//------------------------------------------------------
function updateAdminAreaUI() {

  const ph = document.getElementById("adminAreaPlaceholder");
  ph.innerHTML = "";

  const loginBtn = document.getElementById("cornerLogin");

  if (!authToken) {
    loginBtn.textContent = "🔒";
    return;
  }

  loginBtn.textContent = "●"; // Logged in indicator

  // مشرف عادي → فقط زر تسجيل خروج
  if (currentRole === "admin") {
    ph.innerHTML = `
      <button id="footerLogout" class="admin-logout-foot">تسجيل خروج</button>
    `;
    document.getElementById("footerLogout").addEventListener("click", () => {
      if (confirm("هل تريد تسجيل الخروج؟")) logout();
    });
    return;
  }

  // مشرف رئيسي → زر لوحة الإدارة + خروج
  if (currentRole === "superadmin") {
    ph.innerHTML = `
      <button id="openAdminPanel" class="admin-open-btn">لوحة الإدارة</button>
      <button id="footerLogout" class="admin-logout-foot">تسجيل خروج</button>
    `;
    document.getElementById("openAdminPanel").addEventListener("click", openAdminPanel);
    document.getElementById("footerLogout").addEventListener("click", () => {
      if (confirm("هل تريد تسجيل الخروج؟")) logout();
    });
  }
}

//------------------------------------------------------
//                    النوافذ (مودال)
//------------------------------------------------------
function openLoginModal() {
  if (authToken) {
    openAdminPanel();
    return;
  }
  const modal = document.getElementById("loginModal");
  modal.classList.remove("hidden");
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  modal.classList.add("hidden");
  document.getElementById("loginMsg").textContent = "";
}

//------------------------------------------------------
//             تسجيل الدخول الفعلي
//------------------------------------------------------
async function onLoginSubmit(e) {
  e.preventDefault();

  const f = e.target;
  const username = f.username.value.trim();
  const password = f.password.value.trim();

  if (!username || !password) {
    return showLoginMsg("يرجى إدخال اسم المستخدم وكلمة المرور");
  }

  try {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const j = await res.json();

    if (!res.ok) {
      return showLoginMsg(j.message || "خطأ في تسجيل الدخول");
    }

    authToken = j.token;
    currentRole = j.role;
    currentUsername = j.username;

    localStorage.setItem("authToken", authToken);
    localStorage.setItem("currentRole", currentRole);
    localStorage.setItem("currentUsername", currentUsername);

    closeLoginModal();
    updateAdminAreaUI();

    alert("تم تسجيل الدخول بنجاح.");

    if (currentRole === "superadmin") {
      document.getElementById("superadminControls").style.display = "block";
      loadUsersList();
    }

  } catch (err) {
    showLoginMsg("تعذّر الاتصال بالسيرفر");
  }
}

function showLoginMsg(m) {
  document.getElementById("loginMsg").textContent = m;
}

//------------------------------------------------------
//                   تسجيل الخروج
//------------------------------------------------------
function logout() {
  authToken = null;
  currentRole = null;
  currentUsername = null;

  localStorage.removeItem("authToken");
  localStorage.removeItem("currentRole");
  localStorage.removeItem("currentUsername");

  // إغلاق كل شيء
  closeAdminPanel();
  updateAdminAreaUI();

  // إخفاء نماذج الرفع
  document.getElementById("upload-book").style.display = "none";
  document.getElementById("upload-tip").style.display = "none";
  document.getElementById("upload-post").style.display = "none";

  alert("تم تسجيل الخروج.");
}

//------------------------------------------------------
//             جلب معلومات المستخدم الحالي
//------------------------------------------------------
async function fetchMe() {
  try {
    const res = await fetch(`${BACKEND}/auth/me`, {
      headers: { "x-auth-token": authToken }
    });

    if (!res.ok) {
      logout();
      return;
    }

    const j = await res.json();
    currentRole = j.role;
    currentUsername = j.username;

    localStorage.setItem("currentRole", currentRole);
    localStorage.setItem("currentUsername", currentUsername);

    updateAdminAreaUI();

    if (currentRole === "superadmin") {
      document.getElementById("superadminControls").style.display = "block";
      loadUsersList();
    }

  } catch {}
}

//------------------------------------------------------
//                 لوحة الإدارة
//------------------------------------------------------
function openAdminPanel() {
  if (!authToken) return;

  const p = document.getElementById("adminPanel");
  p.classList.remove("hidden");

  if (currentRole !== "superadmin") {
    document.getElementById("superadminControls").style.display = "none";
  } else {
    document.getElementById("superadminControls").style.display = "block";
    loadUsersList();
  }
}

function closeAdminPanel() {
  document.getElementById("adminPanel").classList.add("hidden");
}

//------------------------------------------------------
//          إنشاء مشرف جديد (superadmin فقط)
//------------------------------------------------------
async function onCreateAdmin(e) {
  e.preventDefault();

  if (currentRole !== "superadmin") return alert("غير مسموح");

  const f = e.target;

  const username = f.newUsername.value.trim();
  const password = f.newPassword.value.trim();
  const role = f.newRole.value;

  if (!username || !password) return alert("أكمل البيانات");

  try {
    const res = await fetch(`${BACKEND}/auth/create-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": authToken
      },
      body: JSON.stringify({ username, password, role })
    });

    const j = await res.json();

    if (!res.ok) return alert(j.message);

    alert("تم إنشاء المستخدم");
    f.reset();
    loadUsersList();

  } catch {
    alert("خطأ أثناء الإنشاء");
  }
}

//------------------------------------------------------
//     تغيير كلمة مرور مستخدم آخر (superadmin)
//------------------------------------------------------
async function onSuperChangePassword(username) {
  const newPass = prompt(`أدخل كلمة مرور جديدة للمستخدم ${username}:`);
  if (!newPass || newPass.length < 4) return alert("كلمة المرور قصيرة");

  try {
    const res = await fetch(`${BACKEND}/auth/change-password/${username}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": authToken
      },
      body: JSON.stringify({ newPassword: newPass })
    });

    const j = await res.json();

    if (!res.ok) return alert(j.message);
    alert("تم تغيير كلمة المرور");

  } catch {
    alert("خطأ أثناء التغيير");
  }
}

//------------------------------------------------------
//      تغيير كلمة مرور المشرف الحالي (أي مشرف)
//------------------------------------------------------
async function onChangeOwnPassword(e) {
  e.preventDefault();

  const f = e.target;
  const currentPassword = f.currentPassword.value.trim();
  const newPassword = f.newPassword.value.trim();

  if (!currentPassword || !newPassword) return alert("أكمل البيانات");
  if (newPassword.length < 4) return alert("كلمة المرور قصيرة");

  try {
    const res = await fetch(`${BACKEND}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": authToken
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const j = await res.json();

    if (!res.ok) return alert(j.message);
    alert("تم تغيير كلمة المرور");
    f.reset();

  } catch {
    alert("خطأ أثناء تغيير كلمة المرور");
  }
}

//------------------------------------------------------
//               جلب قائمة المستخدمين
//------------------------------------------------------
async function loadUsersList() {
  try {
    const res = await fetch(`${BACKEND}/auth/users`, {
      headers: { "x-auth-token": authToken }
    });

    const j = await res.json();

    if (!res.ok) {
      document.getElementById("usersList").innerHTML = "<p>خطأ بتحميل المستخدمين</p>";
      return;
    }

    const users = j.data;

    if (!users.length) {
      document.getElementById("usersList").innerHTML = "<p>لا يوجد مستخدمون</p>";
      return;
    }

    document.getElementById("usersList").innerHTML = users.map(u => `
      <div class="user-row">
        <b>${u.username}</b> — ${u.role}
        <button onclick="onSuperChangePassword('${u.username}')">تغيير كلمة المرور</button>
      </div>
    `).join("");

  } catch {
    document.getElementById("usersList").innerHTML = "<p>خطأ</p>";
  }
}

//------------------------------------------------------
//              تحميل الفيديوهات من اليوتيوب
//------------------------------------------------------
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const container = document.getElementById("videos");

  container.innerHTML = "<p>جاري التحميل...</p>";

  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    const data = await res.json();
    const items = data.items.slice(0, 50);

    container.innerHTML = items.map(v => {
      const id = extractYouTubeID(v.link);
      return `
        <div class="video">
          <a href="https://www.youtube.com/watch?v=${id}" target="_blank">
            <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg">
          </a>
          <p>${v.title}</p>
        </div>
      `;
    }).join("");

  } catch {
    container.innerHTML = "<p>تعذر التحميل</p>";
  }
}

function extractYouTubeID(url) {
  const m = url.match(/v=([^&]+)/);
  return m ? m[1] : null;
}

//------------------------------------------------------
//                     الكتب
//------------------------------------------------------
async function loadBooks() {
  const container = document.getElementById("book-list");
  container.innerHTML = "<p>جاري التحميل...</p>";

  try {
    const res = await fetch(`${BACKEND}/books`);
    const j = await res.json();

    if (!j.ok || !j.data.length) {
      container.innerHTML = "<p>لا توجد كتب</p>";
      return;
    }

    const isAdmin = !!authToken;

    container.innerHTML = j.data.map(b => `
      <div class="book">
        <h3>${b.title}</h3>
        <a href="${b.url}" target="_blank">فتح</a>
        ${isAdmin ? `<button onclick="deleteBook('${b.id}')">حذف</button>` : ""}
      </div>
    `).join("");

  } catch {
    container.innerHTML = "<p>حدث خطأ</p>";
  }
}

async function onUploadBook(e) {
  e.preventDefault();

  if (!authToken) return alert("سجّل دخولك");

  const f = e.target;
  const title = f.title.value.trim();
  const url = f.url.value.trim();

  if (!title || !url) return alert("أدخل البيانات");

  try {
    const res = await fetch(`${BACKEND}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ title, url })
    });

    const j = await res.json();

    if (!res.ok) return alert(j.message);

    alert("تمت الإضافة");
    loadBooks();
    f.reset();

  } catch {
    alert("خطأ");
  }
}

async function deleteBook(id) {
  if (!confirm("هل تريد الحذف؟")) return;

  try {
    const res = await fetch(`${BACKEND}/books/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": authToken }
    });

    loadBooks();
  } catch {
    alert("خطأ");
  }
}

//------------------------------------------------------
//                    الإرشادات
//------------------------------------------------------
async function loadTips() {
  const container = document.getElementById("tip-list");

  try {
    const res = await fetch(`${BACKEND}/tips`);
    const j = await res.json();

    if (!j.ok || !j.data.length) {
      container.innerHTML = "<p>لا توجد إرشادات</p>";
      return;
    }

    const isAdmin = !!authToken;

    container.innerHTML = j.data.map(t => `
      <div class="book">
        <p>${t.text}</p>
        ${isAdmin ? `
          <button onclick="editTip('${t.id}')">تعديل</button>
          <button onclick="deleteTip('${t.id}')">حذف</button>`
        : ""}
      </div>
    `).join("");

  } catch {
    container.innerHTML = "<p>خطأ</p>";
  }
}

async function onUploadTip(e) {
  e.preventDefault();
  if (!authToken) return alert("سجّل دخولك");

  const text = e.target.text.value.trim();
  if (!text) return alert("أدخل نصاً");

  try {
    const res = await fetch(`${BACKEND}/tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ text })
    });

    loadTips();
    e.target.reset();

  } catch {
    alert("خطأ");
  }
}

async function editTip(id) {
  const newText = prompt("أدخل النص الجديد:");
  if (!newText) return;

  try {
    await fetch(`${BACKEND}/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ text: newText })
    });

    loadTips();

  } catch {
    alert("خطأ");
  }
}

async function deleteTip(id) {
  if (!confirm("حذف؟")) return;

  try {
    await fetch(`${BACKEND}/tips/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": authToken }
    });

    loadTips();

  } catch {
    alert("خطأ");
  }
}

//------------------------------------------------------
//                   المشاركات
//------------------------------------------------------
async function loadPosts() {
  const container = document.getElementById("post-list");

  try {
    const res = await fetch(`${BACKEND}/posts`);
    const j = await res.json();

    if (!j.ok || !j.data.length) {
      container.innerHTML = "<p>لا يوجد مشاركات</p>";
      return;
    }

    const isAdmin = !!authToken;

    container.innerHTML = j.data.map(p => `
      <div class="book">
        <h3>${p.title}</h3>
        <video controls src="${p.videoUrl}" style="width:100%;"></video>
        <p>${p.description}</p>
        ${isAdmin ? `
          <button onclick="editPost('${p.id}')">تعديل</button>
          <button onclick="deletePost('${p.id}')">حذف</button>`
        : ""}
      </div>
    `).join("");

  } catch {
    container.innerHTML = "<p>خطأ</p>";
  }
}

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(url, { method: "POST", body: fd });
  const j = await res.json();
  return j.secure_url;
}

async function onUploadPost(e) {
  e.preventDefault();

  if (!authToken) return alert("سجّل دخولك");

  const f = e.target;
  const title = f.title.value.trim();
  const description = f.description.value.trim();
  const file = f.videoFile.files[0];

  if (!title || !file) return alert("أدخل البيانات كاملة");

  try {
    const videoUrl = await uploadToCloudinary(file);

    await fetch(`${BACKEND}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ title, description, videoUrl })
    });

    loadPosts();
    f.reset();

  } catch {
    alert("خطأ أثناء رفع المشاركة");
  }
}

async function deletePost(id) {
  if (!confirm("حذف؟")) return;

  try {
    await fetch(`${BACKEND}/posts/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": authToken }
    });

    loadPosts();

  } catch {
    alert("خطأ");
  }
}

async function editPost(id) {
  const title = prompt("عنوان جديد (اتركه فارغاً لعدم التغيير):");
  const description = prompt("وصف جديد (اختياري):");

  const payload = {};
  if (title) payload.title = title;
  if (description) payload.description = description;

  try {
    await fetch(`${BACKEND}/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify(payload)
    });

    loadPosts();

  } catch {
    alert("خطأ");
  }
}

//------------------------------------------------------
//                     تبديل الصفحات
//------------------------------------------------------
function showPage(id) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("visible")
  );

  const page = document.getElementById(id);
  if (page) page.classList.add("visible");

  document.getElementById("backBtn").style.display =
    id === "videosPage" ? "none" : "block";
}
