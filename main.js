// ==================== إعدادات ====================
const CONFIG = {
  BACKEND: "https://mosa-backend-dr63.onrender.com", 
  CLOUDINARY: { CLOUD_NAME: "dkdnq0zj3", PRESET: "unsigned_posts_preset" },
  YOUTUBE: "UChFRy4s3_0MVJ3Hmw2AMcoQ"
};
// ================================================

let currentUser = JSON.parse(sessionStorage.getItem("mosa_user")) || null;
let isMaintenance = false;

(async function init() {
  await checkMaintenance();
  if(document.getElementById('favorites-grid')) loadFavorites();
  
  document.getElementById("cornerLogin").addEventListener("click", () => {
    if(currentUser) openDashboard();
    else document.getElementById('login-modal').classList.add('active');
  });

  if (currentUser) updateUI();
  loadContent();
})();

// --- API Helper ---
function getAuthHeaders() {
  if (!currentUser) return { "Content-Type": "application/json" };
  return { "Content-Type": "application/json", "x-username": currentUser.username, "x-password": currentUser.password };
}
async function api(url, method="GET", body=null) {
  try {
    const res = await fetch(CONFIG.BACKEND + url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : null });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "خطأ");
    return data;
  } catch (err) { showToast(err.message, 'error'); throw err; }
}

// --- Dashboard Logic ---
function openDashboard() { document.getElementById('dashboard-overlay').classList.add('active'); }
function closeDashboard() { document.getElementById('dashboard-overlay').classList.remove('active'); loadContent(); }

function updateUI() {
  if (!currentUser) return;
  const isSuper = currentUser.role === 'super';
  
  document.getElementById('admin-float-btn').style.display = 'flex';
  document.getElementById('dash-user-name').innerText = currentUser.username + (isSuper?' (👑)':'');
  
  const superMenu = document.getElementById('super-admin-menu');
  if(superMenu) superMenu.style.display = isSuper ? 'flex' : 'none';
  
  document.getElementById("cornerLogin").innerText = "🔓";
}

async function loadDashSection(section) {
  const content = document.getElementById('dash-content');
  content.innerHTML = '<p style="color:#aaa;text-align:center">جاري التحميل...</p>';
  
  document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  if (section === 'users') {
    // ... (كود المستخدمين كما هو) ...
    try {
      const res = await api('/users');
      let html = `<div style="background:#1a1a1a; padding:15px; border-radius:8px; margin-bottom:20px;">
          <h4 style="color:var(--gold); margin-top:0">إضافة مشرف</h4>
          <form onsubmit="addUser(event)" style="display:flex; gap:10px; flex-wrap:wrap">
            <input name="u" placeholder="الاسم" required style="margin:0;flex:1">
            <input name="p" placeholder="كلمة السر" required style="margin:0;flex:1">
            <select name="r" style="margin:0;flex:1;background:#222;color:#fff"><option value="mod">مشرف</option><option value="super">رئيسي</option></select>
            <button class="btn">إضافة</button>
          </form>
        </div><table class="admin-table"><thead><tr><th>الاسم</th><th>الدور</th><th>إجراء</th></tr></thead><tbody>`;
      res.data.forEach(u => {
        html += `<tr><td>${u.username}</td><td>${u.role==='super'?'👑 رئيسي':'👤 مشرف'}</td><td>${u.username!==currentUser.username ? `<button class="btn-danger" style="padding:5px 10px" onclick="del('users','${u._id}', true)">حذف</button>` : '-'}</td></tr>`;
      });
      content.innerHTML = html + `</tbody></table>`;
    } catch { content.innerHTML = "فشل التحميل"; }

  } else if (section === 'maintenance') {
    const status = isMaintenance ? "مفعل (الموقع مغلق)" : "معطل (الموقع يعمل)";
    content.innerHTML = `<div style="text-align:center; margin-top:50px"><h2 style="color:${isMaintenance?'var(--danger)':'var(--success)'}">${status}</h2><button class="btn" style="padding:15px 30px; margin-top:20px" onclick="toggleMaintenance()">${isMaintenance ? "إلغاء الصيانة ✅" : "تفعيل الصيانة 🛠️"}</button></div>`;

  } else if (section.startsWith('manage-')) {
    const type = section.split('-')[1];
    const titles = { books: "الكتب", tips: "الإرشادات", posts: "المشاركات" };
    
    // فورم الإضافة
    let formHtml = '';
    if(type === 'books') formHtml = `<input id="new-t" placeholder="عنوان الكتاب"><input id="new-u" placeholder="رابط الكتاب">`;
    else if(type === 'tips') formHtml = `<textarea id="new-t" rows="2" placeholder="نص الإرشاد"></textarea>`;
    else if(type === 'posts') formHtml = `<input id="new-t" placeholder="العنوان"><textarea id="new-d" placeholder="الوصف"></textarea><input type="file" id="new-f" accept="video/*" style="margin-top:5px">`;

    content.innerHTML = `<div style="background:#1a1a1a; padding:15px; border-radius:8px; margin-bottom:20px;"><h4 style="color:var(--gold); margin-top:0">إضافة ${titles[type]}</h4><div style="display:flex; flex-direction:column; gap:10px">${formHtml}<button class="btn" onclick="addItem('${type}')">نشر</button></div></div><h4 style="color:#fff">قائمة ${titles[type]}</h4><div id="dash-list">جاري الجلب...</div>`;
    
    // جلب البيانات
    try {
      const res = await api(`/${type}`);
      const listDiv = document.getElementById('dash-list');
      if(res.data.length === 0) { listDiv.innerHTML = "لا يوجد محتوى"; return; }
      
      let table = `<table class="admin-table"><thead><tr><th>العنوان/المحتوى</th><th>إجراء</th></tr></thead><tbody>`;
      res.data.forEach(i => {
        // تشفير البيانات لتمريرها بأمان داخل HTML
        const safeTitle = encodeURIComponent(i.title || i.text || "");
        const safeDesc = encodeURIComponent(i.description || i.url || "");
        
        table += `<tr>
          <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${i.title || i.text}</td>
          <td>
            <button class="btn-outline" style="padding:5px 10px; font-size:0.8rem; margin-left:5px" 
              onclick="editItem('${type}', '${i._id}', decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeDesc}'))">تعديل</button>
            <button class="btn-danger" style="padding:5px 10px; font-size:0.8rem" onclick="del('${type}', '${i._id}', true)">حذف</button>
          </td>
        </tr>`;
      });
      listDiv.innerHTML = table + `</tbody></table>`;
    } catch { document.getElementById('dash-list').innerHTML = "فشل"; }
  }
}

// --- دالة التعديل الجديدة (الذكية) ---
async function editItem(type, id, oldVal1, oldVal2) {
  let body = {};
  
  if(type === 'tips') {
    const text = prompt("تعديل النص:", oldVal1);
    if(text === null) return;
    body = { text };
  } else if (type === 'books') {
    const title = prompt("عنوان الكتاب:", oldVal1);
    if(title === null) return;
    const url = prompt("رابط الكتاب:", oldVal2);
    if(url === null) return;
    body = { title, url };
  } else if (type === 'posts') {
    const title = prompt("عنوان المشاركة:", oldVal1);
    if(title === null) return;
    const description = prompt("وصف المشاركة:", oldVal2);
    if(description === null) return;
    body = { title, description };
  }

  try {
    await api(`/${type}/${id}`, 'PUT', body);
    showToast("تم التحديث");
    loadDashSection('manage-'+type); // تحديث القائمة
  } catch {}
}

async function addUser(e) {
  e.preventDefault();
  try { await api('/users', 'POST', { username:e.target.u.value, password:e.target.p.value, role:e.target.r.value }); showToast("تم"); loadDashSection('users'); } catch {}
}

async function addItem(type) {
  const body = {};
  if(type === 'books') { body.title = document.getElementById('new-t').value; body.url = document.getElementById('new-u').value; }
  else if (type === 'tips') { body.text = document.getElementById('new-t').value; }
  else if (type === 'posts') {
    body.title = document.getElementById('new-t').value;
    body.description = document.getElementById('new-d').value;
    const file = document.getElementById('new-f').files[0];
    if(file) {
      showToast("جاري رفع الفيديو...", "info");
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CONFIG.CLOUDINARY.PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.CLOUD_NAME}/upload`, {method:"POST", body:fd});
      body.videoUrl = (await res.json()).secure_url;
    }
  }
  try { await api(`/${type}`, 'POST', body); showToast("تم النشر"); loadDashSection('manage-'+type); } catch {}
}

async function del(type, id, refreshDash=false) {
  if(!confirm("تأكيد الحذف؟")) return;
  try {
    await api(`/${type}/${id}`, 'DELETE');
    showToast("تم الحذف");
    if(refreshDash) {
      if(type==='users') loadDashSection('users'); else loadDashSection('manage-'+type);
    }
  } catch {}
}

async function toggleMaintenance() {
  const newState = !isMaintenance;
  if(!confirm(newState ? "إغلاق الموقع؟" : "فتح الموقع؟")) return;
  try { await api('/config/maintenance', 'POST', { status: newState }); isMaintenance = newState; loadDashSection('maintenance'); } catch {}
}

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  try {
    const res = await fetch(`${CONFIG.BACKEND}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:u, password:p}) });
    const json = await res.json();
    if(json.ok) {
      currentUser = { username: json.username, role: json.role, password: p };
      sessionStorage.setItem("mosa_user", JSON.stringify(currentUser));
      document.getElementById('login-modal').classList.remove('active');
      document.getElementById("maintenance-overlay").style.display = "none";
      updateUI();
      openDashboard();
      showToast(`مرحباً ${json.username}`);
    } else showToast(json.message, "error");
  } catch { showToast("خطأ اتصال", "error"); }
};

function logout() {
  sessionStorage.removeItem("mosa_user");
  location.reload();
}

async function loadContent() { loadVideos(); loadBooks(); loadTips(); loadPosts(); }

// --- العرض العام (بدون أزرار حذف) ---
async function loadVideos() {
  const c = document.getElementById("videos-grid");
  try {
    const r = await fetch(`${CONFIG.BACKEND}/youtube-feed?channelId=${CONFIG.YOUTUBE}`);
    const t = await r.text(); const d = new DOMParser().parseFromString(t, "text/xml");
    c.innerHTML = Array.from(d.querySelectorAll("entry")).slice(0, 30).map(e => {
       const v = e.querySelector("videoId").textContent; const tit = e.querySelector("title").textContent;
       return `<div class="card"><a href="https://youtu.be/${v}" target="_blank"><img src="https://img.youtube.com/vi/${v}/hqdefault.jpg" class="video-thumb" loading="lazy"></a><div class="card-content"><p class="card-title">${tit}</p></div>${getActionsHTML(v, 'video', tit, '', `https://youtu.be/${v}`, `https://img.youtube.com/vi/${v}/hqdefault.jpg`)}</div>`;
    }).join("");
  } catch {}
}
async function loadBooks() { try { const r = await fetch(`${CONFIG.BACKEND}/books`); const j = await r.json(); document.getElementById('books-grid').innerHTML = j.data.map(b => `<div class="card"><div style="height:180px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden">${b.url.match(/\/d\/([^/]+)/)?.[1] ? `<iframe src="https://drive.google.com/file/d/${b.url.match(/\/d\/([^/]+)/)[1]}/preview" style="width:100%;height:100%;border:none;pointer-events:none"></iframe>` : '📚'}</div><div class="card-content"><h3 class="card-title">${b.title}</h3><div style="display:flex;gap:5px;margin-bottom:10px"><a href="${b.url}" target="_blank" class="btn" style="flex:1;text-align:center">قراءة</a></div></div>${getActionsHTML(b._id, 'book', b.title, '', b.url, '')}</div>`).join(''); } catch{} }
async function loadTips() { try { const r = await fetch(`${CONFIG.BACKEND}/tips`); const j = await r.json(); document.getElementById('tips-grid').innerHTML = j.data.map(t => `<div class="card" style="border-right:4px solid var(--gold)"><div class="card-content"><p style="white-space:pre-wrap">${t.text}</p></div>${getActionsHTML(t._id, 'tip', 'إرشاد', t.text, window.location.href, '')}</div>`).join(''); } catch{} }
async function loadPosts() { try { const r = await fetch(`${CONFIG.BACKEND}/posts`); const j = await r.json(); document.getElementById('posts-grid').innerHTML = j.data.map(p => `<div class="card">${p.videoUrl?`<video controls src="${p.videoUrl}" style="width:100%;height:200px;background:#000"></video>`:''}<div class="card-content"><h3 class="card-title">${p.title}</h3><p style="color:#ccc;font-size:0.9rem;white-space:pre-wrap">${p.description}</p></div>${getActionsHTML(p._id, 'post', p.title, p.description, p.videoUrl||window.location.href, '')}</div>`).join(''); } catch{} }

function getFavs() { return JSON.parse(localStorage.getItem('mosa_favs') || '[]'); }
function isFav(id) { return getFavs().some(x => x.id === id); }
function toggleFav(id, type, title, content, url, img) {
  let favs = getFavs(); const idx = favs.findIndex(x => x.id === id);
  if (idx > -1) { favs.splice(idx, 1); showToast("تمت الإزالة 🗑️", "error"); } 
  else { favs.push({ id, type, title, content, url, img }); showToast("تم الحفظ ❤️"); }
  localStorage.setItem('mosa_favs', JSON.stringify(favs));
  const btn = document.getElementById(`fav-btn-${id}`); if(btn) btn.classList.toggle('active');
  if(document.getElementById('favorites-page').classList.contains('visible')) loadFavorites();
}
function getActionsHTML(id, type, title, content, url, img) {
  const safeTitle = encodeURIComponent(title||""); const safeContent = encodeURIComponent(content||""); const safeUrl = encodeURIComponent(url||""); const safeImg = encodeURIComponent(img||"");
  return `<div class="card-actions"><button id="fav-btn-${id}" class="action-btn fav-btn ${isFav(id)?'active':''}" onclick="toggleFav('${id}', '${type}', decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeContent}'), decodeURIComponent('${safeUrl}'), decodeURIComponent('${safeImg}'))">❤</button><button class="action-btn share-btn" onclick="shareItem(decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeUrl}'))">🔗</button></div>`;
}
function loadFavorites() {
  const f = getFavs(); const c = document.getElementById('favorites-grid'); if(!f.length) { c.innerHTML="<p style='text-align:center;width:100%;color:#aaa'>لا مفضلات</p>"; return; } c.innerHTML = f.map(i => `<div class="card">${i.type==='video'?`<a href="${i.url}" target="_blank"><img src="${i.img}" class="video-thumb"></a>`:i.type==='book'?`<div style="height:100px;background:#222;display:flex;align-items:center;justify-content:center;font-size:3rem">📚</div><a href="${i.url}" target="_blank" class="btn" style="text-align:center">فتح</a>`:i.type==='post'&&i.url.includes('cloud')?`<video controls src="${i.url}" style="width:100%;height:200px"></video>`:''}<div class="card-content"><h3 class="card-title">${i.title}</h3><p style="font-size:0.9rem;color:#ccc">${i.content}</p></div>${getActionsHTML(i.id, i.type, i.title, i.content, i.url, i.img)}</div>`).join('');
}
function shareItem(title, url) { if(navigator.share) navigator.share({title, text:title, url}).catch(()=>{}); else navigator.clipboard.writeText(url).then(()=>showToast("تم النسخ")); }
async function checkMaintenance() {
  try { const r = await fetch(`${CONFIG.BACKEND}/config/status`); const d = await r.json(); isMaintenance = d.maintenance; if(currentUser) return; if(isMaintenance){document.getElementById('maintenance-overlay').style.display='flex';document.getElementById('welcome-overlay').classList.remove('active');} } catch{}
}
function enterSite() { document.getElementById('welcome-overlay').classList.remove('active'); }
function showToast(msg, type='success') { const b = document.createElement('div'); b.className=`toast ${type}`; b.innerText=msg; document.getElementById('toast-container').appendChild(b); setTimeout(()=>b.remove(),3000); }
window.switchPage = (id, btn) => { document.querySelectorAll('.page').forEach(p=>p.classList.remove('visible')); document.getElementById(id+'-page').classList.add('visible'); document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); if(id==='favorites') loadFavorites(); };
document.getElementById("force-enter-btn").onclick = () => { document.getElementById('login-modal').classList.add('active'); };
