const BACKEND = "https://mosa-backend-dr63.onrender.com"; // غيّره بعد النشر إلى رابط Render
const PASSWORD = "sayaf1820";

document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("overlay").style.display = "none";
  initializeSite();
});

function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
}

const navbarLinks = document.querySelectorAll(".navbar a");
const pages = document.querySelectorAll(".page");
const backBtn = document.getElementById("backBtn");

navbarLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.section;
    pages.forEach((p) => p.classList.remove("visible"));
    document.getElementById(target).classList.add("visible");
    backBtn.style.display = target === "videosPage" ? "none" : "block";
    scrollTo(0, 0);
  });
});

backBtn.addEventListener("click", () => {
  pages.forEach((p) => p.classList.remove("visible"));
  document.getElementById("videosPage").classList.add("visible");
  backBtn.style.display = "none";
});

document.getElementById("adminLogin").addEventListener("click", () => {
  const pass = prompt("أدخل كلمة السر للإدارة:");
  if (pass === PASSWORD) {
    document.getElementById("upload-book").style.display = "block";
    document.getElementById("upload-tip").style.display = "block";
    alert("تم تسجيل الدخول كإدمن ✅");
    loadBooks();
    loadTips();
  } else if (pass) alert("❌ كلمة السر غير صحيحة");
});

// ======= الفيديوهات =======
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
  const data = await res.json();
  const items = data.items.slice(0, 50);
  document.getElementById("videos").innerHTML = items.map((v) => {
    const id = v.link.split("=")[1];
    const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    return `
      <div class="video">
        <a href="https://www.youtube.com/watch?v=${id}" target="_blank">
          <img src="${thumb}" width="340" height="200" style="border-radius:10px;border:none;">
        </a>
        <p>${v.title}</p>
      </div>`;
  }).join("");
}

// ======= المكتبة =======
async function loadBooks() {
  const res = await fetch(`${BACKEND}/books`);
  const books = await res.json();
  const isAdmin = document.getElementById("upload-book").style.display === "block";

  document.getElementById("book-list").innerHTML = books.map((b, i) => `
    <div class="book">
      <h3>${b.title}</h3>
      <iframe src="${b.url}" height="400"></iframe>
      <a href="${b.url}" target="_blank" download>تحميل الكتاب</a>
      ${isAdmin ? `<div class="tip-controls">
          <button onclick="editBook(${i})">✏️ تعديل</button>
          <button onclick="deleteBook(${i})">🗑️ حذف</button>
        </div>` : ""}
    </div>`).join("");
}

// تعديل اسم كتاب
async function editBook(index) {
  const newTitle = prompt("اكتب الاسم الجديد للكتاب:");
  if (!newTitle) return;
  const res = await fetch(`${BACKEND}/editBook/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle, password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadBooks();
}

// حذف كتاب
async function deleteBook(index) {
  if (!confirm("هل أنت متأكد من حذف هذا الكتاب؟")) return;
  const res = await fetch(`${BACKEND}/deleteBook/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadBooks();
}

// ======= الإرشادات =======
async function loadTips() {
  const res = await fetch(`${BACKEND}/tips`);
  const tips = await res.json();
  const isAdmin = document.getElementById("upload-tip").style.display === "block";
  document.getElementById("tip-list").innerHTML = tips.map((t, i) => `
    <div class="book">
      <p class="tip-text" data-index="${i}">${t.text}</p>
      ${t.url ? `<a href="${t.url}" target="_blank">📎 مرفق</a>` : ""}
      ${isAdmin ? `<div class="tip-controls">
          <button onclick="editTip(${i})">✏️ تعديل</button>
          <button onclick="deleteTip(${i})">🗑️ حذف</button>
        </div>` : ""}
    </div>`).join("");
}

// تعديل إرشاد
async function editTip(index) {
  const p = document.querySelector(`.tip-text[data-index='${index}']`);
  const newText = prompt("اكتب النص الجديد:", p.textContent.trim());
  if (!newText) return;
  const res = await fetch(`${BACKEND}/editTip/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: newText, password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadTips();
}

// حذف إرشاد
async function deleteTip(index) {
  if (!confirm("هل أنت متأكد من حذف هذا الإرشاد؟")) return;
  const res = await fetch(`${BACKEND}/deleteTip/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadTips();
}

// رفع كتاب
document.getElementById("upload-book").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  formData.append("password", PASSWORD);
  const res = await fetch(`${BACKEND}/uploadBook`, { method: "POST", body: formData });
  const data = await res.json();
  alert(data.message);
  if (res.ok) {
    e.target.reset();
    loadBooks();
  }
});

// رفع إرشاد
document.getElementById("upload-tip").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim();
  const file = e.target.querySelector("input[type='file']")?.files[0];
  if (!text && !file) return alert("يرجى إدخال نص أو إرفاق ملف.");
  const formData = new FormData();
  formData.append("text", text);
  formData.append("title", text ? text.slice(0, 30) : "إرشاد جديد");
  if (file) formData.append("pdf", file);
  formData.append("password", PASSWORD);
  const res = await fetch(`${BACKEND}/uploadTip`, { method: "POST", body: formData });
  const data = await res.json();
  alert(data.message);
  if (res.ok) {
    e.target.reset();
    loadTips();
  }
});
