// --- PART 1: CONFIGURATION & CORE NAVIGATION ---
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initTypewriter();
  initParticles();
  initMemories();
  initHearts();
  initWall();
  initCR();
  initCardStudio();
  initMemoryViewer();
});

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function initNavigation() {
  const pages = document.querySelectorAll(".page");
  const navBtns = document.querySelectorAll(".bottom-nav button");
  const triggers = document.querySelectorAll("[data-go]");

  function goTo(targetId) {
    pages.forEach((page) => {
      page.classList.toggle("active", page.id === targetId);
    });
    navBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.go === targetId);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  triggers.forEach((btn) => {
    btn.addEventListener("click", () => goTo(btn.dataset.go));
  });

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => goTo(btn.dataset.go));
  });
}

function initTypewriter() {
  const target = document.getElementById("typewriter");
  if (!target) return;
  const phrases = ["Memories that stay.", "Lessons that shape us.", "People we won't forget.", "BPharm One · Class of 2029"];
  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function type() {
    const current = phrases[phraseIdx];
    target.textContent = isDeleting ? current.substring(0, charIdx--) : current.substring(0, charIdx++);

    let speed = isDeleting ? 40 : 80;
    if (!isDeleting && charIdx === current.length + 1) {
      speed = 1800;
      isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      speed = 500;
    }
    setTimeout(type, speed);
  }
  type();
}

function initParticles() {
  const particles = document.getElementById("particles");
  if (!particles) return;
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement("div");
    dot.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      background: rgba(255, 255, 255, ${Math.random() * 0.4 + 0.1});
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      border-radius: 50%;
      pointer-events: none;
    `;
    particles.appendChild(dot);
  }
             }
      // --- PART 2: MEMORIES GALLERY & HEARTS SYSTEM ---
function initMemories() {
  const gallery = document.getElementById("memoryGallery");
  const uploadBtn = document.getElementById("uploadMemoryBtn");
  const fileInput = document.getElementById("memoryFile");
  const captionInput = document.getElementById("memoryCaption");
  const nameInput = document.getElementById("memoryName");

  if (!gallery) return;

  async function loadMemories() {
    if (!supabase) {
      gallery.innerHTML = '<div class="empty-state">Connect Supabase to view memories.</div>';
      return;
    }
    const { data, error } = await supabase.from("memories").select("*").order("created_at", { ascending: false });
    if (error || !data || data.length === 0) {
      gallery.innerHTML = '<div class="empty-state">No memories posted yet. Be the first!</div>';
      return;
    }

    gallery.innerHTML = data.map((item) => `
      <div class="memory-card" data-img="${item.image_url}" data-caption="${item.caption || ''}">
        <div class="memory-image-wrap">
          <img src="${item.image_url}" alt="Memory" loading="lazy">
        </div>
        <div class="memory-content">
          <h3>${item.caption || "Class Memory"}</h3>
          <small>By ${item.author || "Anonymous"}</small>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".memory-card").forEach((card) => {
      card.addEventListener("click", () => {
        openMemoryViewer(card.dataset.img, card.dataset.caption);
      });
    });
  }

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", async () => {
      const file = fileInput.files[0];
      if (!file) return showToast("Please select an image file first.");
      uploadBtn.disabled = true;
      uploadBtn.textContent = "UPLOADING...";

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: storageErr } = await supabase.storage.from("memories").upload(fileName, file);
        if (storageErr) throw storageErr;

        const { data: publicUrlData } = supabase.storage.from("memories").getPublicUrl(fileName);
        const imageUrl = publicUrlData.publicUrl;

        const { error: dbErr } = await supabase.from("memories").insert([
          { image_url: imageUrl, caption: captionInput.value, author: nameInput.value || "Anonymous" }
        ]);
        if (dbErr) throw dbErr;

        showToast("Memory saved successfully! 🎉");
        captionInput.value = "";
        nameInput.value = "";
        fileInput.value = "";
        loadMemories();
      } catch (err) {
        showToast("Upload failed: " + err.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "SAVE MEMORY →";
      }
    });
  }

  loadMemories();
}

function initMemoryViewer() {
  const viewer = document.getElementById("memoryViewer");
  const closeBtn = document.getElementById("memoryViewerClose");
  const img = document.getElementById("memoryViewerImage");
  const caption = document.getElementById("memoryViewerCaption");

  if (!viewer) return;

  window.openMemoryViewer = (src, text) => {
    img.src = src;
    caption.textContent = text;
    viewer.classList.remove("hidden");
  };

  closeBtn.addEventListener("click", () => viewer.classList.add("hidden"));
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) viewer.classList.add("hidden");
  });
}

function initHearts() {
  const feed = document.getElementById("heartFeed");
  const countDisplay = document.getElementById("heartCount");
  const sendBtn = document.getElementById("sendHeartBtn");
  const senderInput = document.getElementById("heartSender");
  const receiverInput = document.getElementById("heartReceiver");

  if (!feed) return;

  async function loadHearts() {
    if (!supabase) return;
    const { data, error } = await supabase.from("hearts").select("*").order("created_at", { ascending: false });
    if (error || !data) return;

    countDisplay.textContent = data.length;
    if (data.length === 0) {
      feed.innerHTML = '<div class="empty-state">No appreciations yet. Send the first one!</div>';
      return;
    }

    feed.innerHTML = data.map((item) => `
      <div class="love-card">
        <div class="love-line">
          <strong>${item.sender || 'Someone'}</strong>
          <span class="love-arrow">♥</span>
          <strong>${item.receiver}</strong>
        </div>
        <small>${new Date(item.created_at).toLocaleDateString()}</small>
      </div>
    `).join("");
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      const receiver = receiverInput.value.trim();
      if (!receiver) return showToast("Please write who you are appreciating.");

      const { error } = await supabase.from("hearts").insert([
        { sender: senderInput.value.trim() || "Anonymous", receiver: receiver }
      ]);

      if (error) {
        showToast("Error sending appreciation.");
      } else {
        showToast("Appreciation sent! ❤️");
        receiverInput.value = "";
        loadHearts();
      }
    });
  }

  loadHearts();
    }
          // --- PART 3: CLASS WALL, REPS & CARD STUDIO ---
function initWall() {
  const feed = document.getElementById("messageFeed");
  const postBtn = document.getElementById("postMessageBtn");
  const nameInput = document.getElementById("messageName");
  const textInput = document.getElementById("messageText");

  if (!feed) return;

  async function loadMessages() {
    if (!supabase) return;
    const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
    if (error || !data) return;

    if (data.length === 0) {
      feed.innerHTML = '<div class="empty-state">The wall is empty. Say something!</div>';
      return;
    }

    feed.innerHTML = data.map((item) => `
      <div class="message-card">
        <div class="message-head">
          <strong>${item.author || 'Anonymous'}</strong>
          <small>${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
        <p>${item.content}</p>
      </div>
    `).join("");
  }

  if (postBtn) {
    postBtn.addEventListener("click", async () => {
      const content = textInput.value.trim();
      if (!content) return showToast("Please write a message before posting.");

      const { error } = await supabase.from("messages").insert([
        { author: nameInput.value.trim() || "Anonymous", content: content }
      ]);

      if (error) {
        showToast("Error posting message.");
      } else {
        showToast("Posted to wall! 💬");
        textInput.value = "";
        loadMessages();
      }
    });
  }

  loadMessages();
}

function initCR() {
  document.querySelectorAll(".cr-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".cr-card");
      card.classList.toggle("expanded");
      btn.textContent = card.classList.contains("expanded") ? "SHOW LESS" : "READ MORE";
    });
  });

  document.querySelectorAll("[data-appreciate-cr]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const crName = btn.dataset.appreciateCr;
      const box = btn.closest(".cr-appreciation-box");
      const name = box.querySelector(".cr-appreciation-name").value.trim() || "Anonymous";
      const message = box.querySelector(".cr-appreciation-message").value.trim();

      if (!message) return showToast("Please write a short thank-you note.");

      if (supabase) {
        await supabase.from("cr_notes").insert([{ cr_name: crName, author: name, note: message }]);
        showToast(`Thank you note sent to ${crName}! ❤️`);
        box.querySelector(".cr-appreciation-message").value = "";
      }
    });
  });
}

function initCardStudio() {
  const makeBtn = document.getElementById("makeCardBtn");
  const fromInput = document.getElementById("cardFrom");
  const toInput = document.getElementById("cardTo");
  const msgInput = document.getElementById("cardMessage");
  const preview = document.getElementById("cardPreview");

  if (!makeBtn || !preview) return;

  makeBtn.addEventListener("click", () => {
    const to = toInput.value.trim();
    const msg = msgInput.value.trim();
    if (!to || !msg) return showToast("Please fill in who the card is for and write a message.");

    const from = fromInput.value.trim() || "A Classmate";

    preview.innerHTML = `
      <small>BPHARM ONE · CLASS OF 2029</small>
      <strong>For: ${to}</strong>
      <p>"${msg}"</p>
      <small style="margin-top:15px;">From: ${from}</small>
      <button type="button" class="secondary" id="downloadCardBtn" style="margin-top:20px;">DOWNLOAD CARD ✦</button>
    `;
    preview.classList.remove("hidden");

    document.getElementById("downloadCardBtn").addEventListener("click", () => {
      if (window.html2canvas) {
        html2canvas(preview).then((canvas) => {
          const link = document.createElement("a");
          link.download = `card-for-${to}.png`;
          link.href = canvas.toDataURL();
          link.click();
        });
      } else {
        showToast("Card rendered! Take a screenshot to save.");
      }
    });
  });
        }
      
