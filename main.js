const BACKEND = "http://localhost:4000"; // غيّره إلى رابط Render بعد النشر
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

document.getElementById("adminLogin").addEventListener("click", () => {
  const pass = prompt("أدخل كلمة السر للإدارة:");
  if (pass === PASSWORD) {
    document.getElementById("upload-book").style.display = "block";
    document.getElementById("upload-tip").style.display = "block";
    alert("تم تسجيل الدخول كإدمن ✅");
    loadTips(); // لتحديث ظهور الأزرار
  } else if (pass) alert("❌ كلمة السر غير صحيحة");
});

// ========== الفيديوهات ==========
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const res = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`
  );
  const data = await res.json();

  // عرض حتى 50 فيديو من القناة
  const items = data.items.slice(0, 50);
  document.getElementById("videos").innerHTML = items
    .map((v) => {
      const id = v.link.split("=")[1];
      const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      return `
      <div class="video">
        <a href="https://www.youtube.com/watch?v=${id}" target="_blank">
          <img src="${thumb}" width="340" height="200" style="border-radius:10px;border:none;">
        </a>
        <p>${v.title}</p>
      </div>`;
    })
    .join("");
}

// ========== الكتب ==========
async function loadBooks() {
  const res = await fetch(`${BACKEND}/books`);
  const books = await res.json();
  document.getElementById("book-list").innerHTML = books
    .map(
      (b) => `
      <div class="book">
        <h3>${b.title}</h3>
        <iframe src="${BACKEND}/uploads/${b.filename}" height="400"></iframe>
        <a href="${BACKEND}/uploads/${b.filename}" download>تحميل الكتاب</a>
      </div>`
    )
    .join("");
}

// ========== الإرشادات ==========
async function loadTips() {
  const res = await fetch(`${BACKEND}/tips`);
  const tips = await res.json();
  const isAdmin =
    document.getElementById("upload-tip").style.display === "block";

  document.getElementById("tip-list").innerHTML = tips
    .map(
      (t, i) => `
      <div class="book">
        <p contenteditable="false" data-index="${i}" class="tip-text">${t.text}</p>
        ${
          isAdmin
            ? `<div class="tip-controls">
                <button onclick="editTip(${i})">✏️ تعديل</button>
                <button onclick="deleteTip(${i})">🗑️ حذف</button>
              </div>`
            : ""
        }
      </div>`
    )
    .join("");
}

// ✏️ تعديل إرشاد
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

// 🗑️ حذف إرشاد
async function deleteTip(index) {
  if (!confirm("هل أنت متأكد من حذف هذه الإرشاد؟")) return;

  const res = await fetch(`${BACKEND}/deleteTip/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadTips();
}

// ========= رفع كتاب =========
document
  .getElementById("upload-book")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append("password", PASSWORD);
    const res = await fetch(`${BACKEND}/uploadBook`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) loadBooks();
  });

// ========= رفع إرشاد =========
document
  .getElementById("upload-tip")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) {
      alert("الرجاء إدخال النص.");
      return;
    }
    const formData = new FormData();
    formData.append("text", text);
    formData.append("title", text.slice(0, 30));
    formData.append("password", PASSWORD);
    const res = await fetch(`${BACKEND}/uploadTip`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      e.target.reset();
      loadTips();
    }
  });