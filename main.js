// ==================== إعدادات ====================
const CONFIG = {
  BACKEND: "https://mosa-backend-dr63.onrender.com", 
  CLOUDINARY: { CLOUD_NAME: "dkdnq0zj3", PRESET: "unsigned_posts_preset" },
  YOUTUBE: "UChFRy4s3_0MVJ3Hmw2AMcoQ"
};
// ================================================

// الجلسة الحالية
let currentUser = JSON.parse(sessionStorage.getItem("mosa_user")) || null;
let isMaintenance = false;

// --- عند بدء التشغيل ---
(async function init() {
  await checkMaintenance();
  if(document.getElementById('favorites-grid')) loadFavorites();
  
  // استرجاع حالة الدخول
  if (currentUser) updateUI();
  
  loadContent();
})();

// --- أدوات المصادقة ---
function saveSession(user) {
  currentUser = user;
  sessionStorage.setItem("mosa_user", JSON.stringify(user));
}

function getAuthHeaders() {
  if (!currentUser) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    "x-username": currentUser.username,
    "x-password": currentUser.password
  };
}

// --- تسجيل الدخول والخروج ---
document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${CONFIG.BACKEND}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    });
    const json = await res.json();
    
    if(json.ok) {
      // نخزن البيانات محلياً (كلمة المرور تُخزن فقط للجلسة الحالية لإرسالها في الهيدر)
      saveSession({ username: json.username, role: json.role, password: p });
      updateUI();
      toggleModal('login-modal', false);
      document.getElementById("maintenance-overlay").style.display = "none";
      showToast(`أهلاً بك: ${json.username}`);
      loadContent(); 
    } else {
      showToast(json.message, "error");
    }
  } catch { showToast("فشل الاتصال بالسيرفر", "error"); }
};

function logout() {
  currentUser = null;
  sessionStorage.removeItem("mosa_user");
  location.reload();
}

function updateUI() {
  if (!currentUser) return;
  const isSuper = currentUser.role === 'super';
  
  // 1. تلوين زر الإعدادات
  const adminBtn = document.getElementById('admin-toggle');
  adminBtn.style.background = 'var(--gold)'; adminBtn.style.color = '#000';
  
  // 2. أزرار التحكم (للمشرف الرئيسي فقط)
  document.getElementById('maint-toggle').style.display = isSuper ? 'flex' : 'none';
  document.getElementById('users-toggle').style.display = isSuper ? 'flex' : 'none';
  
  const mBtn = document.getElementById('maint-toggle');
  if(isSuper) {
     mBtn.style.background = isMaintenance ? 'var(--danger)' : 'rgba(0,0,0,0.6)';
     mBtn.style.color = isMaintenance ? '#fff' : 'var(--danger)';
  }

  // 3. عرض نماذج الرفع للجميع
  document.querySelectorAll('.upload-box').forEach(e => e.style.display = 'block');
  
  // 4. الفوتر
  document.getElementById('admin-actions').style.display = 'block';
  document.getElementById('current-user-display').innerText = currentUser.username + (isSuper ? " (👑)" : "");
}

// --- إدارة المستخدمين (للمشرف الرئيسي) ---
function openUsersManager() { toggleModal('users-modal', true); loadUsersList(); }

async function loadUsersList() {
  const container = document.getElementById("users-list");
  container.innerHTML = "جاري التحميل...";
  try {
    const res = await fetch(`${CONFIG.BACKEND}/users`, { headers: getAuthHeaders() });
    const json = await res.json();
    if(json.ok) {
      container.innerHTML = json.data.map(u => `
        <div style="background:#222; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #333;">
          <div>
            <span style="color:var(--gold); font-weight:bold;">${u.username}</span>
            <span style="font-size:0.8rem; background:#444; padding:2px 6px; border-radius:4px; margin-right:5px;">
              ${u.role === 'super' ? '👑 رئيسي' : '👤 مشرف'}
            </span>
          </div>
          ${u.username !== currentUser.username ? `
          <div style="display:flex; gap:5px;">
            <button class="btn" style="padding:5px 10px; font-size:0.8rem;" onclick="editUser('${u._id}')">تعديل</button>
            <button class="btn btn-danger" style="padding:5px 10px; font-size:0.8rem;" onclick="deleteUser('${u._id}')">حذف</button>
          </div>` : ''}
        </div>
      `).join('');
    }
  } catch { container.innerHTML = "فشل التحميل"; }
}

document.getElementById('add-user-form').onsubmit = async (e) => {
  e.preventDefault();
  const username = e.target.newuser.value;
  const password = e.target.newpass.value;
  const role = e.target.newrole.value;
  
  try {
    const res = await fetch(`${CONFIG.BACKEND}/users`, {
      method: "POST", headers: getAuthHeaders(),
      body: JSON.stringify({ username, password, role })
    });
    const json = await res.json();
    if(json.ok) { showToast("تمت الإضافة"); loadUsersList(); e.target.reset(); }
    else showToast(json.message, "error");
  } catch { showToast("خطأ", "error"); }
};

async function deleteUser(id) {
  if(!confirm("حذف هذا المشرف؟")) return;
  await fetch(`${CONFIG.BACKEND}/users/${id}`, { method:"DELETE", headers: getAuthHeaders() });
  loadUsersList();
}

async function editUser(id) {
  const newPass = prompt("كلمة المرور الجديدة (اتركها فارغة لعدم التغيير):");
  const newRole = confirm("ترقية لمشرف رئيسي؟ (موافق=نعم / إلغاء=مشرف عادي)") ? 'super' : 'mod';
  
  const body = { role: newRole };
  if(newPass) body.password = newPass;
  
  await fetch(`${CONFIG.BACKEND}/users/${id}`, {
    method:"PUT", headers: getAuthHeaders(), body: JSON.stringify(body)
  });
  showToast("تم التحديث");
  loadUsersList();
}

// --- الصيانة والمفضلة والبيانات (نفس السابق) ---
function getFavs() { return JSON.parse(localStorage.getItem('mosa_favs') || '[]'); }
function isFav(id) { return getFavs().some(x => x.id === id); }
function shareItem(title, url) {
  if (navigator.share) navigator.share({ title, text: title, url }).catch(()=>{});
  else navigator.clipboard.writeText(url).then(() => showToast("تم نسخ الرابط"));
}
function toggleFav(id, type, title, content, url, img) {
  let favs = getFavs();
  const idx = favs.findIndex(x => x.id === id);
  if (idx > -1) { favs.splice(idx, 1); showToast("تمت الإزالة 🗑️", "error"); } 
  else { favs.push({ id, type, title, content, url, img }); showToast("تم الحفظ ❤️"); }
  localStorage.setItem('mosa_favs', JSON.stringify(favs));
  const btn = document.getElementById(`fav-btn-${id}`);
  if(btn) btn.classList.toggle('active');
  if(document.getElementById('favorites-page').classList.contains('visible')) loadFavorites();
}
function getActionsHTML(id, type, title, content, url, img) {
  const safeTitle = encodeURIComponent(title||""); const safeContent = encodeURIComponent(content||""); const safeUrl = encodeURIComponent(url||""); const safeImg = encodeURIComponent(img||"");
  return `<div class="card-actions"><button id="fav-btn-${id}" class="action-btn fav-btn ${isFav(id)?'active':''}" onclick="toggleFav('${id}', '${type}', decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeContent}'), decodeURIComponent('${safeUrl}'), decodeURIComponent('${safeImg}'))">❤</button><button class="action-btn share-btn" onclick="shareItem(decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeUrl}'))">🔗</button></div>`;
}

async function checkMaintenance() {
  try {
    const res = await fetch(`${CONFIG.BACKEND}/config/status`);
    const d = await res.json();
    isMaintenance = d.maintenance;
    const maint = document.getElementById("maintenance-overlay");
    const welcome = document.getElementById("welcome-overlay");
    if(currentUser) { maint.style.display = "none"; return; }
    if (isMaintenance) { maint.style.display = "flex"; welcome.style.display = "none"; welcome.classList.remove('active'); } 
    else { maint.style.display = "none"; }
  } catch(e) {}
}

async function toggleMaintenance() {
  if(!currentUser || currentUser.role !== 'super') return;
  const newState = !isMaintenance;
  if(!confirm(newState ? "إغلاق الموقع للصيانة؟" : "فتح الموقع؟")) return;
  try {
    const res = await fetch(`${CONFIG.BACKEND}/config/maintenance`, { method:"POST", headers: getAuthHeaders(), body: JSON.stringify({status: newState}) });
    if(res.ok) { isMaintenance = newState; showToast(res.message); updateUI(); }
  } catch { showToast("خطأ", "error"); }
}

function loadContent() { checkAdmin(); loadVideos(); loadBooks(); loadTips(); loadPosts(); }
function handleAdminClick() { currentUser ? (confirm("خروج؟") && logout()) : toggleModal('login-modal', true); }
function toggleModal(id, show) { document.getElementById(id).classList.toggle('active', show); }
function enterSite() { document.getElementById('welcome-overlay').classList.remove('active'); }
document.getElementById("force-enter-btn").onclick = () => { toggleModal('login-modal', true); };
function showToast(msg, type='success') {
  const box = document.createElement('div'); box.className = `toast ${type}`; box.innerText = msg;
  document.getElementById('toast-container').appendChild(box); setTimeout(() => box.remove(), 3000);
}
function checkAdmin() {} // Placeholder replaced by updateUI

// Fetchers
async function api(url, method="GET", body=null) {
  try {
    const res = await fetch(CONFIG.BACKEND + url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : null });
    const data = await res.json(); if (!res.ok) throw new Error(data.message || "خطأ"); return data;
  } catch (err) { showToast(err.message, 'error'); throw err; }
}

async function loadVideos() {
  const c = document.getElementById("videos-grid");
  try {
    const r = await fetch(`${CONFIG.BACKEND}/youtube-feed?channelId=${CONFIG.YOUTUBE}`);
    const t = await r.text(); const d = new DOMParser().parseFromString(t, "text/xml");
    c.innerHTML = Array.from(d.querySelectorAll("entry")).slice(0, 30).map(e => {
       const v = e.querySelector("videoId").textContent; const tit = e.querySelector("title").textContent;
       return `<div class="card"><a href="https://youtu.be/${v}" target="_blank"><img src="https://img.youtube.com/vi/${v}/hqdefault.jpg" class="video-thumb" loading="lazy"></a><div class="card-content"><p class="card-title">${tit}</p></div>${getActionsHTML(v, 'video', tit, '', `https://youtu.be/${v}`, `https://img.youtube.com/vi/${v}/hqdefault.jpg`)}</div>`;
    }).join("");
  } catch { c.innerHTML = "<p>جاري التحميل...</p>"; }
}
async function loadBooks() { try { const r = await api('/books'); document.getElementById('books-grid').innerHTML = r.data.map(b => `<div class="card"><div style="height:180px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden">${b.url.match(/\/d\/([^/]+)/)?.[1] ? `<iframe src="https://drive.google.com/file/d/${b.url.match(/\/d\/([^/]+)/)[1]}/preview" style="width:100%;height:100%;border:none;pointer-events:none"></iframe>` : '📚'}</div><div class="card-content"><h3 class="card-title">${b.title}</h3><div style="display:flex;gap:5px;margin-bottom:10px"><a href="${b.url}" target="_blank" class="btn" style="flex:1;text-align:center">قراءة</a>${currentUser?`<button onclick="del('books','${b._id}')" class="btn btn-danger">حذف</button>`:''}</div></div>${getActionsHTML(b._id, 'book', b.title, '', b.url, '')}</div>`).join(''); } catch{} }
async function loadTips() { try { const r = await api('/tips'); document.getElementById('tips-grid').innerHTML = r.data.map(t => `<div class="card" style="border-right:4px solid var(--gold)"><div class="card-content"><p style="white-space:pre-wrap">${t.text}</p>${currentUser?`<div style="margin-top:10px;display:flex;gap:5px;justify-content:flex-end"><button onclick="editTip('${t._id}', '${t.text.replace(/\n/g,'\\n').replace(/'/g, "\\'")}')" class="btn">تعديل</button><button onclick="del('tips','${t._id}')" class="btn btn-danger">حذف</button></div>`:''}</div>${getActionsHTML(t._id, 'tip', 'إرشاد', t.text, window.location.href, '')}</div>`).join(''); } catch{} }
async function loadPosts() { try { const r = await api('/posts'); document.getElementById('posts-grid').innerHTML = r.data.map(p => `<div class="card">${p.videoUrl?`<video controls src="${p.videoUrl}" style="width:100%;height:200px;background:#000"></video>`:''}<div class="card-content"><h3 class="card-title">${p.title}</h3><p style="color:#ccc;font-size:0.9rem;white-space:pre-wrap">${p.description}</p>${currentUser?`<button onclick="del('posts','${p._id}')" class="btn btn-danger" style="width:100%;margin-top:10px">حذف</button>`:''}</div>${getActionsHTML(p._id, 'post', p.title, p.description, p.videoUrl||window.location.href, '')}</div>`).join(''); } catch{} }
function loadFavorites() { const f = getFavs(); const c = document.getElementById('favorites-grid'); if(!f.length) { c.innerHTML="<p style='text-align:center;width:100%;color:#aaa'>لا مفضلات</p>"; return; } c.innerHTML = f.map(i => `<div class="card">${i.type==='video'?`<a href="${i.url}" target="_blank"><img src="${i.img}" class="video-thumb"></a>`:i.type==='book'?`<div style="height:100px;background:#222;display:flex;align-items:center;justify-content:center;font-size:3rem">📚</div><a href="${i.url}" target="_blank" class="btn" style="display:block;text-align:center;margin-top:5px">فتح</a>`:i.type==='post'&&i.url.includes('cloud')?`<video controls src="${i.url}" style="width:100%;height:200px"></video>`:''}<div class="card-content"><h3 class="card-title">${i.title}</h3><p style="font-size:0.9rem;color:#ccc">${i.content}</p></div>${getActionsHTML(i.id, i.type, i.title, i.content, i.url, i.img)}</div>`).join(''); }

async function del(type, id) { if(confirm("حذف؟")) { await api(`/${type}/${id}`, 'DELETE'); showToast("تم الحذف"); if(type=='books')loadBooks();if(type=='tips')loadTips();if(type=='posts')loadPosts(); } }
document.getElementById('book-form').onsubmit = async (e) => { e.preventDefault(); await api('/books', 'POST', {title:e.target.title.value, url:e.target.url.value}); showToast("تم"); e.target.reset(); loadBooks(); };
document.getElementById('tip-form').onsubmit = async (e) => { e.preventDefault(); await api('/tips', 'POST', {text:e.target.text.value}); showToast("تم"); e.target.reset(); loadTips(); };
document.getElementById('post-form').onsubmit = async (e) => { e.preventDefault(); const btn=e.target.querySelector('button'); btn.innerText="⏳..."; btn.disabled=true; try { let vUrl=""; if(e.target.videoFile.files[0]) { const fd=new FormData(); fd.append("file",e.target.videoFile.files[0]); fd.append("upload_preset",CONFIG.CLOUDINARY.PRESET); const r=await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.CLOUD_NAME}/upload`,{method:"POST",body:fd}); vUrl=(await r.json()).secure_url; } await api('/posts', 'POST', {title:e.target.title.value, description:e.target.description.value, videoUrl:vUrl}); showToast("تم"); e.target.reset(); loadPosts(); } catch{showToast("فشل","error");} btn.innerText="نشر"; btn.disabled=false; };
window.editTip = async (id, txt) => { const n = prompt("تعديل:", txt); if(n && n!==txt) { await api(`/tips/${id}`, 'PUT', {text:n}); showToast("تم"); loadTips(); } };
window.switchPage = (id, btn) => { document.querySelectorAll('.page').forEach(p=>p.classList.remove('visible')); document.getElementById(id+'-page').classList.add('visible'); document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); if(id==='favorites') loadFavorites(); };
