(() => {
  "use strict";

  /* =========================================================
     BPHARM ONE — CLASS OF 2029
     FULL FUNCTIONAL APP.JS
     ========================================================= */

  const SUPABASE_URL =
    "https://hketlksydaqmuiysozdh.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5";

  const MEMORY_BUCKET = "memories";

  let sb = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const esc = (value = "") =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );

  const clean = (value, max = 500) =>
    String(value ?? "")
      .trim()
      .slice(0, max);

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  /* =========================================================
     TOAST
     ========================================================= */

  function toast(message) {
    const box = $("#toast");

    if (!box) {
      console.log("[BPharm One]", message);
      return;
    }

    box.textContent = message;
    box.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
      box.classList.remove("show");
    }, 3000);
  }

  /* =========================================================
     BUTTON ANIMATION
     ========================================================= */

  function pulse(button) {
    if (!button) return;

    button.classList.remove("pop");

    requestAnimationFrame(() => {
      button.classList.add("pop");
    });

    setTimeout(() => {
      button.classList.remove("pop");
    }, 450);
  }

  function busy(button, state, text = "PLEASE WAIT...") {
    if (!button) return;

    if (state) {
      button.dataset.oldText = button.textContent;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;

      if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
        delete button.dataset.oldText;
      }
    }
  }

  /* =========================================================
     TIME
     ========================================================= */

  function timeAgo(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const seconds = Math.max(
      1,
      Math.floor((Date.now() - date.getTime()) / 1000)
    );

    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return date.toLocaleDateString();
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function go(id) {
    const target = document.getElementById(id);

    if (!target) {
      console.warn("Page not found:", id);
      return;
    }

    $$(".page.active").forEach((page) =>
      page.classList.remove("active")
    );

    target.classList.add("active");

    $$(".bottom-nav button").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.go === id
      );
    });

    try {
      history.replaceState(null, "", "#" + id);
    } catch (_) {}

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    const reveal = $(".reveal", target);

    if (reveal) {
      reveal.animate(
        [
          {
            opacity: 0,
            transform: "translateY(18px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 500,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      );
    }
  }

  function setupNavigation() {
    $$("[data-go]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        pulse(button);

        const destination = button.dataset.go;

        if (destination) {
          go(destination);
        }
      });
    });

    const hash = location.hash.replace("#", "");

    if (hash && document.getElementById(hash)) {
      go(hash);
    } else {
      go("home");
    }
  }

  /* =========================================================
     TYPEWRITER
     ========================================================= */

  function setupTypewriter() {
    const element = $("#typewriter");

    if (!element) return;

    const lines = [
      "One year. One class. A thousand moments.",
      "Lectures. Practicals. Exams. Laughter.",
      "We learned. We struggled. We kept going.",
      "BPharm One — our first chapter.",
    ];

    let line = 0;
    let position = 0;
    let deleting = false;

    function tick() {
      const text = lines[line];

      if (!deleting) {
        position++;
        element.textContent = text.slice(0, position);

        if (position >= text.length) {
          deleting = true;

          setTimeout(tick, 1700);

          return;
        }

        setTimeout(tick, 65);
      } else {
        position--;
        element.textContent = text.slice(0, position);

        if (position <= 0) {
          deleting = false;
          line = (line + 1) % lines.length;
          position = 0;
          setTimeout(tick, 500);          return;
        }

        setTimeout(tick, 35);
      }
    }

    tick();
  }

  /* =========================================================
     SUPABASE
     ========================================================= */

  function setupSupabase() {
    try {
      if (
        !window.supabase ||
        typeof window.supabase.createClient !==
          "function"
      ) {
        console.error("Supabase library missing.");
        return false;
      }

      sb = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /* =========================================================
     MEMORY PREVIEW
     ========================================================= */

  function setupMemoryPreview() {
    const input = $("#memoryFile");

    if (!input) return;

    let preview = $("#memoryPreview");

    if (!preview) {
      preview = document.createElement("div");

      preview.id = "memoryPreview";

      preview.style.cssText = `
        display:none;
        margin-top:14px;
        border-radius:18px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.12);
        background:#0c0811;
        position:relative;
      `;

      const image = document.createElement("img");

      image.id = "memoryPreviewImage";

      image.style.cssText = `
        display:block;
        width:100%;
        max-height:320px;
        object-fit:cover;
      `;

      const label = document.createElement("div");

      label.textContent = "📸 Preview — this is what everyone will see";

      label.style.cssText = `
        padding:10px 12px;
        font-size:11px;
        color:#cdbfd1;
        text-align:center;
      `;

      preview.appendChild(image);
      preview.appendChild(label);

      input.parentElement?.appendChild(preview);
    }

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (!file) {
        preview.style.display = "none";
        return;
      }

      if (!file.type.startsWith("image/")) {
        input.value = "";
        preview.style.display = "none";
        toast("Please choose a photo.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        input.value = "";
        preview.style.display = "none";
        toast("Please choose a photo under 5 MB.");
        return;
      }

      const image = $("#memoryPreviewImage");

      if (!image) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        image.src = event.target.result;
        preview.style.display = "block";
      };

      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     MEMORY VIEWER
     ========================================================= */

  function openMemoryViewer(src, caption = "") {
    const viewer = $("#memoryViewer");
    const image = $("#memoryViewerImage");
    const captionBox = $("#memoryViewerCaption");

    if (!viewer || !image) return;

    image.src = src;

    if (captionBox) {
      captionBox.textContent = caption;
    }

    viewer.classList.remove("hidden");

    viewer.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
  }

  function closeMemoryViewer() {
    const viewer = $("#memoryViewer");
    const image = $("#memoryViewerImage");
    const captionBox = $("#memoryViewerCaption");

    if (!viewer) return;

    viewer.classList.add("hidden");

    viewer.setAttribute("aria-hidden", "true");

    if (image) image.src = "";

    if (captionBox) {
      captionBox.textContent = "";
    }

    document.body.style.overflow = "";
  }

  function setupMemoryViewer() {
    $("#memoryViewerClose")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMemoryViewer();
      }
    );

    $("#memoryViewer")?.addEventListener(
      "click",
      (event) => {
        if (event.target.id === "memoryViewer") {
          closeMemoryViewer();
        }
      }
    );

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !$("#memoryViewer")?.classList.contains(
          "hidden"
        )
      ) {
        closeMemoryViewer();
      }
    });
  }

  /* =========================================================
     MEMORY REACTION COUNTS
     ========================================================= */

  async function memoryReactionCount(
    memoryId,
    reaction
  ) {
    if (!sb) return 0;

    const result = await sb
      .from("memory_reactions")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("memory_id", memoryId)
      .eq("reaction", reaction);

    if (result.error) {
      console.warn(
        "Memory reaction count:",
        result.error.message
      );

      return 0;
    }

    return result.count || 0;
  }

  /* =========================================================
     LOAD MEMORIES
     ========================================================= */

  async function loadMemories() {
    const gallery = $("#memoryGallery");

    if (!gallery || !sb) return;

    gallery.innerHTML =
      `<div class="loading">📸 Loading our memories...</div>`;

    const result = await sb
      .from("memories")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(60);

    if (result.error) {
      console.error(
        "Memories:",
        result.error
      );

      gallery.innerHTML = `
        <div class="empty-state">
          📸<br><br>
          Memories could not be loaded right now.        </div>
      `;

      return;
    }

    const memories = result.data || [];

    if (!memories.length) {
      gallery.innerHTML = `
        <div class="empty-state">
          📸<br><br>
          No memories yet.<br>
          Your first photo can start the collection.
        </div>
      `;

      return;
    }

    const reactions = [
      "❤️",
      "😂",
      "🔥",
      "💊",
    ];

    const cards = [];

    for (let index = 0; index < memories.length; index++) {
      const memory = memories[index];

      const counts = await Promise.all(
        reactions.map((reaction) =>
          memoryReactionCount(
            memory.id,
            reaction
          )
        )
      );

      cards.push(`
        <article
          class="memory-card"
          tabindex="0"
          role="button"
          data-memory-open="${esc(memory.id)}"
          style="animation-delay:${Math.min(
            index * 35,
            400
          )}ms"
        >

          <div class="memory-image-wrap">
            <img
              src="${esc(memory.image_url)}"
              alt="${esc(
                memory.caption ||
                  "BPharm One memory"
              )}"
              loading="lazy"
            >
          </div>

          <div class="memory-content">

            <h3>
              ${esc(
                memory.caption ||
                  "A BPharm One memory"
              )}
            </h3>

            <small>
              ${
                memory.anonymous
                  ? "Anonymous"
                  : esc(
                      memory.name ||
                        "BPharm One"
                    )
              }
              ·
              ${timeAgo(memory.created_at)}
            </small>

            <div class="reactions">

              ${reactions
                .map(
                  (reaction, i) => `
                    <button
                      type="button"
                      data-memory-id="${esc(
                        memory.id
                      )}"
                      data-reaction="${reaction}"
                    >
                      ${reaction}
                      <i>${counts[i]}</i>
                    </button>
                  `
                )
                .join("")}

            </div>

            <div class="memory-actions">

              <button
                type="button"
                class="tiny-action"
                data-memory-share="${esc(
                  memory.image_url
                )}"
              >
                SHARE
              </button>

              <button
                type="button"
                class="tiny-action"
                data-memory-download="${esc(
                  memory.image_url
                )}"
              >
                DOWNLOAD
              </button>

            </div>

          </div>
        </article>
      `);
    }

    gallery.innerHTML = cards.join("");
  }

  /* =========================================================
     DOWNLOAD IMAGE
     ========================================================= */

  async function downloadImage(url, filename) {
    try {
      toast("Preparing download...");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Image could not be downloaded.");
      }

      const blob = await response.blob();

      const blobUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = blobUrl;
      link.download =
        filename ||
        `bpharm-memory-${Date.now()}.jpg`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(
        () => URL.revokeObjectURL(blobUrl),
        1000
      );

      toast("Downloaded.");
    } catch (error) {
      console.error(error);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      toast(
        "Opening the image. You can save it from there."
      );
    }
  }

  /* =========================================================
     SHARE
     ========================================================= */

  async function shareContent({
    title = "BPharm One",
    text = "",
    url = location.href,
  }) {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url
      );

      toast("Share link copied.");
    } catch (error) {
      if (error?.name === "AbortError") return;

      toast("Sharing is not available here.");
    }
  }

  /* =========================================================
     MEMORY UPLOAD
     ========================================================= */

  function setupMemories() {
    const fileInput = $("#memoryFile");
    const saveButton = $("#uploadMemoryBtn");
    const gallery = $("#memoryGallery");

    setupMemoryPreview();

    saveButton?.addEventListener(
      "click",
      async () => {
        const file =
          fileInput?.files?.[0];

        const caption = clean(
          $("#memoryCaption")?.value,
          160
        );

        const name = clean(
          $("#memoryName")?.value,
          80
        );

        if (!file) {
          toast(
            "📸 Choose a photo first."
          );

          return;
        }

        if (!file.type.startsWith("image/")) {
          toast("Please choose an image.");

          return;
          }        if (file.size > 5 * 1024 * 1024) {
          toast(
            "Please choose a photo under 5 MB."
          );

          return;
        }

        if (!caption) {
          toast(
            "Give the memory a short caption."
          );

          return;
        }

        if (!sb) {
          toast(
            "Shared memory service is unavailable."
          );

          return;
        }

        busy(
          saveButton,
          true,
          "UPLOADING..."
        );

        try {
          const safeName =
            file.name.replace(
              /[^a-zA-Z0-9._-]/g,
              "_"
            );

          const randomId =
            window.crypto &&
            typeof window.crypto.randomUUID ===
              "function"
              ? window.crypto.randomUUID()
              : `${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2)}`;

          const path =
            `${randomId}-${safeName}`;

          toast(
            "📸 Uploading your memory..."
          );

          const upload =
            await sb.storage
              .from(MEMORY_BUCKET)
              .upload(
                path,
                file,
                {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: file.type,
                }
              );

          if (upload.error) {
            throw upload.error;
          }

          const publicResult =
            sb.storage
              .from(MEMORY_BUCKET)
              .getPublicUrl(path);

          const imageUrl =
            publicResult?.data?.publicUrl;

          if (!imageUrl) {
            throw new Error(
              "The uploaded image has no public URL."
            );
          }

          const insert =
            await sb
              .from("memories")
              .insert({
                name:
                  name || "Anonymous",
                caption,
                image_url: imageUrl,
                anonymous: !name,
              });

          if (insert.error) {
            throw insert.error;
          }

          if (fileInput) {
            fileInput.value = "";
          }

          if ($("#memoryCaption")) {
            $("#memoryCaption").value = "";
          }

          if ($("#memoryName")) {
            $("#memoryName").value = "";
          }

          const preview =
            $("#memoryPreview");

          if (preview) {
            preview.style.display = "none";
          }

          toast(
            "Memory added. Everyone can now see it."
          );

          await loadMemories();
        } catch (error) {
          console.error(
            "Memory upload error:",
            error
          );

          toast(
            "Upload failed: " +
              (
                error?.message ||
                "Please try again."
              )
          );
        } finally {
          busy(saveButton, false);
        }
      }
    );

    gallery?.addEventListener(
      "click",
      async (event) => {

        /* REACTION */

        const reaction =
          event.target.closest(
            "[data-memory-id][data-reaction]"
          );

        if (reaction) {
          event.stopPropagation();

          const memoryId =
            reaction.dataset.memoryId;

          const reactionType =
            reaction.dataset.reaction;

          const storageKey =
            `memory:${memoryId}:${reactionType}`;

          if (
            localStorage.getItem(storageKey)
          ) {
            toast(
              "You already gave this reaction."
            );

            return;
          }

          const result =
            await sb
              .from("memory_reactions")
              .insert({
                memory_id: memoryId,
                reaction: reactionType,
              });

          if (result.error) {
            console.error(result.error);

            toast(
              "Reaction could not be saved."
            );

            return;
          }

          localStorage.setItem(
            storageKey,
            "1"
          );

          const counter =
            $("i", reaction);

          if (counter) {
            counter.textContent =
              Number(
                counter.textContent || 0
              ) + 1;
          }

          pulse(reaction);

          return;
        }

        /* SHARE */

        const shareButton =
          event.target.closest(
            "[data-memory-share]"
          );

        if (shareButton) {
          event.stopPropagation();

          await shareContent({
            title:
              "BPharm One Memory",
            text:
              "A memory from BPharm One — Class of 2029.",
            url:
              shareButton.dataset.memoryShare,
          });

          return;
        }

        /* DOWNLOAD */

        const downloadButton =
          event.target.closest(
            "[data-memory-download]"
          );

        if (downloadButton) {
          event.stopPropagation();

          await downloadImage(
            downloadButton.dataset
              .memoryDownload,
            `bpharm-memory-${Date.now()}.jpg`
          );

          return;
        }

        /* OPEN IMAGE */

        const card =
          event.target.closest(
            ".memory-card"
          );

        if (!card) return;

        const image =          $("img", card);

        if (image?.src) {
          openMemoryViewer(
            image.src,
            $("h3", card)
              ?.textContent || ""
          );
        }
      }
    );

    gallery?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        const card =
          event.target.closest(
            ".memory-card"
          );

        if (!card) return;

        event.preventDefault();

        const image =
          $("img", card);

        if (image?.src) {
          openMemoryViewer(
            image.src,
            $("h3", card)
              ?.textContent || ""
          );
        }
      }
    );
  }

  /* =========================================================
     HEARTS
     ========================================================= */

  async function loadHearts() {
    if (!sb) return;

    const result =
      await sb
        .from("hearts")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

    if (result.error) {
      console.error(
        "Hearts:",
        result.error
      );

      return;
    }

    const data =
      result.data || [];

    const count =
      $("#heartCount");

    if (count) {
      count.textContent =
        data.length;
    }

    const feed =
      $("#heartFeed");

    if (!feed) return;

    if (!data.length) {
      feed.innerHTML = `
        <div class="loading">
          ❤️<br><br>
          No hearts shared yet.<br>
          Someone can be the first.
        </div>
      `;

      return;
    }

    feed.innerHTML =
      data
        .map(
          (heart) => `
            <div class="love-card">

              <div class="love-line">
                ❤️

                <strong>
                  ${esc(
                    heart.sender_name ||
                      "Anonymous"
                  )}
                </strong>

                <span class="love-arrow">
                  →
                </span>

                <strong>
                  ${esc(
                    heart.receiver_name ||
                      "BPharm One"
                  )}
                </strong>
              </div>

              <small>
                ${timeAgo(
                  heart.created_at
                )}
              </small>

            </div>
          `
        )
        .join("");
  }

  function setupHearts() {
    $("#sendHeartBtn")?.addEventListener(
      "click",
      async () => {
        const sender = clean(
          $("#heartSender")?.value,
          80
        );

        const receiver = clean(
          $("#heartReceiver")?.value,
          80
        );

        if (!receiver) {
          toast(
            "Enter the person you want to appreciate."
          );

          return;
        }

        if (!sb) {
          toast(
            "Heart service is unavailable."
          );

          return;
        }

        const button =
          $("#sendHeartBtn");

        busy(
          button,
          true,
          "SHARING..."
        );

        const result =
          await sb
            .from("hearts")
            .insert({
              sender_name:
                sender || "Anonymous",
              receiver_name:
                receiver,
            });

        if (result.error) {
          console.error(result.error);

          toast(
            "Could not save the heart."
          );

          busy(button, false);

          return;
        }

        $("#heartSender").value = "";
        $("#heartReceiver").value = "";

        busy(button, false);

        toast(
          "❤️ Appreciation shared."
        );

        await loadHearts();
      }
    );
  }

/* =========================================================
     MESSAGES
     ========================================================= */

  async function getReplies(messageId) {
    if (!sb) return [];

    const result =
      await sb
        .from("replies")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", {
          ascending: true,
        });

    if (result.error) {
      console.warn(
        "Replies:",
        result.error.message
      );

      return [];
    }

    return result.data || [];
  }

  async function loadMessages() {
    if (!sb) return;

    const feed =
      $("#messageFeed");

    if (!feed) return;

    const result =
      await sb
        .from("messages")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

    if (result.error) {
      console.error(
        "Messages:",
        result.error
      );

      feed.innerHTML = `        <div class="loading">
          The class wall could not load.
        </div>
      `;

      return;
    }

    const messages =
      result.data || [];

    if (!messages.length) {
      feed.innerHTML = `
        <div class="loading">
          💬<br><br>
          No messages yet.<br>
          Leave the first one.
        </div>
      `;

      return;
    }

    feed.innerHTML =
      messages
        .map(
          (message) => `
            <article
              class="message-card"
              data-message-card="${esc(
                message.id
              )}"
            >

              <div class="message-head">

                <strong>
                  ${esc(
                    message.name ||
                      "Anonymous"
                  )}
                </strong>

                <small>
                  ${timeAgo(
                    message.created_at
                  )}
                </small>

              </div>

              <p>
                ${esc(
                  message.message ||
                    message.text ||
                    ""
                )}
              </p>

              <div
                class="item-actions"
              >

                <button
                  type="button"
                  class="tiny-action"
                  data-show-replies="${esc(
                    message.id
                  )}"
                >
                  💬 REPLY
                </button>

                <button
                  type="button"
                  class="tiny-action"
                  data-share-message="${esc(
                    message.message ||
                      message.text ||
                      ""
                  )}"
                >
                  SHARE
                </button>

              </div>

              <div
                class="reply-area"
                data-reply-area="${esc(
                  message.id
                )}"
              >
              </div>

            </article>
          `
        )
        .join("");
  }

  async function showReplies(
    messageId,
    area
  ) {
    if (!area) return;

    area.innerHTML =
      `<div class="reply-loading">Loading replies...</div>`;

    const replies =
      await getReplies(messageId);

    area.innerHTML = `
      <div class="reply-list">

        ${
          replies.length
            ? replies
                .map(
                  (reply) => `
                    <div class="reply">

                      <strong>
                        ${esc(
                          reply.name ||
                            "Anonymous"
                        )}
                      </strong>

                      <small>
                        ${timeAgo(
                          reply.created_at
                        )}
                      </small>

                      <p>
                        ${esc(
                          reply.reply ||
                            reply.message ||
                            reply.text ||
                            ""
                        )}
                      </p>

                    </div>
                  `
                )
                .join("")
            : `<div class="reply-empty">
                No replies yet. Start the conversation.
              </div>`
        }

      </div>

      <div class="reply-box">

        <input
          type="text"
          maxlength="80"
          data-reply-name
          placeholder="Your name"
        >

        <input
          type="text"
          maxlength="300"
          data-reply-text
          placeholder="Write a reply..."
        >

        <button
          type="button"
          class="tiny-action"
          data-send-reply="${esc(
            messageId
          )}"
        >
          SEND
        </button>

      </div>
    `;
  }

  async function sendReply(
    messageId,
    area,
    button
  ) {
    const name =
      clean(
        $("[data-reply-name]", area)
          ?.value,
        80
      );

    const text =
      clean(
        $("[data-reply-text]", area)
          ?.value,
        300
      );

    if (!text) {
      toast(
        "Write something before sending."
      );

      return;
    }

    busy(
      button,
      true,
      "SENDING..."
    );

    const result =
      await sb
        .from("replies")
        .insert({
          message_id: messageId,
          name:
            name || "Anonymous",
          reply: text,
        });

    if (result.error) {
      console.error(
        "Reply insert:",
        result.error
      );

      toast(
        "Reply could not be saved: " +
          result.error.message
      );

      busy(button, false);

      return;
    }

    toast("Reply added.");

    await showReplies(
      messageId,
      area
    );
  }

  function setupMessages() {
    $("#postMessageBtn")?.addEventListener(
      "click",
      async () => {
        const name =
          clean(
            $("#messageName")?.value,
            80
          );

        const message =
          clean(
            $("#messageText")?.value,            500
          );

        if (!message) {
          toast(
            "Write something first."
          );

          return;
        }

        if (!sb) {
          toast(
            "Class wall service is unavailable."
          );

          return;
        }

        const button =
          $("#postMessageBtn");

        busy(
          button,
          true,
          "POSTING..."
        );

        const result =
          await sb
            .from("messages")
            .insert({
              name:
                name || "Anonymous",
              message,
            });

        if (result.error) {
          console.error(
            result.error
          );

          toast(
            "Could not post: " +
              result.error.message
          );

          busy(button, false);

          return;
        }

        $("#messageName").value = "";
        $("#messageText").value = "";

        busy(button, false);

        toast(
          "Message posted to the class wall."
        );

        await loadMessages();
      }
    );

    $("#messageFeed")?.addEventListener(
      "click",
      async (event) => {
        const replyButton =
          event.target.closest(
            "[data-show-replies]"
          );

        if (replyButton) {
          const messageId =
            replyButton.dataset
              .showReplies;

          const area =
            $(
              `[data-reply-area="${CSS.escape(
                messageId
              )}"]`
            );

          if (!area) return;

          if (
            area.dataset.open === "1"
          ) {
            area.innerHTML = "";
            area.dataset.open = "0";
            replyButton.textContent =
              "💬 REPLY";

            return;
          }

          area.dataset.open = "1";

          replyButton.textContent =
            "HIDE REPLIES";

          await showReplies(
            messageId,
            area
          );

          return;
        }

        const sendButton =
          event.target.closest(
            "[data-send-reply]"
          );

        if (sendButton) {
          const messageId =
            sendButton.dataset
              .sendReply;

          const area =
            sendButton.closest(
              ".reply-area"
            );

          if (!area) return;

          await sendReply(
            messageId,
            area,
            sendButton
          );

          return;
        }

        const shareButton =
          event.target.closest(
            "[data-share-message]"
          );

        if (shareButton) {
          await shareContent({
            title:
              "BPharm One Class Wall",
            text:
              shareButton.dataset
                .shareMessage,
            url: location.href,
          });
        }
      }
    );
  }

/* =========================================================
     CR CARDS
     ========================================================= */

  const CR_NAMES = {
    "1": "Madam Adina",
    "2": "Julius",
    "3": "Paschal",
  };

  async function loadCRAppreciations(
    crId,
    container
  ) {
    if (!container || !sb) return;

    const result =
      await sb
        .from("cr_appreciations")
        .select("*")
        .eq("cr_id", crId)
        .order("created_at", {
          ascending: false,
        });

    if (result.error) {
      console.warn(
        "CR appreciation:",
        result.error.message
      );

      container.innerHTML = `
        <div class="cr-count">
          Appreciation is temporarily unavailable.
        </div>
      `;

      return;
    }

    const data =
      result.data || [];

    container.innerHTML = `
      <div class="cr-count">
        ❤️ ${data.length} appreciation${
          data.length === 1
            ? ""
            : "s"
        }
      </div>

      <div class="cr-appreciation-list">

        ${
          data.length
            ? data
                .map(
                  (item) => `
                    <div class="cr-note">

                      <strong>
                        ${esc(
                          item.name ||
                            "Anonymous"
                        )}
                      </strong>

                      <p>
                        ${esc(
                          item.message ||
                            item.note ||
                            item.appreciation ||
                            ""
                        )}
                      </p>

                    </div>
                  `
                )
                .join("")
            : `<div class="cr-count">
                No appreciation yet. Be the first.
              </div>`
        }

      </div>
    `;
  }

function setupCR() {
  $$(".cr-card").forEach((card, index) => {
    const crId =
      card.dataset.crId ||
      String(index + 1);

    card.dataset.crId = crId;

    const toggle = $(".cr-toggle", card);

    toggle?.addEventListener("click", () => {
      card.classList.toggle("expanded");

      toggle.textContent =
        card.classList.contains("expanded")
          ? "READ LESS"
          : "READ MORE";
    });

    const box =
      $(".cr-appreciation-box", card);

    if (!box) return;

    const nameInput =
      $(".cr-appreciation-name", box);

    const messageInput =
      $(".cr-appreciation-message", box);

    const list =
      $(".cr-appreciation-list", box);

    loadCRAppreciations(crId, list);
  });

  document.addEventListener("click", async (event) => {
    const button =
      event.target.closest("[data-appreciate-cr]");

    if (!button) return;

    const card =
      button.closest(".cr-card");

    if (!card || !sb) return;

    const crId =
      card.dataset.crId;

    const name =
      clean(
        $(".cr-appreciation-name", card)?.value,
        60
      );

    const message =
      clean(
        $(".cr-appreciation-message", card)?.value,
        220
      );

    if (!message) {
      toast("Write a short appreciation first.");
      return;
    }

    busy(
      button,
      true,
      "SAVING..."
    );

    const result =
      await sb
        .from("cr_appreciations")
        .insert({
  cr_id: crId,
  cr_name: card.dataset.crName || "",
  sender_name: name || "Anonymous",
  appreciation: message
});

    if (result.error) {
      console.error(
        "CR appreciation insert:",
        result.error
      );

      toast(
        "Could not save appreciation: " +
        result.error.message
      );

      busy(button, false);
      return;
    }

    $(".cr-appreciation-name", card).value = "";
    $(".cr-appreciation-message", card).value = "";

    busy(button, false);

    toast(
      `Appreciation sent to ${
        CR_NAMES[crId] ||
        "the representative"
      }.`
    );

    await loadCRAppreciations(
      crId,
      $(".cr-appreciation-list", card)
    );
  });
}                      
          
/* =========================================================
     CARD STUDIO
     ========================================================= */

  function buildCardHTML(
    from,
    to,
    message
  ) {
    return `
      <div
        class="downloadable-card"
        style="
          padding:36px 24px;
          border-radius:24px;
          text-align:center;
          background:
            radial-gradient(
              circle at top,
              #42163f,
              #160d24 65%,
              #0c0712
            );
          color:white;
          border:1px solid rgba(255,79,163,.45);
          box-shadow:
            0 25px 70px rgba(0,0,0,.55);
          font-family:Arial,sans-serif;
        "
      >

        <div
          style="
            font-size:10px;
            letter-spacing:3px;
            opacity:.7;
          "
        >
          BPHARM ONE · CLASS OF 2029
        </div>

        <div
          style="
            font-size:45px;
            margin:20px 0 8px;
          "
        >
          ❤️
        </div>

        <div
          style="
            font-size:12px;
            letter-spacing:2px;
            opacity:.7;
          "
        >
          A NOTE FOR
        </div>

        <div
          style="
            font-size:30px;
            font-weight:900;
            margin:8px 0 22px;
          "
        >
          ${esc(to)}
        </div>

        <div
          style="
            font-size:17px;            line-height:1.7;
            color:#eaddea;
            padding:0 8px;
          "
        >
          ${esc(message)}
        </div>

        <div
          style="
            margin-top:26px;
            font-size:11px;
            color:#c9b5ca;
          "
        >
          — ${esc(from || "A classmate")}
        </div>

        <div
          style="
            margin-top:24px;
            font-size:9px;
            letter-spacing:2px;
            opacity:.45;
          "
        >
          KEEP GOING. KEEP GROWING.
        </div>

      </div>
    `;
  }

  async function downloadCard(
    from,
    to,
    message
  ) {
    if (
      typeof html2canvas ===
      "undefined"
    ) {
      toast(
        "Card download library is not loaded."
      );

      return;
    }

    const holder =
      document.createElement("div");

    holder.style.cssText = `
      position:fixed;
      left:-10000px;
      top:0;
      width:500px;
      background:#0c0712;
      padding:0;
      z-index:-1;
    `;

    holder.innerHTML =
      buildCardHTML(
        from,
        to,
        message
      );

    document.body.appendChild(holder);

    try {
      const canvas =
        await html2canvas(
          holder.firstElementChild,
          {
            backgroundColor:
              "#0c0712",
            scale:
              Math.min(
                3,
                window.devicePixelRatio ||
                  2
              ),
            useCORS: true,
          }
        );

      const link =
        document.createElement("a");

      link.download =
        `BPharm-One-${to.replace(
          /[^a-z0-9]/gi,
          "-"
        )}.png`;

      link.href =
        canvas.toDataURL(
          "image/png"
        );

      link.click();

      toast(
        "Card downloaded."
      );
    } catch (error) {
      console.error(error);

      toast(
        "Card could not be downloaded."
      );
    } finally {
      holder.remove();
    }
  }

  function setupCards() {
    $("#makeCardBtn")?.addEventListener(
      "click",
      () => {
        const from =
          clean(
            $("#cardFrom")?.value,
            60
          );

        const to =
          clean(
            $("#cardTo")?.value,
            60
          );

        const message =
          clean(
            $("#cardMessage")?.value,
            220
          );

        if (!to || !message) {
          toast(
            "Add who the card is for and write a message."
          );

          return;
        }

        const preview =
          $("#cardPreview");

        if (!preview) return;

        preview.innerHTML = `
          ${buildCardHTML(
            from,
            to,
            message
          )}

          <div
            class="item-actions"
            style="
              justify-content:center;
              margin-top:14px;
            "
          >

            <button
              type="button"
              class="tiny-action"
              id="downloadGeneratedCard"
            >
              DOWNLOAD CARD
            </button>

            <button
              type="button"
              class="tiny-action"
              id="shareGeneratedCard"
            >
              SHARE CARD
            </button>

          </div>
        `;

        preview.classList.remove(
          "hidden"
        );

        preview.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        $("#downloadGeneratedCard")
          ?.addEventListener(
            "click",
            async () => {
              await downloadCard(
                from,
                to,
                message
              );
            }
          );

        $("#shareGeneratedCard")
          ?.addEventListener(
            "click",
            async () => {
              await shareContent({
                title:
                  "BPharm One Appreciation Card",
                text:
                  `A card for ${to}: ${message}`,
                url:
                  location.href +
                  "#cards",
              });
            }
          );
      }
    );
  }

/* =========================================================
     FAITH
     ========================================================= */

  function setupFaith() {
    const faith =
      $("#faith .faith-card");

    if (!faith) return;

    if (
      !$(".quran-card", $("#faith"))
    ) {
      faith.insertAdjacentHTML(
        "afterend",
        `
          <div class="faith-card quran-card">

            <div class="faith-label">
              QURAN · A SIMILAR MESSAGE
            </div>

            <p class="scripture">
              “And say, ‘My Lord, increase me in knowledge.’”
            </p>

            <small>
              Quran 20:114
            </small>

          </div>
        `
      );
    }
  }

  /* =========================================================
     REALTIME     ========================================================= */

  function setupRealtime() {
    if (!sb) return;

    try {
      sb.channel(
        "bpharm-one-live"
      )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "memories",
          },
          () => loadMemories()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "memory_reactions",
          },
          () => loadMemories()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => loadMessages()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "replies",
          },
          () => loadMessages()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "hearts",
          },
          () => loadHearts()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cr_appreciations",
          },
          () => {
            $$(".cr-card").forEach(
              (card, index) => {
                const crId =
                  card.dataset.crId ||
                  String(index + 1);

                loadCRAppreciations(
                  crId,
                  $(
                    `[data-cr-results="${CSS.escape(
                      crId
                    )}"]`,
                    card
                  )
                );
              }
            );
          }
        )
        .subscribe();
    } catch (error) {
      console.warn(
        "Realtime setup:",
        error
      );
    }
  }

  /* =========================================================
     DYNAMIC INSTRUCTIONS
     ========================================================= */

  function addInstructions() {
    const memoryForm =
      $(".upload-card");

    if (
      memoryForm &&
      !$(".info-banner", memoryForm)
    ) {
      memoryForm.insertAdjacentHTML(
        "afterbegin",
        `
          <div class="info-banner">

            <span>📸</span>

            <div>
              <strong>
                Add a moment worth keeping
              </strong>

              <p>
                Share a class photo, practical,
                presentation, study moment or simple
                memory. Add a short caption so people
                remember the story behind it.
              </p>
            </div>

          </div>
        `
      );
    }

    const wall =
      $(".wall-composer");

    if (
      wall &&
      !$(".info-banner", wall)
    ) {
      wall.insertAdjacentHTML(
        "afterbegin",
        `
          <div class="info-banner">

            <span>💬</span>

            <div>
              <strong>
                Leave something behind
              </strong>

              <p>
                Write encouragement, a funny memory,
                a lesson, or something you want the
                class to remember. Your words may mean
                more to someone than you expect.
              </p>
            </div>

          </div>
        `
      );
    }

    const cards =
      $(".card-studio");

    if (
      cards &&
      !$(".info-banner", cards)
    ) {
      cards.insertAdjacentHTML(
        "afterbegin",
        `
          <div class="info-banner">

            <span>✦</span>

            <div>
              <strong>
                Make someone's day
              </strong>

              <p>
                Create a simple card for a classmate,
                representative, or anyone who helped
                you during the journey. Download it
                or share it.
              </p>
            </div>

          </div>
        `
      );
    }
  }

  /* =========================================================
     LOAD ALL
     ========================================================= */

  async function loadEverything() {
    await Promise.allSettled([
      loadMemories(),
      loadHearts(),
      loadMessages(),
    ]);
  }

/* =========================================================
     INIT
     ========================================================= */

  async function init() {
    setupNavigation();

    setupTypewriter();

    setupMemoryViewer();

    setupMemories();

    setupHearts();

setupMessages();

setupCards();

setupFaith();

addInstructions();

const connected =
  setupSupabase();

setupCR();

    if (!connected) {
      toast(
        "Shared features need Supabase."
      );

      return;
    }

    await loadEverything();

    setupRealtime();

    console.log(
      "BPharm One — Class of 2029 loaded."
    );
  }

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
