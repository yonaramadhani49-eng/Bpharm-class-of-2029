const SUPABASE_URL = 'https://hketlksydaqmuiysozdh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5EwGCtzUhnbeGa_1idFARg_bCBa3KH5';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = (v, max=1000) => String(v || '').trim().slice(0,max);
const timeAgo = (iso) => {
  const sec = Math.max(1, Math.floor((Date.now()-new Date(iso).getTime())/1000));
  if(sec<60) return `${sec}s ago`;
  const min=Math.floor(sec/60); if(min<60) return `${min}m ago`;
  const hr=Math.floor(min/60); if(hr<24) return `${hr}h ago`;
  return `${Math.floor(hr/24)}d ago`;
};
function toast(text){
  let t=$('#toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=text;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600);
}
function go(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+id);}
$$('[data-next]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.next)));

// ---------- Messages ----------
async function reactionCount(table, idField, id, reaction){
  const {count,error}=await sb.from(table).select('*',{count:'exact',head:true}).eq(idField,id).eq('reaction',reaction);
  return error ? 0 : (count||0);
}
async function messageHTML(m){
  const reactions=['❤️','😂','💊'];
  const counts=await Promise.all(reactions.map(r=>reactionCount('message_reactions','message_id',m.id,r)));
  return `<div class="feeditem" data-id="${m.id}"><p>“${esc(m.message)}”</p><small>${m.anonymous?'Anonymous':esc(m.name||'BPharm One')} · ${timeAgo(m.created_at)}</small><div class="feedactions">${reactions.map((r,i)=>`<button data-react-message="${m.id}" data-reaction="${r}">${r} <i>${counts[i]}</i></button>`).join('')}<button class="replybtn" data-reply="${m.id}">💬 Reply</button></div><div class="replybox hidden" id="reply-${m.id}"><input placeholder="Your name"><textarea placeholder="Write a reply..."></textarea><button class="secondary" data-send-reply="${m.id}">SEND REPLY</button><div class="replies" id="replies-${m.id}"></div></div></div>`;
}
async function loadMessages(){
  const feed=$('#wallFeed');if(!feed)return;
  const {data,error}=await sb.from('messages').select('*').order('created_at',{ascending:false}).limit(50);
  if(error){console.error(error);toast('The Class Wall could not load.');return;}
  if(!data?.length){feed.innerHTML='<div class="feeditem"><p>No messages yet. Be the first to leave one.</p></div>';return;}
  const html=await Promise.all(data.map(messageHTML));feed.innerHTML=html.join('');
}
async function loadReplies(messageId){
  const box=$(`#replies-${messageId}`);if(!box)return;
  const {data,error}=await sb.from('replies').select('*').eq('message_id',messageId).order('created_at',{ascending:true});
  if(error)return;
  box.innerHTML=(data||[]).map(r=>`<div class="replyitem"><strong>${r.anonymous?'Anonymous':esc(r.name||'BPharm One')}</strong><p>${esc(r.reply)}</p></div>`).join('');
}
$('#postMessage')?.addEventListener('click',async()=>{
  const message=clean($('#message').value,800);if(!message)return toast('Write something first.');
  const name=clean($('#name').value,80)||'Anonymous';const anonymous=$('#anonymousMessage')?.checked??false;
  const {error}=await sb.from('messages').insert({message,name,anonymous});
  if(error){console.error(error);return toast('Could not post. Check your Supabase policies.');}
  $('#message').value='';$('#name').value='';if($('#anonymousMessage'))$('#anonymousMessage').checked=false;
  toast('Posted to the class wall.');await loadMessages();
});
$('#wallFeed')?.addEventListener('click',async e=>{
  const react=e.target.closest('[data-react-message]');
  if(react){
    const id=react.dataset.reactMessage,r=react.dataset.reaction,key=`msgreact:${id}:${r}`;
    if(localStorage.getItem(key))return toast('You already gave this reaction.');
    const {error}=await sb.from('message_reactions').insert({message_id:id,reaction:r});
    if(!error){localStorage.setItem(key,'1');react.querySelector('i').textContent=Number(react.querySelector('i').textContent)+1;react.classList.add('pop');}
    else toast('Reaction could not be saved.');
    return;
  }
  const reply=e.target.closest('[data-reply]');
  if(reply){const id=reply.dataset.reply;$('#reply-'+id)?.classList.toggle('hidden');loadReplies(id);return;}
  const send=e.target.closest('[data-send-reply]');
  if(send){
    const id=send.dataset.sendReply,box=$('#reply-'+id),inputs=box.querySelectorAll('input,textarea');
    const name=clean(inputs[0].value,80)||'Anonymous',reply=clean(inputs[1].value,500);if(!reply)return toast('Write a reply first.');
    const {error}=await sb.from('replies').insert({message_id:id,name,reply,anonymous:name==='Anonymous'});
    if(error)return toast('Reply could not be saved.');
    inputs[1].value='';toast('Reply posted.');loadReplies(id);
  }
});

// ---------- Memories ----------
async function loadMemories(){
  const gallery=$('#memoryGallery');if(!gallery)return;
  const {data,error}=await sb.from('memories').select('*').order('created_at',{ascending:false}).limit(60);
  if(error){console.error(error);toast('Memories could not load.');return;}
  if(!data?.length){gallery.innerHTML='<div class="memory-card"><div class="photo-placeholder">📸<span>The class memory wall is waiting for its first throwback.</span></div></div>';return;}
  const cards=[];
  for(const m of data){
    const rs=['❤️','😂','🔥','💊'];const counts=await Promise.all(rs.map(r=>reactionCount('memory_reactions','memory_id',m.id,r)));
    cards.push(`<article class="memory-card shared-memory"><img src="${esc(m.image_url)}" alt="Class memory" loading="lazy"><h3>${esc(m.caption||'A BPharm One memory')}</h3><small>${m.anonymous?'Anonymous':esc(m.name||'BPharm One')} · ${timeAgo(m.created_at)}</small><div class="reactions">${rs.map((r,i)=>`<button data-react-memory="${m.id}" data-reaction="${r}">${r} <i>${counts[i]}</i></button>`).join('')}</div></article>`);
  }
  gallery.innerHTML=cards.join('');
}
$('#addMemory')?.addEventListener('click',()=>$('#memoryInput')?.click());
$('#memoryInput')?.addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>5*1024*1024){e.target.value='';return toast('Please choose a photo under 5 MB.');}
  const caption=clean(prompt('Write a caption for this memory:'),300);if(!caption){e.target.value='';return;}
  const name=clean(prompt('Your name (or leave blank for Anonymous):'),80);const anonymous=!name;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${crypto.randomUUID()}-${safe}`;
  const {error:uploadError}=await sb.storage.from('memories').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
  if(uploadError){console.error(uploadError);e.target.value='';return toast('Photo upload failed. Check the Storage policies.');}
  const {data:urlData}=sb.storage.from('memories').getPublicUrl(path);
  const {error}=await sb.from('memories').insert({name:name||'Anonymous',caption,image_url:urlData.publicUrl,anonymous});
  if(error){console.error(error);return toast('Photo uploaded but could not be posted.');}
  e.target.value='';toast('Memory added for everyone.');await loadMemories();
});
$('#memoryGallery')?.addEventListener('click',async e=>{
  const b=e.target.closest('[data-react-memory]');if(!b)return;
  const key=`memreact:${b.dataset.reactMemory}:${b.dataset.reaction}`;if(localStorage.getItem(key))return toast('You already gave this reaction.');
  const {error}=await sb.from('memory_reactions').insert({memory_id:b.dataset.reactMemory,reaction:b.dataset.reaction});
  if(!error){localStorage.setItem(key,'1');b.querySelector('i').textContent=Number(b.querySelector('i').textContent)+1;b.classList.add('pop');}
});

// ---------- Hearts ----------
async function loadHeartCount(){const {count,error}=await sb.from('hearts').select('*',{count:'exact',head:true});if(!error&&$('#heartCount'))$('#heartCount').textContent=`❤️ ${count||0} hearts shared`;}
$('#heartBtn')?.addEventListener('click',async()=>{
  const receiver=clean($('#heartTarget')?.value,100);if(!receiver)return toast('Write the person's name first.');
  const sender=clean($('#heartSender')?.value,80)||'A BPharm One classmate';
  const {error}=await sb.from('hearts').insert({sender_name:sender,receiver_name:receiver});
  if(error){console.error(error);return toast('Could not send the heart.');}
  $('#heartTarget').value='';$('#heartSender').value='';$('#heartBtn').classList.add('pop');await loadHeartCount();toast(`❤️ Heart sent to ${receiver}.`);
});

// ---------- Card Studio ----------
let selectedTemplate='APPRECIATION';
$$('.templates button').forEach(b=>b.addEventListener('click',()=>{selectedTemplate=b.querySelector('small')?.textContent||'APPRECIATION';$$('.templates button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('#previewTemplate').textContent=selectedTemplate;}));
$('#cardText')?.addEventListener('input',e=>$('#previewText').textContent=e.target.value||'Your message will appear here.');
$('#cardFrom')?.addEventListener('input',e=>$('#previewFrom').textContent=e.target.value?`— ${e.target.value}`:'');
$('#downloadCard')?.addEventListener('click',()=>{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
  const g=c.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#120b20');g.addColorStop(1,'#35134b');c.fillStyle=g;c.fillRect(0,0,1080,1350);
  c.fillStyle='#fff';c.textAlign='center';c.font='bold 42px Arial';c.fillText('BPHARM ONE · CLASS OF 2029',540,170);c.font='bold 68px Arial';c.fillText(selectedTemplate,540,300);
  const msg=($('#cardText').value||'Your message will appear here.').slice(0,240);wrapText(c,msg,540,520,820,58);c.font='38px Arial';c.fillText($('#cardFrom').value?`— ${$('#cardFrom').value}`:'',540,1050);c.font='30px Arial';c.fillText('OUR FIRST CHAPTER',540,1210);
  const a=document.createElement('a');a.download='bpharm-one-card.png';a.href=canvas.toDataURL('image/png');a.click();toast('Card downloaded.');
});
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let words=text.split(/\s+/),line='';for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=w;y+=lineHeight;}else line=test;}if(line)ctx.fillText(line,x,y);}
$('#postCard')?.addEventListener('click',async()=>{const message=clean($('#cardText').value,800);if(!message)return toast('Write your card message first.');const name=clean($('#cardFrom').value,80)||'BPharm One';const {error}=await sb.from('cards').insert({name,recipient:'BPharm One',message,template:selectedTemplate});if(error)return toast('Could not post the card.');toast('🎴 Card posted.');go('wall');});

// ---------- Time capsule ----------
$('#seal')?.addEventListener('click',async()=>{const message=clean($('#capsuleText').value,800);if(!message)return toast('Write your message first.');const name=clean(prompt('Your name (optional):'),80)||'Anonymous';const {error}=await sb.from('time_capsule').insert({name,message,unlock_year:2029});if(error)return toast('Could not seal the message.');$('#sealed').classList.remove('hidden');$('#capsuleText').value='';toast('🔒 Sealed for 2029.');});
$('#amen')?.addEventListener('click',e=>{e.textContent='AMEN ✓';e.disabled=true;toast('Amen.');});

// ---------- Realtime ----------
function live(table,fn){sb.channel(`bpharm-${table}`).on('postgres_changes',{event:'*',schema:'public',table},fn).subscribe();}
live('messages',loadMessages);live('replies',()=>loadMessages());live('message_reactions',()=>loadMessages());live('memories',loadMemories);live('memory_reactions',loadMemories);live('hearts',loadHeartCount);

// ---------- Small UI polish ----------
const style=document.createElement('style');style.textContent=`#toast{position:fixed;left:50%;bottom:82px;transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:99;background:#191321;border:1px solid #3a2a48;color:#fff;padding:12px 16px;border-radius:999px;font-size:13px;box-shadow:0 10px 40px #0008;transition:.25s ease;max-width:88vw;text-align:center}#toast.show{opacity:1;transform:translate(-50%,0)}.replyitem{border-left:2px solid #765a91;padding:7px 0 7px 12px;margin-top:8px}.replyitem p{margin:3px 0;color:#c8bfce}.feedactions button{background:#211a2a;border:1px solid #292232;color:#fff;padding:8px 10px;border-radius:999px}.heartbox input{box-sizing:border-box}`;document.head.appendChild(style);

loadMessages();loadMemories();loadHeartCount();
