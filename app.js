(() => {
  'use strict';

  /* =====================================================
     BPHARM ONE — CLASS OF 2029
     Supabase-powered interactive memory website
  ====================================================== */

  const SUPABASE_URL =
    'https://hketlksydaqmuiysozdh.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5';

  let sb = null;

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
    String(value || '').trim().slice(0, max);

  function timeAgo(iso) {

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

    const minutes =
      Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours =
      Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
  }

  /* =====================================================
     TOAST
  ====================================================== */

  function toast(message) {

    const box = $('#toast');

    if (!box) return;

    box.textContent = message;

    box.classList.add('show');

    clearTimeout(window.__bpharmToast);

    window.__bpharmToast =
      setTimeout(() => {
        box.classList.remove('show');
      }, 2800);
  }

  /* =====================================================
     PAGE NAVIGATION
  ====================================================== */

  function go(id) {

    const target =
      document.getElementById(id);

    if (!target) {
      console.warn(
        'Page not found:',
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

    window.scrollTo(0, 0);
  }

  function setupNavigation() {

    $$('[data-next]')
      .forEach(button => {

        button.addEventListener(
          'click',
          event => {

            event.preventDefault();

            const page =
              button.dataset.next;

            if (page) {
              go(page);
            }
          }
        );
      });

    /* Open page from URL hash */
    const hash =
      window.location.hash
        .replace('#', '');

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
     MEMORIES
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

  async function loadMemories() {

    const gallery =
      $('#memoryGallery');

    if (!gallery || !sb) {
      return;
    }

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

      if (
        !data ||
        !data.length
      ) {

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

      const cards = [];

      for (const memory of data) {

        const reactions =
          ['❤️', '😂', '🔥', '💊'];

        const counts =
          await Promise.all(
            reactions.map(reaction =>
              reactionCount(
                'memory_reactions',
                'memory_id',
                memory.id,
                reaction
              )
            )
          );

        cards.push(`
          <article class="memory-card">

            <img
              src="${esc(memory.image_url)}"
              alt="BPharm One class memory"
              loading="lazy">

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
              · ${timeAgo(memory.created_at)}
            </small>

            <div class="reactions">

              ${reactions.map(
                (reaction, index) => `
                  <button
                    type="button"
                    data-react-memory="${esc(memory.id)}"
                    data-reaction="${reaction}">
                    ${reaction}
                    <i>${counts[index]}</i>
                  </button>
                `
              ).join('')}

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
    'UPLOAD ERROR: ' +
    (
      error?.message ||
      error?.error_description ||
      JSON.stringify(error)
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

        const button =
          event.target.closest(
            '[data-react-memory]'
          );

        if (!button || !sb) {
          return;
        }

        const id =
          button.dataset.reactMemory;

        const reaction =
          button.dataset.reaction;

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
            button.querySelector('i');

          if (counter) {

            counter.textContent =
              Number(
                counter.textContent
              ) + 1;
          }

          button.classList.add('pop');

        } catch (error) {

          console.error(
            'Memory reaction:',
            error
          );

          toast(
            'Reaction could not be saved.'
          );
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

    if (!feed || !sb) {
      return;
    }

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

      if (
        !data ||
        !data.length
      ) {

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

          button.classList.add('pop');

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
        }
      }
    );
  }

  /* =====================================================
     CLASS WALL
  ====================================================== */

  async function messageHTML(message) {

    const reactions =
      ['❤️', '😂', '💊'];

    const counts =
      await Promise.all(
        reactions.map(reaction =>
          reactionCount(
            'message_reactions',
            'message_id',
            message.id,
            reaction
          )
        )
      );

    return `

      <div
        class="feeditem"
        data-id="${esc(message.id)}">

        <p>
          “${esc(message.message)}”
        </p>

        <small>
          ${
            message.anonymous
              ? 'Anonymous'
              : esc(
                  message.name ||
                  'BPharm One'
                )
          }
          · ${timeAgo(
            message.created_at
          )}
        </small>

        <div class="feedactions">

          ${reactions.map(
            (reaction, index) => `

              <button
                type="button"
                data-react-message="${esc(message.id)}"
                data-reaction="${reaction}">

                ${reaction}
                <i>${counts[index]}</i>

              </button>

            `
          ).join('')}

          <button
            type="button"
            data-reply="${esc(message.id)}">

            💬 Reply

          </button>

        </div>

        <div
          class="replybox hidden"
          id="reply-${esc(message.id)}">

          <input
            type="text"
            placeholder="Your name">

          <textarea
            placeholder="Write a reply..."></textarea>

          <button
            type="button"
            class="secondary"
            data-send-reply="${esc(message.id)}">

            SEND REPLY

          </button>

          <div
            class="replies"
            id="replies-${esc(message.id)}">
          </div>

        </div>

      </div>
    `;
  }

  async function loadMessages() {

    const feed =
      $('#wallFeed');

    if (!feed || !sb) {
      return;
    }

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

      if (
        !data ||
        !data.length
      ) {

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
  }

  async function loadReplies(messageId) {

    const box =
      $(`#replies-${messageId}`);

    if (!box || !sb) {
      return;
    }

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
        });

      if (error) {
        throw error;
      }

      box.innerHTML =
        (data || [])
          .map(reply => `

            <div class="replyitem">

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

              <p>
                ${esc(reply.reply)}
              </p>

            </div>

          `)
          .join('');

    } catch (error) {

      console.error(
        'Replies:',
        error
      );
    }
  }

  function setupMessages() {

    const post =
      $('#postMessage');

    if (post) {

      post.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          if (!sb) {

            toast(
              'The Class Wall is unavailable.'
            );

            return;
      }
  const message =
            clean(
              $('#message')?.value,
              800
            );

          if (!message) {

            toast(
              'Write something first.'
            );

            return;
          }

          const name =
            clean(
              $('#name')?.value,
              80
            ) ||
            'Anonymous';

          const anonymous =
            $('#anonymousMessage')
              ?.checked ??
            false;

          try {

            const {
              error
            } = await sb
              .from('messages')
              .insert({
                message,
                name,
                anonymous
              });

            if (error) {
              throw error;
            }

            if ($('#message')) {
              $('#message').value = '';
            }

            if ($('#name')) {
              $('#name').value = '';
            }

            if ($('#anonymousMessage')) {
              $('#anonymousMessage').checked =
                false;
            }

            toast(
              'Posted to the class wall.'
            );

            await loadMessages();

          } catch (error) {

            console.error(
              'Post message:',
              error
            );

            toast(
              'Could not post the message.'
            );
          }
        }
      );
    }

    const feed =
      $('#wallFeed');

    if (!feed) return;

    feed.addEventListener(
      'click',
      async event => {

        const reaction =
          event.target.closest(
            '[data-react-message]'
          );

        if (reaction) {

          const id =
            reaction.dataset.reactMessage;

          const emoji =
            reaction.dataset.reaction;

          const key =
            `message:${id}:${emoji}`;

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
              .from('message_reactions')
              .insert({
                message_id: id,
                reaction: emoji
              });

            if (error) {
              throw error;
            }

            localStorage.setItem(
              key,
              '1'
            );

            const counter =
              reaction.querySelector('i');

            if (counter) {

              counter.textContent =
                Number(
                  counter.textContent
                ) + 1;
            }

            reaction.classList.add('pop');

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

        const replyButton =
          event.target.closest(
            '[data-reply]'
          );

        if (replyButton) {

          const id =
            replyButton.dataset.reply;

          const box =
            $(`#reply-${id}`);

          if (box) {

            box.classList.toggle(
              'hidden'
            );

            if (
              !box.classList.contains(
                'hidden'
              )
            ) {

              loadReplies(id);
            }
          }

          return;
        }

        const sendButton =
          event.target.closest(
            '[data-send-reply]'
          );

        if (sendButton) {

          const id =
            sendButton.dataset.sendReply;

          const box =
            $(`#reply-${id}`);

          if (!box || !sb) {
            return;
          }

          const inputs =
            box.querySelectorAll(
              'input, textarea'
            );

          const name =
            clean(
              inputs[0]?.value,
              80
            ) ||
            'Anonymous';

          const replyText =
            clean(
              inputs[1]?.value,
              500
            );

          if (!replyText) {

            toast(
              'Write a reply first.'
            );return;
          }

          try {

            const {
              error
            } = await sb
              .from('replies')
              .insert({
                message_id: id,
                name,
                reply: replyText,
                anonymous:
                  name === 'Anonymous'
              });

            if (error) {
              throw error;
            }

            if (inputs[1]) {
              inputs[1].value = '';
            }

            toast(
              'Reply posted.'
            );

            await loadReplies(id);

          } catch (error) {

            console.error(
              'Reply:',
              error
            );

            toast(
              'Reply could not be saved.'
            );
          }
        }
      }
    );
  }

  /* =====================================================
     CR APPRECIATION
  ====================================================== */

  const crContent = {

    adina: {
      title: '🥰❤️ Madam Adina',
      text: `
        Madam Adina, thank you for stepping forward
        to represent our class.

        Your role was not simply about carrying a title.
        You helped communicate our concerns, represent
        our ideas and stand with the class when decisions
        had to be made.

        Thank you for listening, for representing us,
        and for being part of the effort that kept
        BPharm One moving together.

        We appreciate you.
      `
    },

    julius: {
      title: '(pharma tips💊) Julius',
      text: `
        Julius, thank you for taking the responsibility
        of representing BPharm One.

        You stepped into the position and helped give
        the class a voice. You represented our interests,
        helped communicate important matters and worked
        toward choices that could benefit the class.

        The role required patience, communication and
        responsibility, and we appreciate the effort
        you put into it.

        Thank you for representing us.
      `
    },

    paschal: {
      title: '✨ Paschal',
      text: `
        Paschal, we also want to recognize the work you
        did while representing BPharm One.

        You did a great job carrying the responsibility,
        standing for the class and helping bring people
        together.

        Although your time in the position came to an end
        because of circumstances outside your ability to
        control, the contribution you made remains part
        of our first-year story.

        Thank you for serving, representing us and helping
        build the class we became.
      `
    }

  };

  function setupCR() {

    const modal =
      $('#crModal');

    const content =
      $('#crModalContent');

    const close =
      $('#closeCr');

    if (!modal || !content) {
      return;
    }

    $$('.cr-card')
      .forEach(card => {

        card.addEventListener(
          'click',
          () => {

            const person =
              card.dataset.cr;

            const data =
              crContent[person];

            if (!data) return;

            content.innerHTML = `
              <h3>
                ${esc(data.title)}
              </h3>

              ${data.text
                .trim()
                .split(/\n\s*\n/)
                .map(paragraph =>
                  `<p>${esc(
                    paragraph.trim()
                  )}</p>`
                )
                .join('')}
            `;

            modal.classList.remove(
              'hidden'
            );
          }
        );
      });

    close?.addEventListener(
      'click',
      () => {
        modal.classList.add(
          'hidden'
        );
      }
    );

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {

          modal.classList.add(
            'hidden'
          );
        }
      }
    );
  }

  /* =====================================================
     CARD STUDIO
  ====================================================== */let selectedTemplate =
    'APPRECIATION';

  function setupCards() {

    $$('.templates button')
      .forEach(button => {

        button.addEventListener(
          'click',
          event => {

            event.preventDefault();

            selectedTemplate =
              button
                .querySelector('small')
                ?.textContent
                ?.trim() ||
              'APPRECIATION';

            $$('.templates button')
              .forEach(other =>
                other.classList.remove(
                  'selected'
                )
              );

            button.classList.add(
              'selected'
            );

            if ($('#previewTemplate')) {

              $('#previewTemplate')
                .textContent =
                selectedTemplate;
            }
          }
        );
      });

    $('#cardText')
      ?.addEventListener(
        'input',
        event => {

          if ($('#previewText')) {

            $('#previewText')
              .textContent =
              event.target.value ||
              'Your message will appear here.';
          }
        }
      );

    $('#cardFrom')
      ?.addEventListener(
        'input',
        event => {

          if ($('#previewFrom')) {

            $('#previewFrom')
              .textContent =
              event.target.value
                ? `— ${event.target.value}`
                : '';
          }
        }
      );

    $('#downloadCard')
      ?.addEventListener(
        'click',
        event => {

          event.preventDefault();

          const canvas =
            document.createElement(
              'canvas'
            );

          canvas.width = 1080;
          canvas.height = 1350;

          const ctx =
            canvas.getContext('2d');

          if (!ctx) {
            toast(
              'Card creation failed.'
            );
            return;
          }

          const gradient =
            ctx.createLinearGradient(
              0,
              0,
              1080,
              1350
            );

          gradient.addColorStop(
            0,
            '#120b20'
          );

          gradient.addColorStop(
            1,
            '#35134b'
          );

          ctx.fillStyle =
            gradient;

          ctx.fillRect(
            0,
            0,
            1080,
            1350
          );

          ctx.fillStyle =
            '#ffffff';

          ctx.textAlign =
            'center';

          ctx.font =
            'bold 42px Arial';

          ctx.fillText(
            'BPHARM ONE · CLASS OF 2029',
            540,
            170
          );

          ctx.font =
            'bold 68px Arial';

          ctx.fillText(
            selectedTemplate,
            540,
            300
          );

          const message =
            (
              $('#cardText')?.value ||
              'Your message will appear here.'
            ).slice(0, 240);

          wrapText(
            ctx,
            message,
            540,
            520,
            820,
            58
          );

          ctx.font =
            '38px Arial';

          ctx.fillText(
            $('#cardFrom')?.value
              ? `— ${$('#cardFrom').value}`
              : '',
            540,
            1050
          );

          ctx.font =
            '30px Arial';

          ctx.fillText(
            'OUR FIRST CHAPTER',
            540,
            1210
          );

          const link =
            document.createElement(
              'a'
            );

          link.download =
            'bpharm-one-card.png';

          link.href =
            canvas.toDataURL(
              'image/png'
            );

          link.click();

          toast(
            'Card downloaded.'
          );
        }
      );

    $('#postCard')
      ?.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          if (!sb) {

            toast(
              'Card sharing is unavailable.'
            );

            return;
          }

          const message =
            clean(
              $('#cardText')?.value,
              800
            );

          if (!message) {

            toast(
              'Write your card message first.'
            );

            return;
          }

          const name =
            clean(
              $('#cardFrom')?.value,
              80
            ) ||
            'BPharm One';

          try {

            const {
              error
            } = await sb
              .from('cards')
              .insert({
                name,
                recipient:
                  'BPharm One',
                message,
                template:
                  selectedTemplate
              });

            if (error) {
              throw error;
            }

            toast(
              'Card posted.'
            );

            go('wall');

          } catch (error) {

            console.error(
              'Post card:',
              error
            );

            toast(
              'Could not post the card.'
            );
          }
        }
      );
  }

  function wrapText(
    ctx,
    text,
    x,
    y,
    maxWidth,
    lineHeight
  ) {

    const words =
      text.split(/\s+/);

    let line = '';

    for (const word of words) {

      const test =
        line
          ? `${line} ${word}`
          : word;

      if (
        ctx.measureText(test)
          .width > maxWidth &&
        line
      ) {

        ctx.fillText(
          line,
          x,
          y
        );

        line = word;
        y += lineHeight;

      } else {

        line = test;
      }
    }

    if (line) {

      ctx.fillText(
        line,
        x,
        y
      );
    }
  }

  /* =====================================================
     FAITH
  ====================================================== */function setupFaith() {

    const amen =
      $('#amen');

    if (!amen) return;

    amen.addEventListener(
      'click',
      event => {

        event.preventDefault();

        amen.textContent =
          'AMEN ✓';

        amen.disabled =
          true;

        toast(
          'Amen.'
        );
      }
    );
  }

  /* =====================================================
     TIME CAPSULE
  ====================================================== */

  function setupCapsule() {

    const seal =
      $('#seal');

    if (!seal) return;

    seal.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        if (!sb) {

          toast(
            'Time capsule is unavailable.'
          );

          return;
        }

        const message =
          clean(
            $('#capsuleText')?.value,
            800
          );

        if (!message) {

          toast(
            'Write your message first.'
          );

          return;
        }

        const name =
          clean(
            prompt(
              'Your name (optional):'
            ),
            80
          ) ||
          'Anonymous';

        try {

          const {
            error
          } = await sb
            .from('time_capsule')
            .insert({
              name,
              message,
              unlock_year: 2029
            });

          if (error) {
            throw error;
          }

          $('#sealed')
            ?.classList
            .remove('hidden');

          if ($('#capsuleText')) {
            $('#capsuleText').value =
              '';
          }

          toast(
            '🔒 Sealed for 2029.'
          );

        } catch (error) {

          console.error(
            'Time capsule:',
            error
          );

          toast(
            'Could not seal the message.'
          );
        }
      }
    );
  }

  /* =====================================================
     REALTIME
  ====================================================== */

  function live(
    table,
    callback
  ) {

    if (!sb) return;

    try {

      sb.channel(
        `bpharm-live-${table}`
      )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table
          },
          () => {

            try {
              callback();
            } catch (error) {

              console.error(
                `Realtime ${table}:`,
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

    live(
      'replies',
      loadMessages
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
  }

  /* =====================================================
     START
  ====================================================== */

  function init() {

    /*
      IMPORTANT:
      Navigation starts BEFORE Supabase.
      Therefore a Supabase problem can never
      make the entire website's buttons stop working.
    */

    setupNavigation();

    setupMessages();
    setupMemories();
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
        'Site loaded. Shared features are temporarily unavailable.'
      );

      return;
    }

    loadMessages();
    loadMemories();
    loadHeartCount();

    setupRealtime();

    console.log(
      'BPharm One — Class of 2029 loaded.'
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();
  }

})();
