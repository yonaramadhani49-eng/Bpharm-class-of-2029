(() => {
  'use strict';

  const SUPABASE_URL = 'https://hketlksydaqmuiysozdh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5';

  let sb = null;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const esc = (v = '') =>
    String(v).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const clean = (v, max = 1000) =>
    String(v || '').trim().slice(0, max);

  const timeAgo = iso => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';

    const sec = Math.max(
      1,
      Math.floor((Date.now() - d.getTime()) / 1000)
    );

    if (sec < 60) return `${sec}s ago`;

    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;

    return `${Math.floor(hr / 24)}d ago`;
  };

  function toast(text) {
    let t = $('#toast');

    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }

    t.textContent = text;
    t.classList.add('show');

    clearTimeout(window.__bpharmToast);

    window.__bpharmToast = setTimeout(() => {
      t.classList.remove('show');
    }, 2800);
  }

  // =========================
  // NAVIGATION
  // =========================

  function go(id) {
    const target = document.getElementById(id);

    if (!target) {
      console.warn('Section not found:', id);
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    try {
      history.replaceState(null, '', '#' + id);
    } catch (_) {}
  }

  function setupNavigation() {
    $$('[data-next]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        go(button.dataset.next);
      });
    });
  }

  // =========================
  // SUPABASE
  // =========================

  function setupSupabase() {
    try {
      if (
        !window.supabase ||
        typeof window.supabase.createClient !== 'function'
      ) {
        console.error('Supabase library was not loaded.');
        return false;
      }

      sb = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      return true;

    } catch (error) {
      console.error('Supabase initialization error:', error);
      return false;
    }
  }

  // =========================
  // MESSAGE REACTIONS
  // =========================

  async function reactionCount(
    table,
    idField,
    id,
    reaction
  ) {
    if (!sb) return 0;

    try {
      const { count, error } = await sb
        .from(table)
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq(idField, id)
        .eq('reaction', reaction);

      if (error) return 0;

      return count || 0;

    } catch (error) {
      console.error('Reaction count:', error);
      return 0;
    }
  }

  // =========================
  // CLASS WALL
  // =========================

  async function messageHTML(m) {

    const reactions = ['❤️', '😂', '💊'];

    const counts = await Promise.all(
      reactions.map(r =>
        reactionCount(
          'message_reactions',
          'message_id',
          m.id,
          r
        )
      )
    );

    return `
      <div class="feeditem" data-id="${esc(m.id)}">

        <p>“${esc(m.message)}”</p>

        <small>
          ${
            m.anonymous
              ? 'Anonymous'
              : esc(m.name || 'BPharm One')
          }
          · ${timeAgo(m.created_at)}
        </small>

        <div class="feedactions">

          ${reactions.map((r, i) => `
            <button
              type="button"
              data-react-message="${esc(m.id)}"
              data-reaction="${r}">
              ${r} <i>${counts[i]}</i>
            </button>
          `).join('')}

          <button
            type="button"
            class="replybtn"
            data-reply="${esc(m.id)}">
            💬 Reply
          </button>

        </div>

        <div
          class="replybox hidden"
          id="reply-${esc(m.id)}">

          <input
            type="text"
            placeholder="Your name">

          <textarea
            placeholder="Write a reply..."></textarea>

          <button
            type="button"
            class="secondary"
            data-send-reply="${esc(m.id)}">
            SEND REPLY
          </button>

          <div
            class="replies"
            id="replies-${esc(m.id)}">
          </div>

        </div>

      </div>
    `;
  }

  async function loadMessages() {

    const feed = $('#wallFeed');

    if (!feed || !sb) return;

    try {

      const { data, error } = await sb
        .from('messages')
        .select('*')
        .order('created_at', {
          ascending: false
        })
        .limit(50);

      if (error) throw error;

      if (!data || !data.length) {

        feed.innerHTML = `
          <div class="feeditem">
            <p>
              No messages yet.
              Be the first to leave one.
            </p>
          </div>
        `;

        return;
      }

      const html = await Promise.all(
        data.map(messageHTML)
      );

      feed.innerHTML = html.join('');

    } catch (error) {

      console.error('Class Wall:', error);

      feed.innerHTML = `
        <div class="feeditem">
          <p>
            Class Wall is temporarily unavailable.
          </p>
        </div>
      `;
    }
  }

  async function loadReplies(messageId) {

    const box = $(`#replies-${messageId}`);

    if (!box || !sb) return;

    try {

      const { data, error } = await sb
        .from('replies')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', {
          ascending: true
        });

      if (error) throw error;

      box.innerHTML = (data || [])
        .map(r => `
          <div class="replyitem">

            <strong>
              ${
                r.anonymous
                  ? 'Anonymous'
                  : esc(r.name || 'BPharm One')
              }
            </strong>

            <p>${esc(r.reply)}</p>

          </div>
        `)
        .join('');

    } catch (error) {

      console.error('Replies:', error);
    }
  }

  function setupMessages() {

    const post = $('#postMessage');

    if (post) {

      post.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          if (!sb) {
            toast('Supabase is not connected.');
            return;
          }

          const message =
            clean($('#message')?.value, 800);

          if (!message) {
            toast('Write something first.');
            return;
          }

          const name =
            clean($('#name')?.value, 80) ||
            'Anonymous';

          const anonymous =
            $('#anonymousMessage')?.checked ?? false;

          try {

            const { error } =
              await sb
                .from('messages')
                .insert({
                  message,
                  name,
                  anonymous
                });

            if (error) throw error;

            if ($('#message'))
              $('#message').value = '';

            if ($('#name'))
              $('#name').value = '';

            if ($('#anonymousMessage'))
              $('#anonymousMessage').checked = false;

            toast('Posted to the class wall.');

            await loadMessages();

          } catch (error) {

            console.error('Post message:', error);

            toast(
              'Could not post. Check your Supabase policies.'
            );
          }
        }
      );
    }

    const feed = $('#wallFeed');

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
            `msgreact:${id}:${emoji}`;

          if (localStorage.getItem(key)) {

            toast(
              'You already gave this reaction.'
            );

            return;
          }

          try {

            const { error } =
              await sb
                .from('message_reactions')
                .insert({
                  message_id: id,
                  reaction: emoji
                });

            if (error) throw error;

            localStorage.setItem(key, '1');

            const counter =
              reaction.querySelector('i');

            if (counter) {

              counter.textContent =
                Number(counter.textContent) + 1;
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

        const reply =
          event.target.closest(
            '[data-reply]'
          );

        if (reply) {

          const id = reply.dataset.reply;

          const box = $(`#reply-${id}`);

          if (box) {

            box.classList.toggle('hidden');

            if (
              !box.classList.contains('hidden')
            ) {
              loadReplies(id);
            }
          }

          return;
        }

        const send =
          event.target.closest(
            '[data-send-reply]'
          );

        if (send) {

          const id =
            send.dataset.sendReply;

          const box =
            $(`#reply-${id}`);

          if (!box || !sb) return;

          const inputs =
            box.querySelectorAll(
              'input, textarea'
            );

          const name =
            clean(inputs[0]?.value, 80) ||
            'Anonymous';

          const replyText =
            clean(inputs[1]?.value, 500);

          if (!replyText) {

            toast(
              'Write a reply first.'
            );

            return;
          }

          try {

            const { error } =
              await sb
                .from('replies')
                .insert({
                  message_id: id,
                  name,
                  reply: replyText,
                  anonymous:
                    name === 'Anonymous'
                });

            if (error) throw error;

            if (inputs[1])
              inputs[1].value = '';

            toast('Reply posted.');

            loadReplies(id);

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

  // =========================
  // MEMORIES
  // =========================

  async function loadMemories() {

    const gallery =
      $('#memoryGallery');

    if (!gallery || !sb) return;

    try {

      const { data, error } =
        await sb
          .from('memories')
          .select('*')
          .order('created_at', {
            ascending: false
          })
          .limit(60);

      if (error) throw error;

      if (!data || !data.length) {

        gallery.innerHTML = `
          <div class="memory-card">

            <div class="photo-placeholder">

              📸

              <span>
                The class memory wall is waiting
                for its first throwback.
              </span>

            </div>

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
            reactions.map(r =>
              reactionCount(
                'memory_reactions',
                'memory_id',
                memory.id,
                r
              )
            )
          );

        cards.push(`
          <article class="memory-card shared-memory">

            <img
              src="${esc(memory.image_url)}"
              alt="Class memory"
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

              ${reactions.map((r, i) => `
                <button
                  type="button"
                  data-react-memory="${esc(memory.id)}"
                  data-reaction="${r}">
                  ${r} <i>${counts[i]}</i>
                </button>
              `).join('')}

            </div>

          </article>
        `);
      }

      gallery.innerHTML =
        cards.join('');

    } catch (error) {

      console.error(
        'Memories:',
        error
      );

      gallery.innerHTML = `
        <div class="memory-card">
          <p>
            Memories are temporarily unavailable.
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

          if (!file || !sb) return;

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
                'Your name (or leave blank for Anonymous):'
              ),
              80
            );

          const anonymous = !name;

          try {

            const safe =
              file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                '_'
              );

            const uuid =
              window.crypto &&
              typeof crypto.randomUUID ===
                'function'
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

            const path =
              `${uuid}-${safe}`;

            const { error: uploadError } =
              await sb.storage
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

            if (uploadError)
              throw uploadError;

            const { data: urlData } =
              sb.storage
                .from('memories')
                .getPublicUrl(path);

            const { error } =
              await sb
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

            if (error) throw error;

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
              'Photo upload failed. Check Storage policies.'
            );
          }
        }
      );
    }

    const gallery =
      $('#memoryGallery');

    if (gallery) {

      gallery.addEventListener(
        'click',
        async event => {

          const button =
            event.target.closest(
              '[data-react-memory]'
            );

          if (!button || !sb) return;

          const id =
            button.dataset.reactMemory;

          const reaction =
            button.dataset.reaction;

          const key =
            `memreact:${id}:${reaction}`;

          if (localStorage.getItem(key)) {

            toast(
              'You already gave this reaction.'
            );

            return;
          }

          try {

            const { error } =
              await sb
                .from('memory_reactions')
                .insert({
                  memory_id: id,
                  reaction
                });

            if (error) throw error;

            localStorage.setItem(
              key,
              '1'
            );

            const counter =
              button.querySelector('i');

            if (counter) {

              counter.textContent =
                Number(counter.textContent) + 1;
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
  }

  // =========================
  // HEART WALL
  // =========================

  async function loadHeartCount() {

    if (!sb) return;

    try {

      const { count, error } =
        await sb
          .from('hearts')
          .select('*', {
            count: 'exact',
            head: true
          });

      if (!error && $('#heartCount')) {

        $('#heartCount').textContent =
          `❤️ ${count || 0} hearts shared`;
      }

    } catch (error) {

      console.error(
        'Heart count:',
        error
      );
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
            'Supabase is not connected.'
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
          'A BPharm One classmate';

        try {

          const { error } =
            await sb
              .from('hearts')
              .insert({
                sender_name: sender,
                receiver_name: receiver
              });

          if (error) throw error;

          if ($('#heartTarget'))
            $('#heartTarget').value = '';

          if ($('#heartSender'))
            $('#heartSender').value = '';

          button.classList.add('pop');

          await loadHeartCount();

          toast(
            `❤️ Heartsent to ${receiver}.`
          );

        } catch (error) {

          console.error(
            'Heart:',
            error
          );

          toast(
            'Could not send the heart.'
          );
        }
      }
    );
  }

  // =========================
  // CARD STUDIO
  // =========================

  let selectedTemplate =
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
              .forEach(x =>
                x.classList.remove(
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

    $('#cardText')?.addEventListener(
      'input',
      event => {

        if ($('#previewText')) {

          $('#previewText').textContent =
            event.target.value ||
            'Your message will appear here.';
        }
      }
    );

    $('#cardFrom')?.addEventListener(
      'input',
      event => {

        if ($('#previewFrom')) {

          $('#previewFrom').textContent =
            event.target.value
              ? `— ${event.target.value}`
              : '';
        }
      }
    );

    $('#downloadCard')?.addEventListener(
      'click',
      event => {

        event.preventDefault();

        const canvas =
          document.createElement('canvas');

        canvas.width = 1080;
        canvas.height = 1350;

        const c =
          canvas.getContext('2d');

        if (!c) {

          toast(
            'Card preview is unavailable.'
          );

          return;
        }

        const g =
          c.createLinearGradient(
            0,
            0,
            1080,
            1350
          );

        g.addColorStop(
          0,
          '#120b20'
        );

        g.addColorStop(
          1,
          '#35134b'
        );

        c.fillStyle = g;

        c.fillRect(
          0,
          0,
          1080,
          1350
        );

        c.fillStyle = '#fff';

        c.textAlign = 'center';

        c.font =
          'bold 42px Arial';

        c.fillText(
          'BPHARM ONE · CLASS OF 2029',
          540,
          170
        );

        c.font =
          'bold 68px Arial';

        c.fillText(
          selectedTemplate,
          540,
          300
        );

        const msg =
          (
            $('#cardText')?.value ||
            'Your message will appear here.'
          ).slice(0, 240);

        wrapText(
          c,
          msg,
          540,
          520,
          820,
          58
        );

        c.font =
          '38px Arial';

        c.fillText(
          $('#cardFrom')?.value
            ? `— ${$('#cardFrom').value}`
            : '',
          540,
          1050
        );

        c.font =
          '30px Arial';

        c.fillText(
          'OUR FIRST CHAPTER',
          540,
          1210
        );

        const a =
          document.createElement('a');

        a.download =
          'bpharm-one-card.png';

        a.href =
          canvas.toDataURL(
            'image/png'
          );

        a.click();

        toast(
          'Card downloaded.'
        );
      }
    );

    $('#postCard')?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        if (!sb) {

          toast(
            'Supabase is not connected.'
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

          const { error } =
            await sb
              .from('cards')
              .insert({
                name,
                recipient:
                  'BPharm One',
                message,
                template:
                  selectedTemplate
              });

          if (error) throw error;

          toast(
            'Card posted.'
          );

          go('wall');

        } catch (error) {

          console.error(
            'Card:',
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

  // =========================
  // TIME CAPSULE
  // =========================

  function setupCapsule() {

    $('#seal')?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        if (!sb) {

          toast(
            'Supabase is not connected.'
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

          const { error } =
            await sb
              .from('time_capsule')
              .insert({
                name,
                message,
                unlock_year: 2029
              });

          if (error) throw error;

          $('#sealed')
            ?.classList
            .remove('hidden');

          if ($('#capsuleText'))
            $('#capsuleText').value = '';

          toast(
            'Sealed for 2029.'
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

    $('#amen')?.addEventListener(
      'click',
      event => {

        event.preventDefault();

        event.currentTarget.textContent =
          'AMEN ✓';

        event.currentTarget.disabled =
          true;

        toast('Amen.');
      }
    );
  }

  // =========================
  // REALTIME
  // =========================

  function live(table, fn) {

    if (!sb) return;

    try {

      sb.channel(
        `bpharm-${table}`
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
              fn();
            } catch (error) {
              console.error(
                `Realtime ${table}:`,
                error
              );
            }
          }
        )
        .subscribe(status => {

          console.log(
            `Realtime ${table}:`,
            status
          );
        });

    } catch (error) {

      console.error(
        `Realtime setup ${table}:`,
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
        // =========================
  // SMALL UI
  // =========================

  function addPolish() {

    const style =
      document.createElement('style');

    style.textContent = `
      #toast {
        position: fixed;
        left: 50%;
        bottom: 82px;
        transform: translate(-50%, 20px);
        opacity: 0;
        pointer-events: none;
        z-index: 9999;
        background: #191321;
        border: 1px solid #3a2a48;
        color: #fff;
        padding: 12px 16px;
        border-radius: 999px;
        font-size: 13px;
        box-shadow: 0 10px 40px #0008;
        transition: .25s ease;
        max-width: 88vw;
        text-align: center;
      }

      #toast.show {
        opacity: 1;
        transform: translate(-50%, 0);
      }

      .replyitem {
        border-left: 2px solid #765a91;
        padding: 7px 0 7px 12px;
        margin-top: 8px;
      }

      .replyitem p {
        margin: 3px 0;
        color: #c8bfce;
      }

      .feedactions button {
        background: #211a2a;
        border: 1px solid #292232;
        color: #fff;
        padding: 8px 10px;
        border-radius: 999px;
      }

      .heartbox input {
        box-sizing: border-box;
      }
    `;

    document.head.appendChild(style);
  }

  // =========================
  // START
  // =========================

  function init() {

    // Navigation is initialized FIRST.
    // Therefore Supabase problems cannot disable navigation.

    setupNavigation();

    setupMessages();
    setupMemories();
    setupHearts();
    setupCards();
    setupCapsule();

    addPolish();

    const connected =
      setupSupabase();

    if (!connected) {

      console.error(
        'BPharm One: Supabase unavailable.'
      );

      toast(
        'Site loaded, but Supabase is unavailable.'
      );

      return;
    }

    loadMessages();
    loadMemories();
    loadHeartCount();

    setupRealtime();
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
