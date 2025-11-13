// main.js (مصحّح ومكتمل)
const BACKEND = "https://mosa-backend-dr63.onrender.com"; // غيّره إن احتجت
// ملاحظة أمنيّة: لا تضع كلمة المرور هنا نهائياً في الإنتاج.
// ضع عملية التحقق في الخادم/الباكند.
const CLIENT_PASSWORD_PLACEHOLDER = "sayaf1820"; // فقط للعرض/اختبار المحلي — أفضل إزالته

document.addEventListener("DOMContentLoaded", () => {
  // روابط الواجهة
  document.getElementById("enterBtn").addEventListener("click", onEnter);
  document.querySelectorAll(".navbar a").forEach(a => {
    a.addEventListener("click", () => showPage(a.dataset.section));
  });
  document.getElementById("backBtn").addEventListener("click", () => showPage("videosPage"));
  document.getElementById("adminLogin").addEventListener("click", onAdminLogin);

  // نماذج الرفع
  const uploadBookForm = document.getElementById("upload-book");
  if (uploadBookForm) uploadBookForm.addEventListener("submit", onUploadBook);

  const uploadTipForm = document.getElementById("upload-tip");
  if (uploadTipForm) uploadTipForm.addEventListener("submit", onUploadTip);

  // ابدأ الموقع (لن تُحمّل المحتوى إلا بعد الضغط على زر الدخول)
});

function onEnter() {
  document.getElementById("overlay").style.display = "none";
  initializeSite();
}

function initializeSite() {
  loadVideos();
  loadBooks();
  loadTips();
  showPage("videosPage");
}

/* ===== مساعدة لاستخراج YouTube ID ===== */
function extractYouTubeID(url) {
  if (!url) return null;
  // محاولات متعدّدة: v=, youtu.be/, /embed/
  const patterns = [
    /v=([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/watch\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // إذا لم نلقَ تطابقًا، حاول آخر 11 حرف إن بدا الرابط يعجبه
  if (url.length >= 11) return url.slice(-11);
  return null;
}

/* ===== الفيديوهات ===== */
async function loadVideos() {
  const CHANNEL_ID = "UChFRy4s3_0MVJ3Hmw2AMcoQ";
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const container = document.getElementById("videos");
  container.innerHTML = `<p style="color:#aaa">جارٍ تحميل الفيديوهات...</p>`;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
    if (!res.ok) throw new Error("شبكة: فشل استرجاع الخلاصات");
    const data = await res.json();
    const items = (data.items || []).slice(0, 50);
    if (items.length === 0) {
      container.innerHTML = "<p style='color:#aaa'>لا توجد فيديوهات حالياً.</p>";
      return;
    }
    container.innerHTML = items.map(v => {
      // بعض عناصر RSS قد تعطي رابط كامل أو يحتوي v=
      const id = extractYouTubeID(v.link) || extractYouTubeID(v.guid) || "";
      const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
      return `
        <div class="video">
          <a href="https://www.youtube.com/watch?
