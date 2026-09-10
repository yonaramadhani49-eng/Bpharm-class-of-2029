(() => {
  "use strict";

  const SUPABASE_URL = "https://hketlksydaqmuiysozdh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5";
  let sb = null;
  let liveChannel = null;

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
    if (!box) {
      console.log("[BPharm One]", message);
      return;
    }
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

  function setBusy(button, busy, text) {
    if (!button) return;
    if (busy) {
      button.dataset.oldText = button.textContent;
      button.disabled = true;
      if (text) button.textContent = text;
    } else {
      button.disabled = false;
      if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
        delete button.dataset.oldText;
      }
    }
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
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
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    target.querySelector(".reveal")?.animate(
      [
        { opacity: 0, transform: "translateY(18px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }

  function setupNavigation() {
    $$("[data-go]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        pulse(b);
        go(b.dataset.go);
      })
    );
    const hash = location.hash.replace(/^#/, "");
    go(hash && document.getElementById(hash) ? hash : "home");
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
    try {
      if (!window.supabase?.createClient) return false;
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function count(table, field, id, extraField, extraValue) {
    if (!sb) return 0;
    const q = sb
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(field, id);
    if (extraField) q.eq(extraField, extraValue);
    const { count, error } = await q;
    return error ? 0 : count || 0;
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
      gallery.innerHTML =
        '<div class="empty-state">📸<br>Memories could not be loaded right now.</div>';
      return;
    }
    if (!data?.length) {
      gallery.innerHTML =
        '<div class="empty-state">📸<br><strong>No memories yet.</strong><br>Share one photo and help the class remember.</div>';
      return;
    }

    const reactions = ["❤️", "😂", "🔥", "💊"];
    const cards = [];
    for (const m of data) {
      const counts = await Promise.all(
        reactions.map((r) =>
          count("memory_reactions", "memory_id", m.id, "reaction", r)
        )
      );
      cards.push(` <article class="memory-card" data-memory-id="${esc( m.id )}" tabindex="0" role="button"> <div class="memory-image-wrap"><img src="${esc( m.image_url )}" alt="${esc( m.caption || "BPharm One memory" )}" loading="lazy"></div> <div class="memory-content"> <h3>${esc(m.caption || "A BPharm One memory")}</h3> <small>${ m.anonymous ? "Anonymous" : esc(m.name || "BPharm One") } · ${timeAgo(m.created_at)}</small> <div class="reactions"> ${reactions .map( (r, i) => `<button type="button" data-memory-id="${esc( m.id )}" data-reaction="${r}">${r} <i>${counts[i]}</i></button>` ) .join("")} </div> <div class="memory-actions"> <button type="button" class="tiny-action" data-share-memory="${esc( m.id )}">↗ Share</button> <button type="button" class="tiny-action" data-download-memory="${esc( m.image_url )}">↓ Save photo</button> </div> </div> </article>`);
    }
    gallery.innerHTML = cards.join("");
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

  async function downloadUrl(url, filename = "bpharm-one-memory.jpg") {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const object = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = object;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(object), 1500);
      toast("Saved to your device.");
    } catch (e) {
      const a = document.createElement("a");
      a.href =
        url +
        (url.includes("?") ? "&" : "?") +
        "download=bpharm-one-memory.jpg";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Opening the photo. Use Save/Download if your browser asks.");
    }
  }

  async function shareText(title, text, url = location.href) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast("Share text copied. Paste it anywhere.");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast("Sharing was cancelled.");
    }
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
      if (!caption) return toast("Add a short caption first.");
      if (!sb) return toast("Shared memory service is unavailable.");
      setBusy(save, true, "UPLOADING...");
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
        const ins = await sb
          .from("memories")
          .insert({
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
        setBusy(save, false);
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
        const { error } = await sb
          .from("memory_reactions")
          .insert({
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
      const share = e.target.closest("[data-share-memory]");
      if (share) {
        e.stopPropagation();
        const card = share.closest(".memory-card"),
          caption = $("h3", card)?.textContent || "BPharm One memory";
        await shareText("BPharm One — Memory", `📸 ${caption}`);
        return;
      }
      const dl = e.target.closest("[data-download-memory]");
      if (dl) {
        e.stopPropagation();
        await downloadUrl(dl.dataset.downloadMemory);
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
    if (error) {
      console.error(error);
      return;
    }
    $("#heartCount") && ($("#heartCount").textContent = data?.length || 0);
    const feed = $("#heartFeed");
    if (!feed) return;
    feed.innerHTML = data?.length
      ? data
          .map(
            (h) => ` <article class="love-card"> <div class="love-line">❤️ <strong>${esc( h.sender_name || "Anonymous" )}</strong><span class="love-arrow">→</span><strong>${esc( h.receiver_name || "BPharm One" )}</strong></div> <small>${timeAgo(h.created_at)}</small> <div class="item-actions"><button class="tiny-action" data-share-heart="${esc( h.receiver_name || "BPharm One" )}">↗ Share appreciation</button></div> </article>`
          )
          .join("")
      : `<div class="loading">No hearts shared yet. Be the first.</div>`;
  }

  function setupHearts() {
    $("#sendHeartBtn")?.addEventListener("click", async () => {
      const sender = clean($("#heartSender")?.value, 80),
        receiver = clean($("#heartReceiver")?.value, 80);
      if (!receiver) return toast("Enter the person you want to appreciate.");
      if (!sb) return toast("Shared appreciation service is unavailable.");
      const btn = $("#sendHeartBtn");
      setBusy(btn, true, "SENDING...");
      const { error } = await sb
        .from("hearts")
        .insert({
          sender_name: sender || "Anonymous",
          receiver_name: receiver,
        });
      setBusy(btn, false);
      if (error) return toast("Could not save the appreciation.");
      $("#heartSender").value = "";
      $("#heartReceiver").value = "";
      toast("Appreciation shared.");
      await loadHearts();
    });

    $("#heartFeed")?.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-share-heart]");
      if (!b) return;
      await shareText(
        "BPharm One — Appreciation",
        `❤️ ${b.dataset.shareHeart} was appreciated by a classmate.`
      );
    });
  }

  async function loadMessages() {
    if (!sb) return;
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      return;
    }
    const feed = $("#messageFeed");
    if (!feed) return;
    feed.innerHTML = data?.length
      ? data
          .map(
            (m) => ` <article class="message-card" data-message-id="${esc(m.id)}"> <div class="message-head"><strong>${esc( m.name || "Anonymous" )}</strong><small>${timeAgo(m.created_at)}</small></div> <p>${esc(m.message || m.text || "")}</p> <div class="reply-list" data-replies-for="${esc( m.id )}"><span class="reply-loading">Replies appear here.</span></div> <div class="reply-box"> <input class="reply-name" maxlength="60" placeholder="Your name (optional)"> <input class="reply-text" maxlength="240" placeholder="Reply to this message..."> <button class="tiny-action reply-btn" data-reply="${esc( m.id )}">↩ Reply</button> </div> <div class="item-actions"> <button class="tiny-action" data-share-message="${esc( m.id )}">↗ Share</button> </div> </article>`
          )
          .join("")
      : `<div class="loading">No messages yet. Be the first to leave a kind word.</div>`;
    await loadReplies();
  }

  async function loadReplies() {
    if (!sb) return;
    const { data, error } = await sb
      .from("message_replies")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) {
      console.warn("Replies unavailable:", error);
      return;
    }
    $$(".reply-list").forEach((box) => {
      const id = box.dataset.repliesFor;
      const rows = (data || []).filter(
        (r) => String(r.message_id) === String(id)
      );
      box.innerHTML = rows.length
        ? rows
            .map(
              (r) =>
                `<div class="reply"><strong>${esc( r.name || "Anonymous" )}</strong><small>${timeAgo(r.created_at)}</small><p>${esc( r.reply || r.message || "" )}</p></div>`
            )
            .join("")
        : `<span class="reply-empty">No replies yet. You can be the first.</span>`;
    });
  }

  function setupMessages() {
    $("#postMessageBtn")?.addEventListener("click", async () => {
      const name = clean($("#messageName")?.value, 80),
        message = clean($("#messageText")?.value, 500);
      if (!message) return toast("Write something first.");
      if (!sb) return toast("Class wall service is unavailable.");
      const btn = $("#postMessageBtn");
      setBusy(btn, true, "POSTING...");
      const { error } = await sb
        .from("messages")
        .insert({ name: name || "Anonymous", message });
      setBusy(btn, false);
      if (error) return toast("Could not post your message.");
      $("#messageName").value = "";
      $("#messageText").value = "";
      toast("Posted. Others can reply below it.");
      await loadMessages();
    });

    $("#messageFeed")?.addEventListener("click", async (e) => {
      const reply = e.target.closest("[data-reply]");
      if (reply) {
        const card = reply.closest(".message-card");
        const name = clean($(".reply-name", card)?.value, 60);
        const text = clean($(".reply-text", card)?.value, 240);
        if (!text) return toast("Write your reply first.");
        if (!sb) return toast("Reply service is unavailable.");
        setBusy(reply, true, "SENDING...");
        const { error } = await sb
          .from("message_replies")
          .insert({
            message_id: reply.dataset.reply,
            name: name || "Anonymous",
            reply: text,
          });
        setBusy(reply, false);
        if (error) {
          console.error(error);
          return toast(
            "Reply could not be saved. Check the replies table in Supabase."
          );
        }
        $(".reply-name", card).value = "";
        $(".reply-text", card).value = "";
        toast("Reply added.");
        await loadReplies();
        return;
      }
      const share = e.target.closest("[data-share-message]");
      if (share) {
        const card = share.closest(".message-card");
        await shareText(
          "BPharm One — Class Wall",
          $("p", card)?.textContent || "A class wall message"
        );
      }
    });
  }

  async function loadCR() {
    if (!sb) return;
    const { data, error } = await sb
      .from("cr_appreciations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.warn("CR appreciations table unavailable:", error);
      return;
    }
    $$(".cr-card").forEach((card) => {
      const person = card.dataset.crName;
      const rows = (data || []).filter(
        (x) => String(x.cr_name) === String(person)
      );
      const countEl = $(".cr-appreciation-count", card);
      if (countEl) countEl.textContent = rows.length;
      const list = $(".cr-appreciation-list", card);
      if (list)
        list.innerHTML = rows.length
          ? rows
              .slice(0, 8)
              .map(
                (x) =>
                table === "memory_reactions")
              loadMemories();
            if (table === "hearts") loadHearts();
            if (table === "messages" || table === "message_replies") {
              loadMessages();
              loadReplies();
            }
            if (table === "cr_appreciations") loadCR();
            if (table === "appreciation_cards") loadCards();
          }
        );
      });
      liveChannel.subscribe();
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
    setupFaith();
    const connected = setupSupabase();
    if (!connected) {
      toast("The site is running, but shared features need Supabase.");
      return;
    }
    await loadInitial();
    setupRealtime();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
