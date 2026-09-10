(() => {
  'use strict';

  /* =====================================================
     BPHARM ONE — CLASS OF 2029
     PROFESSIONAL INTERACTIVE MEMORY EXPERIENCE
     Supabase-powered
  ====================================================== */

  const SUPABASE_URL =
    'https://hketlksydaqmuiysozdh.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5';

  let sb = null;

  const realtimeChannels = new Map();

  /* =====================================================
     DOM HELPERS
  ====================================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const esc = (value = '') =>
    String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

  const clean = (value, max = 1000) =>
    String(value || '')
      .trim()
      .slice(0, max);

  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

  /* =====================================================
     TIME
  ====================================================== */

  function timeAgo(iso) {
    if (!iso) return '';

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const seconds = Math.max(
      1,
      Math.floor(
        (Date.now() - date.getTime()) / 1000
      )
    );

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

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

  /* =====================================================
     TOAST
  ====================================================== */

  function toast(message) {
    const box = $('#toast');

    if (!box) {
      console.log('[BPharm One]', message);
      return;
    }

    box.textContent = message;
    box.classList.add('show');

    clearTimeout(window.__bpharmToast);

    window.__bpharmToast = setTimeout(() => {
      box.classList.remove('show');
    }, 2800);
  }

  /* =====================================================
     BUTTON FEEDBACK
  ====================================================== */

  function pulse(button) {
    if (!button) return;

    button.classList.remove('pop');

    requestAnimationFrame(() => {
      button.classList.add('pop');
    });

    setTimeout(() => {
      button.classList.remove('pop');
    }, 450);
  }

  function setBusy(button, busy, text = '') {
    if (!button) return;

    if (busy) {
      button.dataset.originalText =
        button.textContent;

      button.disabled = true;

      if (text) {
        button.textContent = text;
      }
    } else {
      button.disabled = false;

      if (
        button.dataset.originalText
      ) {
        button.textContent =
          button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  /* =====================================================
     PAGE NAVIGATION
  ====================================================== */

  function go(id) {
    const target =
      document.getElementById(id);

    if (!target) {
      console.warn(
        'BPharm One: page not found:',
        id
      );
      return;
    }

    $$('.page.active').forEach(page => {
      page.classList.remove('active');
    });

    target.classList.add('active');

    try {
      history.replaceState(
        null,
        '',
        '#' + id
      );
    } catch (_) {}

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function setupNavigation() {
    $$('[data-next]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();

        const page =
          button.dataset.next;

        if (page) {
          pulse(button);
          go(page);
        }
      });
    });

    const hash =
      window.location.hash
        .replace(/^#/, '');

    if (
      hash &&
      document.getElementById(hash)
    ) {
      go(hash);
    }
  }

  /* =====================================================
     SUPABASE
  ====================================================== */

  function setupSupabase() {
    try {
      if (
        !window.supabase ||
        typeof window.supabase.createClient !==
          'function'
      ) {
        console.error(
          'Supabase library unavailable.'
        );
        return false;
      }

      sb =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

      return true;

    } catch (error) {
      console.error(
        'Supabase initialization:',
        error
      );

      return false;
    }
  }

  /* =====================================================
     GENERIC REACTION COUNT
  ====================================================== */

  async function reactionCount(
    table,
    idField,
    id,
    reaction
  ) {
    if (!sb) return 0;

    try {
      const {
        count,
        error
      } = await sb
        .from(table)
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq(idField, id)
        .eq('reaction', reaction);

      if (error) {
        console.error(
          'Reaction count:',
          error
        );
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error(
        'Reaction count:',
        error
      );

      return 0;
    }
  }

  /* =====================================================
     MEMORIES
  ====================================================== */

  async function loadMemories() {
    const gallery =
      $('#memoryGallery');

    if (!gallery || !sb) return;

    try {
      const {
        data,
        error
      } = await sb
        .from('memories')
        .select('*')
        .order('created_at', {
          ascending: false
        })
        .limit(60);

      if (error) {
        throw error;
      }

      if (!data || !data.length) {
        gallery.innerHTML = `
          <div class="empty-state">
            <span>📸</span>
            <p>
              No memories yet.<br>
              The first throwback can come from anyone.
            </p>
          </div>
        `;

        return;
      }

      const reactionTypes =
        ['❤️', '😂', '🔥', '💊'];

      const cards = [];

      for (const memory of data) {
        const counts =
          await Promise.all(
            reactionTypes.map(reaction =>
              reactionCount(
                'memory_reactions',
                'memory_id',
                memory.id,
                reaction
              )
            )
          );

        cards.push(`
          <article
            class="memory-card"
            data-memory-id="${esc(memory.id)}"
            tabindex="0"
            role="button"
            aria-label="Open memory">

            <div class="memory-image-wrap">
              <img
                src="${esc(memory.image_url)}"
                alt="${esc(
                  memory.caption ||
                  'BPharm One class memory'
                )}"
                loading="lazy">
            </div>

            <div class="memory-content">

              <h3>
                ${esc(
                  memory.caption ||
                  'A BPharm One memory'
                )}
              </h3>

              <small>
                ${
                  memory.anonymous
                    ? 'Anonymous'
                    : esc(
                        memory.name ||
                        'BPharm One'
                      )
                }
                ·
                ${timeAgo(memory.created_at)}
              </small>

              <div
                class="reactions memory-reactions">

                ${reactionTypes.map(
                  (reaction, index) => `
                    <button
                      type="button"
                      data-react-memory="${esc(memory.id)}"
                      data-reaction="${reaction}"
                      aria-label="React ${reaction}">

                      ${reaction}
                      <i>${counts[index]}</i>

                    </button>
                  `
                ).join('')}

              </div>

            </div>

          </article>
        `);
      }

      gallery.innerHTML =
        cards.join('');

    } catch (error) {
      console.error(
        'Loading memories:',
        error
      );

      gallery.innerHTML = `
        <div class="empty-state">
          <span>📸</span>
          <p>
            Memories could not be loaded right now.
          </p>
        </div>
      `;
    }
  }

  function setupMemories() {
    const add =
      $('#addMemory');

    const input =
      $('#memoryInput');

    if (add && input) {
      add.addEventListener(
        'click',
        event => {
          event.preventDefault();
          pulse(add);
          input.click();
        }
      );
    }

    if (input) {
      input.addEventListener(
        'change',
        async event => {
          const file =
            event.target.files?.[0];

          if (!file) return;

          if (!sb) {
            toast(
              'The shared memory service is unavailable.'
            );
            return;
          }

          if (
            !file.type.startsWith('image/')
          ) {
            event.target.value = '';
            toast(
              'Please choose an image.'
            );
            return;
          }

          if (
            file.size >
            5 * 1024 * 1024
          ) {
            event.target.value = '';
            toast(
              'Please choose a photo under 5 MB.'
            );
            return;
          }

          const caption =
            clean(
              prompt(
                'Write a caption for this memory:'
              ),
              300
            );

          if (!caption) {
            event.target.value = '';
            return;
          }

          const name =
            clean(
              prompt(
                'Your name (leave blank for Anonymous):'
              ),
              80
            );

          const anonymous =
            !name;

          try {
            const safe =
              file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                '_'
              );

            const randomId =
              window.crypto &&
              typeof crypto.randomUUID ===
                'function'
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

            const path =
              `${randomId}-${safe}`;

            toast(
              'Uploading your memory...'
            );

            const {
              error: uploadError
            } = await sb.storage
              .from('memories')
              .upload(
                path,
                file,
                {
                  upsert: false,
                  contentType: file.type,
                  cacheControl: '3600'
                }
              );

            if (uploadError) {
              throw uploadError;
            }

            const {
              data: urlData
            } = sb.storage
              .from('memories')
              .getPublicUrl(path);

            const {
              error
            } = await sb
              .from('memories')
              .insert({
                name:
                  name ||
                  'Anonymous',
                caption,
                image_url:
                  urlData.publicUrl,
                anonymous
              });

            if (error) {
              throw error;
            }

            event.target.value = '';

            toast(
              'Memory added for everyone.'
            );

            await loadMemories();

          } catch (error) {
            console.error(
              'Memory upload:',
              error
            );

            event.target.value = '';

            toast(
              'Upload failed: ' +
              (
                error?.message ||
                'Please try again.'
              )
            );
          }
        }
      );
    }

    const gallery =
      $('#memoryGallery');

    if (!gallery) return;

    gallery.addEventListener(
      'click',
      async event => {

        /* ---------------------------------------------
           REACTION CLICK
        --------------------------------------------- */

        const reactionButton =
          event.target.closest(
            '[data-react-memory]'
          );

        if (reactionButton) {
          event.stopPropagation();

          if (!sb) return;

          const id =
            reactionButton.dataset
              .reactMemory;

          const reaction =
            reactionButton.dataset
              .reaction;

          const key =
            `memory:${id}:${reaction}`;

          if (
            localStorage.getItem(key)
          ) {
            toast(
              'You already gave this reaction.'
            );
            return;
          }

          try {
            const {
              error
            } = await sb
              .from('memory_reactions')
              .insert({
                memory_id: id,
                reaction
              });

            if (error) {
              throw error;
            }

            localStorage.setItem(
              key,
              '1'
            );

            const counter =
              reactionButton.querySelector('i');

            if (counter) {
              counter.textContent =
                Number(
                  counter.textContent
                ) + 1;
            }

            pulse(reactionButton);

          } catch (error) {
            console.error(
              'Memory reaction:',
              error
            );

            toast(
              'Reaction could not be saved.'
            );
          }

          return;
        }

        /* ---------------------------------------------
           PHOTO CLICK
        --------------------------------------------- */

        const card =
          event.target.closest(
            '.memory-card'
          );

        if (!card) return;

        const image =
          card.querySelector('img');

        if (!image?.src) return;

        openMemoryViewer(
          image.src,
          card.querySelector('h3')
            ?.textContent || ''
        );
      }
    );

    gallery.addEventListener(
      'keydown',
      event => {
        const card =
          event.target.closest(
            '.memory-card'
          );

        if (!card) return;

        if (
          event.key !== 'Enter' &&
          event.key !== ' '
        ) {
          return;
        }

        event.preventDefault();

        const image =
          card.querySelector('img');

        if (!image?.src) return;

        openMemoryViewer(
          image.src,
          card.querySelector('h3')
            ?.textContent || ''
        );
      }
    );
  }

  /* =====================================================
     MEMORY VIEWER
  ====================================================== */

  function openMemoryViewer(
    src,
    text = ''
  ) {
    const viewer =
      $('#memoryViewer');

    const image =
      $('#memoryViewerImage');

    const caption =
      $('#memoryViewerCaption');

    if (!viewer || !image) {
      return;
    }

    image.src = src;

    if (caption) {
      caption.textContent =
        text || '';
    }

    viewer.classList.remove(
      'hidden'
    );

    viewer.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.style.overflow =
      'hidden';
  }

  function closeMemoryViewer() {
    const viewer =
      $('#memoryViewer');

    const image =
      $('#memoryViewerImage');

    const caption =
      $('#memoryViewerCaption');

    if (!viewer) return;

    viewer.classList.add(
      'hidden'
    );

    viewer.setAttribute(
      'aria-hidden',
      'true'
    );

    if (image) {
      image.src = '';
    }

    if (caption) {
      caption.textContent = '';
    }

    document.body.style.overflow =
      '';
  }

  function setupMemoryViewer() {
    const viewer =
      $('#memoryViewer');

    const close =
      $('#memoryViewerClose');

    if (!viewer) return;

    if (close) {
      close.addEventListener(
        'click',
        event => {
          event.preventDefault();
          event.stopPropagation();
          closeMemoryViewer();
        }
      );
    }

    viewer.addEventListener(
      'click',
      event => {
        if (
          event.target === viewer
        ) {
          closeMemoryViewer();
        }
      }
    );

    document.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Escape' &&
          !viewer.classList.contains(
            'hidden'
          )
        ) {
          closeMemoryViewer();
        }
      }
    );
  }

  /* =====================================================
     SHOW LOVE
  ====================================================== */

  async function loadHeartCount() {
    if (!sb) return;

    try {
      const {
        count,
        error
      } = await sb
        .from('hearts')
        .select('*', {
          count: 'exact',
          head: true
        });

      if (
        !error &&
        $('#heartCount')
      ) {
        $('#heartCount').textContent =
          `❤️ ${count || 0} hearts shared`;
      }

      await loadShowLove();

    } catch (error) {
      console.error(
        'Heart count:',
        error
      );
    }
  }

  async function loadShowLove() {
    const feed =
      $('#loveFeed');

    if (!feed || !sb) return;

    try {
      const {
        data,
        error
      } = await sb
        .from('hearts')
        .select(
          'sender_name, receiver_name, created_at'
        )
        .order('created_at', {
          ascending: false
        })
        .limit(100);

      if (error) {
        throw error;
      }

      if (!data?.length) {
        feed.innerHTML = `
          <div class="love-empty">
            No hearts shared yet.<br>
            Be the first if you want.
          </div>
        `;
        return;
      }

      feed.innerHTML =
        data.map(heart => `
          <div class="love-card">

            <div class="love-line">
              <span>❤️</span>

              <strong>
                ${esc(
                  heart.sender_name ||
                  'Anonymous'
                )}
              </strong>

              <span class="love-arrow">
                →
              </span>

              <strong>
                ${esc(
                  heart.receiver_name ||
                  'BPharm One'
                )}
              </strong>
            </div>

            <small>
              ${timeAgo(
                heart.created_at
              )}
            </small>

          </div>
        `).join('');

    } catch (error) {
      console.error(
        'Show Love:',
        error
      );

      feed.innerHTML = `
        <div class="love-empty">
          Hearts could not be loaded right now.
        </div>
      `;
    }
  }

  function setupHearts() {
    const button =
      $('#heartBtn');

    if (!button) return;

    button.addEventListener(
      'click',
      async event => {
        event.preventDefault();

        if (!sb) {
        toast(
            'The shared love service is unavailable.'
          );
          return;
        }

        const receiver =
          clean(
            $('#heartTarget')?.value,
            100
          );

        if (!receiver) {
          toast(
            "Write the person's name first."
          );
          return;
        }

        const sender =
          clean(
            $('#heartSender')?.value,
            80
          ) ||
          'Anonymous';

        try {
          setBusy(
            button,
            true,
            'SENDING...'
          );

          const {
            error
          } = await sb
            .from('hearts')
            .insert({
              sender_name: sender,
              receiver_name: receiver
            });

          if (error) {
            throw error;
          }

          if ($('#heartTarget')) {
            $('#heartTarget').value = '';
          }

          if ($('#heartSender')) {
            $('#heartSender').value = '';
          }

          pulse(button);

          await loadHeartCount();

          toast(
            `❤️ Heart sent to ${receiver}.`
          );

        } catch (error) {
          console.error(
            'Send heart:',
            error
          );

          toast(
            'Could not send the heart.'
          );

        } finally {
          setBusy(
            button,
            false
          );
        }
      }
    );
  }

  /* =====================================================
     CLASS WALL
  ====================================================== */

  const WALL_REACTIONS =
    ['❤️', '😂', '💊'];

  async function getMessageReactionCounts(
    messageId
  ) {
    return Promise.all(
      WALL_REACTIONS.map(
        reaction =>
          reactionCount(
            'message_reactions',
            'message_id',
            messageId,
            reaction
          )
      )
    );
  }

  async function messageHTML(
    message
  ) {
    const counts =
      await getMessageReactionCounts(
        message.id
      );

    return `
      <article
        class="feeditem wall-message"
        data-id="${esc(message.id)}">

        <div class="wall-message-body">

          <p class="wall-message-text">
            “${esc(message.message)}”
          </p>

          <small class="wall-message-meta">
            ${
              message.anonymous
                ? 'Anonymous'
                : esc(
                    message.name ||
                    'BPharm One'
                  )
            }
            ·
            ${timeAgo(
              message.created_at
            )}
          </small>

        </div>

        <div class="feedactions wall-actions">

          ${WALL_REACTIONS.map(
            (reaction, index) => `
              <button
                type="button"
                class="wall-reaction"
                data-react-message="${esc(message.id)}"
                data-reaction="${reaction}">

                <span>${reaction}</span>
                <i>${counts[index]}</i>

              </button>
            `
          ).join('')}

          <button
            type="button"
            class="reply-toggle"
            data-reply="${esc(message.id)}"
            aria-expanded="false">

            <span class="reply-icon">
              💬
            </span>

            <strong>
              REPLY
            </strong>

            <span
              class="reply-count"
              data-reply-count="${esc(message.id)}">
              0
            </span>

          </button>

        </div>

        <section
          class="replybox hidden"
          id="reply-${esc(message.id)}"
          aria-label="Replies">

          <div class="replybox-header">

            <div>
              <strong>
                💬 Replies
              </strong>

              <small>
                Join the conversation
              </small>
            </div>

            <button
              type="button"
              class="reply-close"
              data-close-reply="${esc(message.id)}"
              aria-label="Close replies">
              ×
            </button>

          </div>

          <div
            class="replies"
            id="replies-${esc(message.id)}">

            <div class="replies-loading">
              Loading replies...
            </div>

          </div>

          <div class="reply-composer">

            <input
              type="text"
              maxlength="80"
              placeholder="Your name (optional)"
              aria-label="Your name">

            <textarea
              maxlength="500"
              rows="3"
              placeholder="Write your reply..."
              aria-label="Write your reply"></textarea>

            <div class="reply-compose-footer">

              <small>
                Leave your name blank to reply anonymously.
              </small>

              <button
                type="button"
                class="secondary reply-send"
                data-send-reply="${esc(message.id)}">

                SEND REPLY →

              </button>

            </div>

          </div>

        </section>

      </article>
    `;
  }

  async function getReplyCount(
    messageId
  ) {
    if (!sb) return 0;

    try {
      const {
        count,
        error
      } = await sb
        .from('replies')
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq(
          'message_id',
          messageId
        );

      if (error) {
        console.error(
          'Reply count:',
          error
        );
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error(
        'Reply count:',
        error
      );

      return 0;
    }
  }

  async function updateReplyCount(
    messageId
  ) {
    const count =
      await getReplyCount(
        messageId
      );

    const countElement =
      document.querySelector(
        `[data-reply-count="${CSS.escape(
          String(messageId)
        )}"]`
      );

    if (countElement) {
      countElement.textContent =
        count;
    }

    return count;
  }

  async function loadMessages() {
    const feed =
      $('#wallFeed');

    if (!feed || !sb) return;

    try {
      const {
        data,
        error
      } = await sb
        .from('messages')
        .select('*')
        .order('created_at', {
          ascending: false
        })
        .limit(50);

      if (error) {
        throw error;
      }

      if (!data?.length) {
        feed.innerHTML = `
          <div class="empty-state">
            <span>💬</span>
            <p>
              The wall is waiting for its first message.
            </p>
          </div>
        `;
        return;
      }

      const html =
        await Promise.all(
          data.map(messageHTML)
        );

      feed.innerHTML =
        html.join('');

      /* Load reply counts after rendering. */
      await Promise.all(
        data.map(message =>
          updateReplyCount(
            message.id
          )
        )
      );

    } catch (error) {
      console.error(
        'Class Wall:',
        error
      );

      feed.innerHTML = `
        <div class="empty-state">
          <span>💬</span>
          <p>
            Class Wall could not load right now.
          </p>
        </div>
      `;
    }
        }/* =====================================================
     REPLIES
  ====================================================== */

  async function loadReplies(
    messageId
  ) {
    const box =
      document.getElementById(
        `replies-${messageId}`
      );

    if (!box || !sb) return;

    box.innerHTML = `
      <div class="replies-loading">
        Loading replies...
      </div>
    `;

    try {
      const {
        data,
        error
      } = await sb
        .from('replies')
        .select('*')
        .eq(
          'message_id',
          messageId
        )
        .order('created_at', {
          ascending: true
        })
        .limit(100);

      if (error) {
        throw error;
      }

      if (!data?.length) {
        box.innerHTML = `
          <div class="replies-empty">
            <span>💬</span>
            <strong>
              No replies yet.
            </strong>
            <small>
              Be the first person to say something.
            </small>
          </div>
        `;
      } else {
        box.innerHTML =
          data.map(reply => `
            <div
              class="reply-item"
              data-reply-id="${esc(reply.id)}">

              <div class="reply-avatar">
                ${
                  reply.anonymous
                    ? 'A'
                    : esc(
                        (
                          reply.name ||
                          'B'
                        )
                        .charAt(0)
                        .toUpperCase()
                      )
                }
              </div>

              <div class="reply-content">

                <div class="reply-top">

                  <strong>
                    ${
                      reply.anonymous
                        ? 'Anonymous'
                        : esc(
                            reply.name ||
                            'BPharm One'
                          )
                    }
                  </strong>

                  <small>
                    ${timeAgo(
                      reply.created_at
                    )}
                  </small>

                </div>

                <p>
                  ${esc(
                    reply.reply ||
                    ''
                  )}
                </p>

              </div>

            </div>
          `).join('');
      }

      await updateReplyCount(
        messageId
      );

    } catch (error) {
      console.error(
        'Loading replies:',
        error
      );

      box.innerHTML = `
        <div class="replies-error">
          Replies could not be loaded.
          Please try again.
        </div>
      `;
    }
  }

  function openReplyBox(
    messageId
  ) {
    const box =
      document.getElementById(
        `reply-${messageId}`
      );

    const toggle =
      document.querySelector(
        `[data-reply="${CSS.escape(
          String(messageId)
        )}"]`
      );

    if (!box) return;

    box.classList.remove(
      'hidden'
    );

    if (toggle) {
      toggle.setAttribute(
        'aria-expanded',
        'true'
      );

      toggle.classList.add(
        'active'
      );
    }

    loadReplies(messageId);

    const textarea =
      box.querySelector('textarea');

    if (textarea) {
      setTimeout(() => {
        textarea.focus({
          preventScroll: true
        });
      }, 100);
    }
  }

  function closeReplyBox(
    messageId
  ) {
    const box =
      document.getElementById(
        `reply-${messageId}`
      );

    const toggle =
      document.querySelector(
        `[data-reply="${CSS.escape(
          String(messageId)
        )}"]`
      );

    if (!box) return;

    box.classList.add(
      'hidden'
    );

    if (toggle) {
      toggle.setAttribute(
        'aria-expanded',
        'false'
      );

      toggle.classList.remove(
        'active'
      );
    }
  }

  function setupMessages() {
    const feed =
      $('#wallFeed');

    if (!feed) return;

    /* ---------------------------------------------
       Existing / future messages
    --------------------------------------------- */

    feed.addEventListener(
      'click',
      async event => {

        /* Reply toggle */
        const replyButton =
          event.target.closest(
            '[data-reply]'
          );

        if (replyButton) {
          event.preventDefault();

          const id =
            replyButton.dataset.reply;

          const box =
            document.getElementById(
              `reply-${id}`
            );

          if (
            box?.classList.contains(
              'hidden'
            )
          ) {
            openReplyBox(id);
          } else {
            closeReplyBox(id);
          }

          pulse(replyButton);

          return;
        }

        /* Close reply area */
        const closeButton =
          event.target.closest(
            '[data-close-reply]'
          );

        if (closeButton) {
          closeReplyBox(
            closeButton.dataset
              .closeReply
          );
          return;
        }

        /* Message reaction */
        const reactionButton =
          event.target.closest(
            '[data-react-message]'
          );

        if (reactionButton) {
          event.stopPropagation();

          if (!sb) return;

          const id =
            reactionButton.dataset
              .reactMessage;

          const reaction =
            reactionButton.dataset
              .reaction;

          const key =
            `message:${id}:${reaction}`;

          if (
            localStorage.getItem(key)
          ) {
            toast(
              'You already gave this reaction.'
            );
            return;
          }

          try {
            const {
              error
            } = await sb
              .from(
                'message_reactions'
              )
              .insert({
                message_id: id,
                reaction
              });

            if (error) {
              throw error;
            }

            localStorage.setItem(
              key,
              '1'
            );

            const counter =
              reactionButton.querySelector(
                'i'
              );

            if (counter) {
              counter.textContent =
                Number(
                  counter.textContent
                ) + 1;
            }

            pulse(
              reactionButton
            );

          } catch (error) {
            console.error(
              'Message reaction:',
              error
            );

            toast(
              'Reaction could not be saved.'
            );
          }

          return;
        }

        /* Send reply */
        const sendButton =
          event.target.closest(
            '[data-send-reply]'
          );

        if (sendButton) {
          event.preventDefault();

          const id =
            sendButton.dataset
              .sendReply;

          const box =
            document.getElementById(
              `reply-${id}`
            );

          if (!box || !sb) {
            return;
          }

          const nameInput =
            box.querySelector(
              'input'
            );

          const textInput =
            box.querySelector(
              'textarea'
            );

          const name =
            clean(
              nameInput?.value,
              80
            ) ||
            'Anonymous';

          const replyText =
            clean(
              textInput?.value,
              500
            );

          if (!replyText) {
            toast(
              'Write a reply first.'
            );

            textInput?.focus();

            return;
          }

          try {
            setBusy(
              sendButton,
              true,
              'POSTING...'
            );

            const {
              error
            } = await sb
              .from('replies')
              .insert({
                message_id: id,
                name,
                reply: replyText,
                anonymous:
                  name ===
                  'Anonymous'
              });

            if (error) {
              throw error;
            }

            if (textInput) {
              textInput.value = '';
            }

            pulse(
              sendButton
            );

            toast(
              'Reply posted.'
            );

            await loadReplies(id);/* Keep the reply section open. */
            openReplyBox(id);

          } catch (error) {
            console.error(
              'Reply:',
              error
            );

            toast(
              'Reply could not be saved.'
            );

          } finally {
            setBusy(
              sendButton,
              false
            );
          }

          return;
        }
      }
    );

    /* Enter in reply textarea:
       Ctrl/Cmd + Enter = send */
    feed.addEventListener(
      'keydown',
      event => {
        if (
          event.target.tagName !==
          'TEXTAREA'
        ) {
          return;
        }

        if (
          event.key === 'Enter' &&
          (event.ctrlKey ||
            event.metaKey)
        ) {
          event.preventDefault();

          const box =
            event.target.closest(
              '.replybox'
            );

          const button =
            box?.querySelector(
              '[data-send-reply]'
            );

          button?.click();
        }
      }
    );
  }

  /* =====================================================
     CR APPRECIATION
  ====================================================== */

  function setupCR() {
    const cards =
      $$('.cr-card');

    cards.forEach(card => {
      card.addEventListener(
        'click',
        () => {
          card.classList.toggle(
            'expanded'
          );
        }
      );
    });
  }

  /* =====================================================
     CARD STUDIO
  ====================================================== */

  function wrapText(
    context,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines = 8
  ) {
    const words =
      text.split(/\s+/);

    let line = '';
    let lines = [];

    for (const word of words) {
      const test =
        line
          ? `${line} ${word}`
          : word;

      if (
        context.measureText(
          test
        ).width > maxWidth &&
        line
      ) {
        lines.push(line);
        line = word;

        if (
          lines.length >=
          maxLines
        ) {
          break;
        }
      } else {
        line = test;
      }
    }

    if (
      line &&
      lines.length <
        maxLines
    ) {
      lines.push(line);
    }

    lines.forEach(
      (current, index) => {
        context.fillText(
          current,
          x,
          y +
            index *
              lineHeight
        );
      }
    );

    return lines.length;
  }

  function setupCards() {
    const form =
      $('#cardForm');

    const create =
      $('#createCard');

    const preview =
      $('#cardPreview');

    if (!create) return;

    create.addEventListener(
      'click',
      async event => {
        event.preventDefault();

        const name =
          clean(
            $('#cardName')?.value,
            100
          );

        const recipient =
          clean(
            $('#cardRecipient')?.value,
            100
          );

        const message =
          clean(
            $('#cardMessage')?.value,
            1200
          );

        const template =
          clean(
            $('#cardTemplate')?.value ||
            $('#cardStyle')?.value ||
            'Appreciation',
            80
          );

        if (!message) {
          toast(
            'Write your message first.'
          );
          return;
        }

        const canvas =
          document.createElement(
            'canvas'
          );

        canvas.width = 1200;
        canvas.height = 1500;

        const ctx =
          canvas.getContext(
            '2d'
          );

        if (!ctx) {
          toast(
            'Card preview is unavailable.'
          );
          return;
      }/* Elegant neutral base */
        ctx.fillStyle =
          '#160d20';

        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.fillStyle =
          'rgba(255,255,255,.08)';

        ctx.fillRect(
          55,
          55,
          1090,
          1390
        );

        ctx.textAlign =
          'center';

        ctx.fillStyle =
          '#ffffff';

        ctx.font =
          'bold 34px Arial';

        ctx.fillText(
          'BPHARM ONE',
          600,
          150
        );

        ctx.font =
          '22px Arial';

        ctx.fillText(
          'CLASS OF 2029',
          600,
          195
        );

        ctx.font =
          'bold 52px Arial';

        ctx.fillText(
          recipient
            ? `For ${recipient}`
            : 'A Little Something For You',
          600,
          340
        );

        ctx.textAlign =
          'left';

        ctx.font =
          '28px Arial';

        const startY =
          470;

        wrapText(
          ctx,
          message,
          130,
          startY,
          940,
          48,
          14
        );

        ctx.textAlign =
          'center';

        ctx.font =
          'bold 26px Arial';

        ctx.fillText(
          'YEAR ONE — COMPLETED',
          600,
          1250
        );

        ctx.font =
          '22px Arial';

        ctx.fillText(
          'May we keep growing until 2029.',
          600,
          1310
        );

        ctx.font =
          '20px Arial';

        ctx.fillText(
          name
            ? `From ${name}`
            : 'From BPharm One',
          600,
          1375
        );

        const image =
          canvas.toDataURL(
            'image/png'
          );

        if (preview) {
          preview.src =
            image;

          preview.classList.add(
            'ready'
          );
        }

        /* Automatically save locally */
        const link =
          document.createElement(
            'a'
          );

        link.href = image;

        link.download =
          `BPharm-One-${(
            recipient ||
            'Appreciation'
          )
            .replace(
              /[^a-z0-9]/gi,
              '-'
            )}.png`;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        toast(
          'Your card is ready.'
        );

        /* Optional shared card record */
        if (sb) {
          try {
            await sb
              .from('cards')
              .insert({
                name:
                  name ||
                  'Anonymous',
                recipient:
                  recipient ||
                  'BPharm One',
                message,
                template
              });
          } catch (error) {
            console.warn(
              'Card record:',
              error
            );
          }
        }
      }
    );

    if (form) {
      form.addEventListener(
        'submit',
        event => {
          event.preventDefault();
          create?.click();
        }
      );
    }
      }
  /* =====================================================
     FAITH
  ====================================================== */

  function setupFaith() {
    const button =
      $('#amenBtn');

    if (!button) return;

    button.addEventListener(
      'click',
      event => {
        event.preventDefault();

        pulse(button);

        toast(
          'Amen. May God guide every step.'
        );
      }
    );
  }

  /* =====================================================
     TIME CAPSULE
  ====================================================== */

  function setupCapsule() {
    const button =
      $('#sealCapsule');

    if (!button) return;

    button.addEventListener(
      'click',
      async event => {
        event.preventDefault();

        const message =
          clean(
            $('#capsuleMessage')?.value,
            1500
          );

        const name =
          clean(
            $('#capsuleName')?.value,
            100
          ) ||
          'Anonymous';

        if (!message) {
          toast(
            'Write your message first.'
          );
          return;
        }

        if (!sb) {
          toast(
            'The time capsule service is unavailable.'
          );
          return;
        }

        try {
          setBusy(
            button,
            true,
            'SEALING...'
          );

          const {
            error
          } = await sb
            .from('capsules')
            .insert({
              name,
              message
            });

          if (error) {
            throw error;
          }

          if ($('#capsuleMessage')) {
            $('#capsuleMessage').value =
              '';
          }

          if ($('#capsuleName')) {
            $('#capsuleName').value =
              '';
          }

          toast(
            'Message sealed for 2029.'
          );

          pulse(button);

        } catch (error) {
          console.error(
            'Time capsule:',
            error
          );

          toast(
            'Could not seal the message.'
          );

        } finally {
          setBusy(
            button,
            false
          );
        }
      }
    );
          }/* =====================================================
     REALTIME
  ====================================================== */

  function live(
    table,
    callback
  ) {
    if (!sb) return;

    if (
      realtimeChannels.has(table)
    ) {
      return;
    }

    try {
      const channel =
        sb
          .channel(
            `bpharm-${table}`
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table
            },
            async payload => {
              console.log(
                `Realtime ${table}:`,
                payload.eventType
              );

              try {
                await callback(
                  payload
                );
              } catch (error) {
                console.error(
                  `Realtime callback ${table}:`,
                  error
                );
              }
            }
          )
          .subscribe(
            status => {
              console.log(
                `Realtime ${table}:`,
                status
              );
            }
          );

      realtimeChannels.set(
        table,
        channel
      );

    } catch (error) {
      console.error(
        `Realtime ${table}:`,
        error
      );
    }
  }

  function setupRealtime() {

    live(
      'messages',
      loadMessages
    );

    /* A reply should refresh the wall
       so counts update too. */
    live(
      'replies',
      async payload => {

        const messageId =
          payload?.new?.message_id ||
          payload?.old?.message_id;

        if (
          messageId
        ) {
          const openBox =
            document.getElementById(
              `reply-${messageId}`
            );

          if (
            openBox &&
            !openBox.classList.contains(
              'hidden'
            )
          ) {
            await loadReplies(
              messageId
            );
          } else {
            await updateReplyCount(
              messageId
            );
          }
        } else {
          await loadMessages();
        }
      }
    );

    live(
      'message_reactions',
      loadMessages
    );

    live(
      'memories',
      loadMemories
    );

    live(
      'memory_reactions',
      loadMemories
    );

    live(
      'hearts',
      loadHeartCount
    );
  }/* =====================================================
     INITIAL DATA
  ====================================================== */

  async function loadInitialData() {
    if (!sb) return;

    await Promise.allSettled([
      loadMessages(),
      loadMemories(),
      loadHeartCount()
    ]);
  }

  /* =====================================================
     START
  ====================================================== */

  async function init() {

    /*
      Navigation and local interactions are
      initialized before Supabase so the site
      remains usable even if the backend is
      temporarily unavailable.
    */

    setupNavigation();
    setupMessages();
    setupMemories();
    setupMemoryViewer();
    setupHearts();
    setupCR();
    setupCards();
    setupFaith();
    setupCapsule();

    const connected =
      setupSupabase();

    if (!connected) {
      console.error(
        'BPharm One: Supabase unavailable.'
      );

      toast(
        'Some shared features are temporarily unavailable.'
      );

      return;
    }

    await loadInitialData();

    setupRealtime();

    console.log(
      'BPharm One — Class of 2029 loaded.'
    );
  }

  /* =====================================================
     START SAFELY
  ====================================================== */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})();
