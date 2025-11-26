// ==================== إعدادات ====================
const BACKEND = "http://localhost:4000"; // غيره عند الرفع
const CLOUDINARY_CLOUD = "dkdnq0zj3"; 
const CLOUDINARY_PRESET = "unsigned_posts_preset";
// ================================================

let adminPass = null;
let isMaintenance = false;

// التشغيل
(async function init() {
  await checkMaintenance(); // 1. فحص الصيانة أولاً
  
  // 2. مستمعي الأحداث
  document.querySelectorAll(".navbar a").forEach(a => a.addEventListener("click", () => showPage(a.dataset.section)));
  document.getElementById("cornerLogin").addEventListener("click", toggleAdmin);
  document.getElementById("maintToggleBtn").addEventListener("click", toggleMaintenanceMode);
  document.getElementById("loginForm").addEventListener("submit", onLogin);
  document.getElementById("forceEnter").addEventListener("click", () => {
    document.getElementById("maintenanceOverlay").style.display = "none";
    toggleAdmin();
  });

  // Forms
  document.getElementById("upload-book").addEventListener("submit", onUploadBook);
  document.getElementById("upload-tip").addEventListener("submit", onUploadTip);
  document.getElementById("upload-post").addEventListener("submit", onUploadPost);

  // استرجاع الجلسة
  const saved = sessionStorage.getItem("adm_pass");
  if(saved) { adminPass = saved; updateUI(); }

  // تحميل البيانات
  loadVideos(); loadBooks(); loadTips(); loadPosts();
})();

// --- منطق الصيانة والترحيب ---
async function checkMaintenance() {
  try {
    const res = await fetch(`${BACKEND}/config/status`);
    const d = await res.json();
    isMaintenance = d.maintenance;

    const maint = document.getElementById("maintenanceOverlay");
    const welcome = document.getElementById("overlay");

    if (isMaintenance) {
      maint.style.display = "flex";
      welcome.style.display = "none";
    } else {
      maint.style.display = "none";
      // الترحيب يظهر افتراضياً في HTML
    }
  } catch(e) { console.log("خطأ في الاتصال"); }
}

function enterSite() {
  document.getElementById("overlay").style.display = "none";
}

async function toggleMaintenanceMode() {
  if(!adminPass) return;
  const newState = !isMaintenance;
  if(!confirm(newState ? "تفعيل وضع الصيانة؟ سيغلق الموقع أمام الزوار." : "إلغاء الصيانة وفتح الموقع؟")) return;

  try {
    const res = await fetch(`${BACKEND}/config/maintenance`, {
      method:"POST", headers:{"Content-Type":"application/json", "x-admin-pass":adminPass},
      body: JSON.stringify({status: newState})
    });
    if(res.ok) {
      isMaintenance = newState;
      toast(newState ? "تم تفعيل الصيانة 🛠️" : "تم فتح الموقع ✅");
      updateUI();
    }
  } catch { toast("خطأ", "err"); }
}

// --- التنقل ---
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => {
    p.style.opacity = "0"; p.style.transform = "translateY(20px)";
    setTimeout(() => {
      p.classList.remove("visible");
      if(p.id === id) {
        p.classList.add("visible");
        requestAnimationFrame(()=> { p.style.opacity="1"; p.style.transform="translateY(0)"; });
      }
    }, 300);
  });
  document.querySelectorAll(".navbar a").forEach(a => a.classList.toggle("active", a.dataset.section === id));
}

// --- الأدمن ---
function toggleAdmin() {
  if(adminPass) {
    if(confirm("تسجيل خروج؟")) { adminPass=null; sessionStorage.clear(); updateUI(); toast("خرجت بنجاح"); }
  } else { document.getElementById("loginModal").classList.remove("hidden"); }
}
function closeModal() { document.getElementById("loginModal").classList.add("hidden"); }

async function onLogin(e) {
  e.preventDefault();
  const u = e.target.username.value;
  const p = e.target.password.value;
  if(u !== "sayafbadarin") return toast("خطأ في البيانات", "err");
  
  // تحقق بسيط (وهمي للدخول السريع، الأمان الحقيقي في السيرفر عند الرفع)
  adminPass = p;
  sessionStorage.setItem("adm_pass", p);
  updateUI();
  closeModal();
  toast("أهلاً بك مشرفنا");
}

function updateUI() {
  const isAdmin = !!adminPass;
  ["upload-book", "upload-tip", "upload-post"].forEach(id => document.getElementById(id).style.display = isAdmin ? "block" : "none");
  
  document.getElementById("cornerLogin").textContent = isAdmin ? "🔓" : "🔒";
  
  const mBtn = document.getElementById("maintToggleBtn");
  mBtn.style.display = isAdmin ? "block" : "none";
  mBtn.style.background = isMaintenance ? "#e74c3c" : "transparent";
  mBtn.style.color = isMaintenance ? "#fff" : "#e74c3c";

  if(isAdmin) { loadBooks(); loadTips(); loadPosts(); }
}

// --- البيانات والرفع ---
function toast(msg, type="ok") {
  const t = document.createElement("div"); t.className = "toast";
  t.innerHTML = `<span>${type==="ok"?"✅":"❌"}</span> ${msg}`;
  if(type==="err") t.style.borderRightColor = "#e74c3c";
  document.getElementById("toasts").appendChild(t);
  setTimeout(()=> { t.style.opacity="0"; setTimeout(()=>t.remove(),300); }, 3000);
}

function getId(i) { return i._id || i.id; }
function safe(s) { return s ? s.replace(/</g, "&lt;") : ""; }

// Videos
async function loadVideos() {
  const c = document.getElementById("videos");
  try {
    const r = await fetch(`${BACKEND}/youtube-feed?channelId=UChFRy4s3_0MVJ3Hmw2AMcoQ`);
    const txt = await r.text();
    const doc = new DOMParser().parseFromString(txt, "application/xml");
    c.innerHTML = Array.from(doc.querySelectorAll("entry")).slice(0,30).map(en => {
       const vid = en.querySelector("videoId").textContent;
       return `<div class="card"><a href="https://youtu.be/${vid}" target="_blank"><img src="https://img.youtube.com/vi/${vid}/hqdefault.jpg"></a><div class="card-content"><p>${safe(en.querySelector("title").textContent)}</p></div></div>`;
    }).join("");
  } catch { c.innerHTML = "<p>فشل تحميل الفيديوهات</p>"; }
}

// Books
async function loadBooks() {
  const r = await fetch(`${BACKEND}/books`); const j = await r.json();
  if(j.ok) document.getElementById("book-list").innerHTML = j.data.map(b => 
    `<div class="card"><div class="card-content"><h3>${safe(b.title)}</h3><a href="${b.url}" target="_blank" style="color:#d4af37">🔗 تصفح الكتاب</a>${adminPass ? `<br><br><button onclick="del('books','${getId(b)}')">حذف</button>` : ''}</div></div>`
  ).join("");
}
async function onUploadBook(e) {
  e.preventDefault();
  if(!adminPass) return;
  const res = await fetch(`${BACKEND}/books`, {method:"POST", headers:{"Content-Type":"application/json","x-admin-pass":adminPass}, body:JSON.stringify({title:e.target.title.value, url:e.target.url.value})});
  if(res.ok) { toast("تم"); loadBooks(); e.target.reset(); }
}

// Tips
async function loadTips() {
  const r = await fetch(`${BACKEND}/tips`); const j = await r.json();
  if(j.ok) document.getElementById("tip-list").innerHTML = j.data.map(t => 
    `<div class="card"><div class="card-content"><p style="white-space:pre-wrap;">${safe(t.text)}</p>${adminPass ? `<button onclick="del('tips','${getId(t)}')">حذف</button>` : ''}</div></div>`
  ).join("");
}
async function onUploadTip(e) {
  e.preventDefault();
  const res = await fetch(`${BACKEND}/tips`, {method:"POST", headers:{"Content-Type":"application/json","x-admin-pass":adminPass}, body:JSON.stringify({text:e.target.text.value})});
  if(res.ok) { toast("تم"); loadTips(); e.target.reset(); }
}

// Posts
async function loadPosts() {
  const r = await fetch(`${BACKEND}/posts`); const j = await r.json();
  if(j.ok) document.getElementById("post-list").innerHTML = j.data.map(p => 
    `<div class="card"><div class="card-content"><h3>${safe(p.title)}</h3>${p.videoUrl?`<video controls src="${p.videoUrl}" style="width:100%"></video>`:''}<p>${safe(p.description)}</p>${adminPass ? `<button onclick="del('posts','${getId(p)}')">حذف</button>` : ''}</div></div>`
  ).join("");
}
async function onUploadPost(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button"); btn.textContent="⏳..."; btn.disabled=true;
  try {
    let vUrl = "";
    if(e.target.videoFile.files[0]) {
      const fd = new FormData(); fd.append("file", e.target.videoFile.files[0]); fd.append("upload_preset", CLOUDINARY_PRESET);
      const cR = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`, {method:"POST", body:fd});
      vUrl = (await cR.json()).secure_url;
    }
    const res = await fetch(`${BACKEND}/posts`, {method:"POST", headers:{"Content-Type":"application/json","x-admin-pass":adminPass}, body:JSON.stringify({title:e.target.title.value, description:e.target.description.value, videoUrl:vUrl})});
    if(res.ok) { toast("تم"); loadPosts(); e.target.reset(); } else toast("فشل", "err");
  } catch { toast("خطأ", "err"); }
  btn.textContent="نشر"; btn.disabled=false;
}

window.del = async(type, id) => {
  if(!confirm("حذف؟")) return;
  await fetch(`${BACKEND}/${type}/${id}`, {method:"DELETE", headers:{"x-admin-pass":adminPass}});
  if(type==="books") loadBooks(); else if(type==="tips") loadTips(); else loadPosts();
  toast("حذف");
};
