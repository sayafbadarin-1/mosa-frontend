// ==================== إعدادات ====================
const CONFIG = {
  BACKEND: "https://mosa-backend-dr63.onrender.com", 
  CLOUDINARY: { CLOUD_NAME: "dkdnq0zj3", PRESET: "unsigned_posts_preset" },
  YOUTUBE: "UChFRy4s3_0MVJ3Hmw2AMcoQ"
};
// ================================================

let state = { adminPass: sessionStorage.getItem("adminPass") };
let isMaintenance = false;

// --- عند بدء التشغيل ---
(async function init() {
  await checkMaintenance();
  if(document.getElementById('favorites-grid')) loadFavorites();
  loadContent();
})();

// --- دوال المساعدة للمفضلة والمشاركة ---
function getFavs() { return JSON.parse(localStorage.getItem('mosa_favs') || '[]'); }
function isFav(id) { return getFavs().some(x => x.id === id); }

function shareItem(title, url) {
  if (navigator.share) {
    navigator.share({ title: title, text: title + "\nمن موقع الشيخ موسى الخلايلة", url: url })
      .catch(console.error);
  } else {
    navigator.clipboard.writeText(url).then(() => showToast("تم نسخ الرابط 📋"));
  }
}

function toggleFav(id, type, title, content, url, img) {
  let favs = getFavs();
  const idx = favs.findIndex(x => x.id === id);
  if (idx > -1) {
    favs.splice(idx, 1);
    showToast("تمت الإزالة من المفضلة 🗑️", "error");
  } else {
    favs.push({ id, type, title, content, url, img });
    showToast("تم الحفظ في المفضلة ❤️");
  }
  localStorage.setItem('mosa_favs', JSON.stringify(favs));
  const btn = document.getElementById(`fav-btn-${id}`);
  if(btn) btn.classList.toggle('active');
  if(document.getElementById('favorites-page').classList.contains('visible')) loadFavorites();
}

function getActionsHTML(id, type, title, content, url, img) {
  const safeTitle = encodeURIComponent(title || "");
  const safeContent = encodeURIComponent(content || "");
  const safeUrl = encodeURIComponent(url || "");
  const safeImg = encodeURIComponent(img || "");
  
  return `
  <div class="card-actions">
    <button id="fav-btn-${id}" class="action-btn fav-btn ${isFav(id)?'active':''}" 
      onclick="toggleFav('${id}', '${type}', decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeContent}'), decodeURIComponent('${safeUrl}'), decodeURIComponent('${safeImg}'))" 
      title="إضافة للمفضلة">
      ❤
    </button>
    <button class="action-btn share-btn" 
      onclick="shareItem(decodeURIComponent('${safeTitle}'), decodeURIComponent('${safeUrl}'))" 
      title="مشاركة">
      🔗
    </button>
  </div>`;
}

// --- تحميل البيانات ---
async function loadVideos() {
  const container = document.getElementById("videos-grid");
  try {
    const proxyRes = await fetch(`${CONFIG.BACKEND}/youtube-feed?channelId=${CONFIG.YOUTUBE}`);
    if(proxyRes.ok){
       const text = await proxyRes.text();
       const parser = new DOMParser();
       const xml = parser.parseFromString(text, "text/xml");
       const items = Array.from(xml.querySelectorAll("entry")).slice(0, 30).map(e => ({
          title: e.querySelector("title").textContent,
          guid: e.querySelector("videoId").textContent
       }));
       container.innerHTML = items.map(v => {
         const url = `https://www.youtube.com/watch?v=${v.guid}`;
         const img = `https://img.youtube.com/vi/${v.guid}/hqdefault.jpg`;
         return `
         <div class="card">
           <a href="${url}" target="_blank"><img src="${img}" class="video-thumb" loading="lazy"></a>
           <div class="card-content"><p class="card-title">${v.title}</p></div>
           ${getActionsHTML(v.guid, 'video', v.title, '', url, img)}
         </div>`;
       }).join('');
    }
  } catch (e) { container.innerHTML = "<p style='text-align:center;width:100%'>جاري التحميل...</p>"; }
}

async function loadBooks() {
  try {
    const res = await api('/books');
    document.getElementById('books-grid').innerHTML = res.data.map(b => {
      const fileId = b.url.match(/\/d\/([^/]+)/)?.[1];
      const id = b._id || b.id;
      return `
      <div class="card">
        <div style="height:180px; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; overflow:hidden">
          ${fileId ? `<iframe src="https://drive.google.com/file/d/${fileId}/preview" style="width:100%;height:100%;border:none;pointer-events:none"></iframe>` : '📚'}
        </div>
        <div class="card-content">
          <h3 class="card-title">${b.title}</h3>
          <div style="display:flex; gap:5px; margin-bottom:10px;">
            <a href="${b.url}" target="_blank" class="btn" style="flex:1;text-align:center">قراءة</a>
            ${state.adminPass ? `<button onclick="del('books','${id}')" class="btn btn-danger">حذف</button>` : ''}
          </div>
        </div>
        ${getActionsHTML(id, 'book', b.title, 'كتاب من المكتبة', b.url, '')}
      </div>`;
    }).join('');
  } catch(e){}
}

async function loadTips() {
  try {
    const res = await api('/tips');
    document.getElementById('tips-grid').innerHTML = res.data.map(t => {
      const id = t._id || t.id;
      return `
      <div class="card" style="border-right:4px solid var(--gold)">
        <div class="card-content">
          <p style="white-space:pre-wrap">${t.text}</p>
          ${state.adminPass ? `
          <div style="margin-top:10px; display:flex; gap:5px; justify-content:flex-end">
             <button onclick="editTip('${id}', '${t.text.replace(/\n/g,'\\n').replace(/'/g, "\\'")}')" class="btn">تعديل</button>
             <button onclick="del('tips','${id}')" class="btn btn-danger">حذف</button>
          </div>` : ''}
        </div>
        ${getActionsHTML(id, 'tip', 'إرشاد مختار', t.text, window.location.href, '')}
      </div>`;
    }).join('');
  } catch(e){}
}

async function loadPosts() {
  try {
    const res = await api('/posts');
    document.getElementById('posts-grid').innerHTML = res.data.map(p => {
      const id = p._id || p.id;
      return `
      <div class="card">
        ${p.videoUrl ? `<video controls src="${p.videoUrl}" style="width:100%;height:200px;background:#000"></video>` : ''}
        <div class="card-content">
          <h3 class="card-title">${p.title}</h3>
          <p style="color:#ccc; font-size:0.9rem; white-space:pre-wrap">${p.description}</p>
          ${state.adminPass ? `<button onclick="del('posts','${id}')" class="btn btn-danger" style="width:100%;margin-top:10px">حذف</button>` : ''}
        </div>
        ${getActionsHTML(id, 'post', p.title, p.description, p.videoUrl || window.location.href, '')}
      </div>`;
    }).join('');
  } catch(e){}
}

function loadFavorites() {
  const favs = getFavs();
  const container = document.getElementById('favorites-grid');
  if (favs.length === 0) {
    container.innerHTML = "<p style='text-align:center; width:100%; color:#aaa'>لم تقم بحفظ أي شيء بعد 🍂</p>";
    return;
  }
  container.innerHTML = favs.map(item => {
    let mediaHTML = '';
    let linkHTML = '';
    if (item.type === 'video') {
       mediaHTML = `<a href="${item.url}" target="_blank"><img src="${item.img}" class="video-thumb"></a>`;
    } else if (item.type === 'book') {
       mediaHTML = `<div style="height:100px;background:#222;display:flex;align-items:center;justify-content:center;font-size:3rem;">📚</div>`;
       linkHTML = `<a href="${item.url}" target="_blank" class="btn" style="display:block;text-align:center;margin-top:5px">فتح الكتاب</a>`;
    } else if (item.type === 'post' && item.url && item.url.includes('cloudinary')) {
       mediaHTML = `<video controls src="${item.url}" style="width:100%;height:200px"></video>`;
    }
    return `
    <div class="card">
      ${mediaHTML}
      <div class="card-content">
        <h3 class="card-title">${item.title}</h3>
        <p style="font-size:0.9rem;color:#ccc">${item.content}</p>
        ${linkHTML}
      </div>
      ${getActionsHTML(item.id, item.type, item.title, item.content, item.url, item.img)}
    </div>`;
  }).join('');
}

// --- إدارة الصيانة والدخول ---
async function checkMaintenance() {
  try {
    const res = await fetch(`${CONFIG.BACKEND}/config/status`);
    const data = await res.json();
    isMaintenance = data.maintenance;
    const maintOverlay = document.getElementById("maintenance-overlay");
    const welcomeOverlay = document.getElementById("welcome-overlay");
    if (isMaintenance) {
      maintOverlay.style.display = "flex";
      welcomeOverlay.style.display = "none";
      welcomeOverlay.classList.remove('active');
    } else {
      maintOverlay.style.display = "none";
    }
  } catch (e) { console.error("Error fetching maintenance status"); }
}

async function toggleMaintenance() {
  if(!state.adminPass) return;
  const newState = !isMaintenance;
  if(!confirm(newState ? "تفعيل وضع الصيانة؟" : "فتح الموقع؟")) return;
  try {
    const res = await api('/config/maintenance', 'POST', { status: newState });
    showToast(res.message);
    isMaintenance = newState;
    updateUI(); 
  } catch (e) {}
}

document.getElementById("force-enter-btn").onclick = () => { toggleModal('login-modal', true); };
function enterSite() { document.getElementById('welcome-overlay').classList.remove('active'); }

function showToast(msg, type='success') {
  const box = document.createElement('div');
  box.className = `toast ${type}`;
  box.innerText = msg;
  document.getElementById('toast-container').appendChild(box);
  setTimeout(() => box.remove(), 3000);
}

async function api(url, method="GET", body=null) {
  const headers = { "Content-Type": "application/json" };
  if (state.adminPass) headers["x-admin-pass"] = state.adminPass;
  try {
    const res = await fetch(CONFIG.BACKEND + url, { method, headers, body: body ? JSON.stringify(body) : null });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "حدث خطأ");
    return data;
  } catch (err) { showToast(err.message, 'error'); throw err; }
}

function loadContent() {
  checkAdmin(); loadVideos(); loadBooks(); loadTips(); loadPosts();
}

function handleAdminClick() { state.adminPass ? (confirm("تسجيل خروج؟") && logout()) : toggleModal('login-modal', true); }
function toggleModal(id, show) { document.getElementById(id).classList.toggle('active', show); }

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (u !== "sayafbadarin") return showToast("اسم المستخدم خطأ", "error");
  try {
    await api('/books', 'GET'); 
    state.adminPass = p;
    sessionStorage.setItem("adminPass", p);
    checkAdmin();
    toggleModal('login-modal', false);
    showToast("تم الدخول بنجاح");
    document.getElementById("maintenance-overlay").style.display = "none";
    loadContent(); 
  } catch(e) {
    showToast("فشل الدخول", "error");
    state.adminPass = null;
  }
};

function checkAdmin() {
  const isAdmin = !!state.adminPass;
  document.getElementById('admin-toggle').style.background = isAdmin ? 'var(--gold)' : 'rgba(0,0,0,0.6)';
  document.getElementById('admin-toggle').style.color = isAdmin ? '#000' : 'var(--gold)';
  const maintBtn = document.getElementById('maint-toggle');
  maintBtn.style.display = isAdmin ? 'flex' : 'none';
  maintBtn.style.background = isMaintenance ? 'var(--danger)' : 'rgba(0,0,0,0.6)';
  maintBtn.style.color = isMaintenance ? '#fff' : 'var(--danger)';
  document.querySelectorAll('.upload-box').forEach(e => e.style.display = isAdmin ? 'block' : 'none');
  document.getElementById('admin-actions').style.display = isAdmin ? 'block' : 'none';
}

function logout() { sessionStorage.clear(); state.adminPass = null; checkAdmin(); showToast("تم الخروج"); location.reload(); }
function updateUI() { checkAdmin(); }

async function del(type, id) {
  if(confirm("تأكيد الحذف؟")) {
    await api(`/${type}/${id}`, 'DELETE');
    showToast("تم الحذف");
    if(type=='books') loadBooks(); if(type=='tips') loadTips(); if(type=='posts') loadPosts();
  }
}

document.getElementById('book-form').onsubmit = async (e) => {
  e.preventDefault();
  await api('/books', 'POST', { title: e.target.title.value, url: e.target.url.value });
  showToast("تم"); e.target.reset(); loadBooks();
};

document.getElementById('tip-form').onsubmit = async (e) => {
  e.preventDefault();
  await api('/tips', 'POST', { text: e.target.text.value });
  showToast("تم"); e.target.reset(); loadTips();
};

document.getElementById('post-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.innerText = "جاري الرفع..."; btn.disabled = true;
  try {
    let videoUrl = "";
    const file = e.target.videoFile.files[0];
    if (file) {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CONFIG.CLOUDINARY.PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.CLOUD_NAME}/upload`, { method:"POST", body:fd });
      const data = await res.json();
      videoUrl = data.secure_url;
    }
    await api('/posts', 'POST', { title: e.target.title.value, description: e.target.description.value, videoUrl });
    showToast("تم النشر"); e.target.reset(); loadPosts();
  } catch(err) { showToast("فشل الرفع", "error"); }
  btn.innerText = "رفع ونشر"; btn.disabled = false;
};

window.switchPage = (id, btn) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
  document.getElementById(id+'-page').classList.add('visible');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if(id === 'favorites') loadFavorites();
};

window.changePass = async () => {
  const n = prompt("كلمة المرور الجديدة:");
  if(n) { await api('/admin/change-password', 'POST', {newPassword:n}); showToast("تم التغيير"); }
};

window.editTip = async (id, txt) => {
  const n = prompt("تعديل:", txt);
  if(n && n!==txt) { await api(`/tips/${id}`, 'PUT', {text:n}); showToast("تم"); loadTips(); }
};
