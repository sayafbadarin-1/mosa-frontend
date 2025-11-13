const BACKEND = "https://mosa-backend-dr63.onrender.com"; // غيّره لاحقًا إلى رابط Render
const PASSWORD = "sayaf1820";

/* شاشة البداية */
document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("overlay").style.display = "none";
  initializeSite();
});

function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
}

/* ===== الفيديوهات ===== */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    const data = await res.json();
    const items = data.items.slice(0, 50);
    document.getElementById("videos").innerHTML = items.map(v => {
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
  } catch {
    document.getElementById("videos").innerHTML = "<p style='color:#aaa'>⚠️ تعذر تحميل الفيديوهات</p>";
  }
}

/* ===== المكتبة (Google Drive) ===== */
document.getElementById("upload-book").addEventListener("submit", async e => {
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
    const preview = match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
    return `
      <div class="book">
        <h3>${b.title}</h3>
        ${preview ? `<iframe src="${preview}" width="100%" height="400"></iframe>` : `<p style="color:#aaa">🔗 لا يمكن عرض

