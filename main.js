const BACKEND = "https://mosa-backend-dr63.onrender.com"; // غيّر هذا لاحقًا إلى رابط Render
const PASSWORD = "sayaf1820";

/* شاشة البداية */
document.getElementById("enterBtn").addEventListener("click", () => {
  const overlay = document.getElementById("overlay");
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.style.display = "none";
    initializeSite();
  }, 600);
});

function initializeSite() {
  loadVideos();  // يمكن حذفه إذا لا يوجد قسم فيديو
  loadBooks();
  loadTips();
}

/* ========== المكتبة (Google Drive) ========== */
document.getElementById("upload-book").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: e.target.title.value.trim(),
    url: e.target.url.value.trim(),
    password: PASSWORD,
  };
  const res = await fetch(`${BACKEND}/uploadBook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) {
    e.target.reset();
    loadBooks();
  }
});

async function loadBooks() {
  const res = await fetch(`${BACKEND}/books`);
  const books = await res.json();
  const isAdmin = document.getElementById("upload-book").style.display === "block";

  document.getElementById("book-list").innerHTML = books.map((b, i) => {
    const match = b.url.match(/\/d\/([^/]+)/);
    let preview = match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
    return `
    <div class="book">
      <h3>${b.title}</h3>
      ${
        preview
          ? `<iframe src="${preview}" width="100%" height="400" allow="autoplay"></iframe>`
          : `<p style="color:#aaa">🔗 لا يمكن عرض المعاينة</p>`
      }
      <a href="${b.url}" target="_blank">📖 فتح في Drive</a>
      ${
        isAdmin
          ? `<div class="tip-controls">
               <button onclick="editBook(${i})">✏️ تعديل</button>
               <button onclick="deleteBook(${i})">🗑️ حذف</button>
             </div>`
          : ""
      }
    </div>`;
  }).join("");
}

async function editBook(index) {
  const title = prompt("اسم جديد؟");
  const url = prompt("رابط جديد؟");
  const res = await fetch(`${BACKEND}/editBook/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url, password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadBooks();
}

async function deleteBook(index) {
  if (!confirm("هل تريد الحذف؟")) return;
  const res = await fetch(`${BACKEND}/deleteBook/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadBooks();
}

/* ========== الإرشادات ========== */
document.getElementById("upload-tip").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim();
  if (!text) return alert("اكتب نص الإرشاد أولاً");
  const res = await fetch(`${BACKEND}/uploadTip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) {
    e.target.reset();
    loadTips();
  }
});

async function loadTips() {
  const res = await fetch(`${BACKEND}/tips`);
  const tips = await res.json();
  const isAdmin = document.getElementById("upload-tip").style.display === "block";
  document.getElementById("tip-list").innerHTML = tips.map((t, i) => `
    <div class="book">
      <p class="tip-text">${t.text}</p>
      ${
        isAdmin
          ? `<div class="tip-controls">
               <button onclick="editTip(${i})">✏️ تعديل</button>
               <button onclick="deleteTip(${i})">🗑️ حذف</button>
             </div>`
          : ""
      }
    </div>`).join("");
}

async function editTip(index) {
  const newTxt = prompt("النص الجديد:");
  if (!newTxt) return;
  const res = await fetch(`${BACKEND}/editTip/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: newTxt, password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadTips();
}

async function deleteTip(index) {
  if (!confirm("هل تريد الحذف؟")) return;
  const res = await fetch(`${BACKEND}/deleteTip/${index}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) loadTips();
}

/* زر تسجيل الدخول */
document.getElementById("adminLogin").addEventListener("click", () => {
  const pass = prompt("كلمة السر للإدارة:");
  if (pass === PASSWORD) {
    document.getElementById("upload-book").style.display = "block";
    document.getElementById("upload-tip").style.display = "block";
    alert("تم تسجيل الدخول ✅");
    loadBooks();
    loadTips();
  } else if (pass) alert("❌ كلمة المرور غير صحيحة");
});

/* تحكم في التنقل بين الصفحات */
const links = document.querySelectorAll(".navbar a");
const pages = document.querySelectorAll(".page");
const backBtn = document.getElementById("backBtn");

links.forEach(link => {
  link.addEventListener("click", () => {
    const target = link.dataset.section;
    pages.forEach(p => p.classList.remove("visible"));
    document.getElementById(target).classList.add("visible");
    backBtn.style.display = target === "booksPage" ? "none" : "block";
    scrollTo(0, 0);
  });
});
backBtn.addEventListener("click", () => {
  pages.forEach(p => p.classList.remove("visible"));
  document.getElementById("booksPage").classList.add("visible");
  backBtn.style.display = "none";
});
