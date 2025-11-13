const BACKEND = "https://mosa-backend-dr63.onrender.com"; // عدّله بعد النشر إلى رابط Render
const PASSWORD = "sayaf1820";

/* ========== رفع كتاب كرابط Drive ========== */
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

/* ========== عرض المكتبة (معاينة من Drive) ========== */
async function loadBooks() {
  const res = await fetch(`${BACKEND}/books`);
  const books = await res.json();
  const isAdmin = document.getElementById("upload-book").style.display === "block";

  document.getElementById("book-list").innerHTML = books
    .map((b, i) => {
      // استخراج ID من الرابط
      let previewLink = "";
      const match = b.url.match(/\/d\/([^/]+)/);
      if (match) {
        const fileId = match[1];
        previewLink = `https://drive.google.com/file/d/${fileId}/preview`;
      }
      return `
        <div class="book">
          <h3>${b.title}</h3>
          ${
            previewLink
              ? `<iframe src="${previewLink}" width="100%" height="400" allow="autoplay"></iframe>`
              : `<p style="color:#aaa">🔗 لا يمكن عرض المعاينة، الرابط غير صالح.</p>`
          }
          <a href="${b.url}" target="_blank" class="view-btn">📖 فتح في Drive</a>
          ${
            isAdmin
              ? `<div class="tip-controls">
                   <button onclick="editBook(${i})">✏️ تعديل</button>
                   <button onclick="deleteBook(${i})">🗑️ حذف</button>
                 </div>`
              : ""
          }
        </div>`;
    })
    .join("");
}

/* ========== تعديل أو حذف كتاب ========== */
async function editBook(index) {
  const title = prompt("اكتب الاسم الجديد للكتاب (اتركه فارغًا لو لا تريد تغييره):");
  const url = prompt("ضع الرابط الجديد (أو اتركه كما هو):");
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
