(() => {
  "use strict";

  const SUPABASE_URL = "https://hketlksydaqmuiysozdh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5";
  let sb = null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  const clean = (v, n = 500) =>
    String(v ?? "")
      .trim()
      .slice(0, n);

  function toast(message) {
    const box = $("#toast");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => box.classList.remove("show"), 2800);
  }

  function pulse(button) {
    if (!button) return;
    button.classList.remove("pop");
    requestAnimationFrame(() => button.classList.add("pop"));
    setTimeout(() => button.classList.remove("pop"), 450);
  }

  function go(id) {
    const target = document.getElementById(id);
    if (!target) return;
    $$(".page.active").forEach((p) => p.classList.remove("active"));
    target.classList.add("active");
    $$(".bottom-nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.go === id)
    );
    try {
      history.replaceState(null, "", "#" + id);
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    target.querySelector(".reveal")?.animate(
      [
        { opacity: 0, transform: "translateY(18px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }

  function setupNavigation() {
    $$("[data-go]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        pulse(button);
        go(button.dataset.go);
      });
    });
    const hash = location.hash.replace("#", "");
    if (hash && document.getElementById(hash)) go(hash);
    else go("home");
  }

  function typeWriter() {
    const el = $("#typewriter");
    if (!el) return;
    const lines = [
      "One year. One class. A thousand moments.",
      "Lectures. Practicals. Exams. Laughter.",
      "BPharm One — our first chapter.",
    ];
    let line = 0,
      pos = 0,
      deleting = false;
    const tick = () => {
      const text = lines[line];
      el.textContent = deleting ? text.slice(0, pos--) : text.slice(0, pos++);
      if (!deleting && pos > text.length) {
        deleting = true;
        setTimeout(tick, 1700);
        return;
      }
      if (deleting && pos < 0) {
        deleting = false;
        pos = 0;
        line = (line + 1) % lines.length;
      }
      setTimeout(tick, deleting ? 35 : 70);
    };
    tick();
  }

  function setupSupabase() {
    if (!window.supabase?.createClient) {
      console.warn("Supabase library not available.");
      return false;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso),
      sec = Math.max(1, Math.floor((Date.now() - d) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  async function loadMemories() {
    const gallery = $("#memoryGallery");
    if (!gallery || !sb) return;
    const { data, error } = await sb
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      console.error(error);
      gallery.innerHTML = `<div class="empty-state">Memories could not be loaded right now.</div>`;
      return;
    }
    if (!data?.length) {
      gallery.innerHTML = `<div class="empty-state">📸<br>No memories yet.<br>The first throwback can come from anyone.</div>`;
      return;
    }
    gallery.innerHTML = data
      .map(
        (m, i) => ` <article class="memory-card" tabindex="0" role="button" style="animation-delay:${Math.min( i * 35, 400 )}ms"> <div class="memory-image-wrap"> <img src="${esc(m.image_url)}" alt="${esc( m.caption || "BPharm One memory" )}" loading="lazy"> </div> <div class="memory-content"> <h3>${esc(m.caption || "A BPharm One memory")}</h3> <small>${ m.anonymous ? "Anonymous" : esc(m.name || "BPharm One") } · ${timeAgo(m.created_at)}</small> <div class="reactions"> ${["❤️", "😂", "🔥", "💊"] .map( (r) => `<button type="button" data-memory-id="${esc( m.id )}" data-reaction="${r}">${r} <i>0</i></button>` ) .join("")} </div> </div> </article>`
      )
      .join("");

    await loadMemoryReactionCounts();
  }

  async function loadMemoryReactionCounts() {
    if (!sb) return;
    const buttons = $$("[data-memory-id][data-reaction]");
    for (const btn of buttons) {
      const { count } = await sb
        .from("memory_reactions")
        .select("*", { count: "exact", head: true })
        .eq("memory_id", btn.dataset.memoryId)
        .eq("reaction", btn.dataset.reaction);
      const i = $("i", btn);
      if (i) i.textContent = count || 0;
    }
  }

  function openMemoryViewer(src, caption = "") {
    const viewer = $("#memoryViewer"),
      img = $("#memoryViewerImage"),
      cap = $("#memoryViewerCaption");
    if (!viewer || !img) return;
    img.src = src;
    if (cap) cap.textContent = caption;
    viewer.classList.remove("hidden");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeMemoryViewer() {
    const viewer = $("#memoryViewer"),
      img = $("#memoryViewerImage"),
      cap = $("#memoryViewerCaption");
    if (!viewer) return;
    viewer.classList.add("hidden");
    viewer.setAttribute("aria-hidden", "true");
    if (img) img.src = "";
    if (cap) cap.textContent = "";
    document.body.style.overflow = "";
  }

  function setupMemoryViewer() {
    $("#memoryViewerClose")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMemoryViewer();
    });
    $("#memoryViewer")?.addEventListener("click", (e) => {
      if (e.target.id === "memoryViewer") closeMemoryViewer();
    });
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !$("#memoryViewer")?.classList.contains("hidden")
      )
        closeMemoryViewer();
    });
  }

  function setupMemories() {
    const fileInput = $("#memoryFile"),
      save = $("#uploadMemoryBtn"),
      gallery = $("#memoryGallery");
    $(".upload-label")?.addEventListener("click", () => fileInput?.click());

    save?.addEventListener("click", async () => {
      const file = fileInput?.files?.[0];
      const caption = clean($("#memoryCaption")?.value, 160);
      const name = clean($("#memoryName")?.value, 80);
      if (!file) return toast("Choose a photo first.");
      if (!file.type.startsWith("image/"))
        return toast("Please choose an image.");
      if (file.size > 5 * 1024 * 1024)
        return toast("Please choose a photo under 5 MB.");
      if (!caption) return toast("Add a caption first.");
      if (!sb) return toast("Shared memory service is unavailable.");
      save.disabled = true;
      save.textContent = "UPLOADING...";
      try {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const id = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
        const path = `${id}-${safe}`;
        const up = await sb.storage
          .from("memories")
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
            cacheControl: "3600",
          });
        if (up.error) throw up.error;
        const url = sb.storage.from("memories").getPublicUrl(path)
          .data.publicUrl;
        const ins = await sb.from("memories").insert({
          name: name || "Anonymous",
          caption,
          image_url: url,
          anonymous: !name,
        });
        if (ins.error) throw ins.error;
        fileInput.value = "";
        $("#memoryCaption").value = "";
        $("#memoryName").value = "";
        toast("Memory added for everyone.");
        await loadMemories();
      } catch (err) {
        console.error(err);
        toast("Upload failed: " + (err.message || "Please try again."));
      } finally {
        save.disabled = false;
        save.textContent = "SAVE MEMORY →";
      }
    });

    gallery?.addEventListener("click", async (e) => {
      const reaction = e.target.closest("[data-memory-id][data-reaction]");
      if (reaction) {
        e.stopPropagation();
        const key = `memory:${reaction.dataset.memoryId}:${reaction.dataset.reaction}`;
        if (localStorage.getItem(key))
          return toast("You already gave this reaction.");
        if (!sb) return;
        const { error } = await sb.from("memory_reactions").insert({
          memory_id: reaction.dataset.memoryId,
          reaction: reaction.dataset.reaction,
        });
        if (error) return toast("Reaction could not be saved.");
        localStorage.setItem(key, "1");
        const i = $("i", reaction);
        if (i) i.textContent = Number(i.textContent) + 1;
        pulse(reaction);
        return;
      }
      const card = e.target.closest(".memory-card");
      if (!card) return;
      const img = $("img", card);
      if (img?.src) openMemoryViewer(img.src, $("h3", card)?.textContent || "");
    });

    gallery?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".memory-card");
      if (!card) return;
      e.preventDefault();
      const img = $("img", card);
      if (img?.src) openMemoryViewer(img.src, $("h3", card)?.textContent || "");
    });
  }

  async function loadHearts() {
    if (!sb) return;
    const { data, error } = await sb
      .from("hearts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return;
    const count = $("#heartCount");
    if (count) count.textContent = data?.length || 0;
    const feed = $("#heartFeed");
    if (!feed) return;
    feed.innerHTML = data?.length
      ? data
          .map(
            (h) => ` <div class="love-card"><div class="love-line">❤️ <strong>${esc( h.sender_name || "Anonymous" )}</strong><span class="love-arrow">→</span><strong>${esc( h.receiver_name || "BPharm One" )}</strong></div><small>${timeAgo(h.created_at)}</small></div>`
          )
          .join("")
      : `<div class="loading">No hearts shared yet.</div>`;
  }

  function setupHearts() {
    $("#sendHeartBtn")?.addEventListener("click", async () => {
      const sender = clean($("#heartSender")?.value, 80);
      const receiver = clean($("#heartReceiver")?.value, 80);
      if (!receiver) return toast("Enter the person you want to appreciate.");
      if (!sb) return toast("Shared heart service is unavailable.");
      const { error } = await sb
        .from("hearts")
        .insert({
          sender_name: sender || "Anonymous",
          receiver_name: receiver,
        });
      if (error) return toast("Could not save the heart.");
      $("#heartSender").value = "";
      $("#heartReceiver").value = "";
      toast("Heart shared.");
      await loadHearts();
    });
  }

  async function loadMessages() {
    if (!sb) return;
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return;
    const feed = $("#messageFeed");
    if (!feed) return;
    feed.innerHTML = data?.length
      ? data
          .map(
            (m) => ` <article class="message-card"> <strong>${esc(m.name || "Anonymous")}</strong> <small>${timeAgo(m.created_at)}</small> <p>${esc(m.message || m.text || "")}</p> </article>`
          )
          .join("")
      : `<div class="loading">No messages yet. Be the first.</div>`;
  }

  function setupMessages() {
    $("#postMessageBtn")?.addEventListener("click", async () => {
      const name = clean($("#messageName")?.value, 80);
      const message = clean($("#messageText")?.value, 500);
      if (!message) return toast("Write something first.");
      if (!sb) return toast("Class wall service is unavailable.");
      const { error } = await sb
        .from("messages")
        .insert({ name: name || "Anonymous", message });
      if (error) return toast("Could not post your message.");
      $("#messageName").value = "";
      $("#messageText").value = "";
      toast("Posted to the class wall.");
      await loadMessages();
    });
  }

  function setupCR() {
    $$(".cr-toggle").forEach((btn) =>
      btn.addEventListener("click", () => {
        const card = btn.closest(".cr-card");
        card.classList.toggle("expanded");
        btn.textContent = card.classList.contains("expanded")
          ? "READ LESS"
          : "READ MORE";
      })
    );
  }

  function setupCards() {
    $("#makeCardBtn")?.addEventListener("click", () => {
      const from = clean($("#cardFrom")?.value, 60),
        to = clean($("#cardTo")?.value, 60),
        msg = clean($("#cardMessage")?.value, 220);
      if (!to || !msg)
        return toast("Add who the card is for and write a message.");
      const preview = $("#cardPreview");
      preview.innerHTML = `<small>BPHARM ONE · CLASS OF 2029</small><strong>For ${esc( to )} ✦</strong><p>${esc(msg)}</p><small>— ${esc( from || "A classmate" )}</small>`;
      preview.classList.remove("hidden");
      preview.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function setupRealtime() {
    if (!sb) return;
    try {
      sb.channel("bpharm-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "memories" },
          loadMemories
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "hearts" },
          loadHearts
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          loadMessages
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime unavailable", e);
    }
  }

  async function init() {
    setupNavigation();
    typeWriter();
    setupMemoryViewer();
    setupMemories();
    setupHearts();
    setupMessages();
    setupCR();
    setupCards();

    const connected = setupSupabase();
    if (!connected) {
      toast("The site is running, but shared features need Supabase.");
      return;
    }
    await Promise.allSettled([loadMemories(), loadHearts(), loadMessages()]);
    setupRealtime();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
