// ui/chat.js
// Dipendenze: ui/panel.js (applyActions), engine/engine.js (sendChat)
// Funzioni: md(t), esc(t), addMsg(role, html, id), handleChat()
// Inizializza: event listeners chat-sbtn (click), chat-inp (keydown), .sug (click)

// ── UI helpers ───────────────────────────────────────────────────
function md(t){
  return t
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`(.*?)`/g,'<code style="font-family:var(--mono);font-size:9px;background:var(--s3);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/\n\n/g,'</p><p style="margin-top:6px">')
    .replace(/\n[•\-] /g,'<br>\u2022 ')
    .replace(/\n/g,'<br>');
}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function addMsg(role,html,id){
  const wrap=document.getElementById('chat-msgs');
  const d=document.createElement('div');
  d.className='cmsg '+role;
  if(id) d.id=id;
  d.innerHTML='<div class="cmsg-lbl">'+(role==='u'?'tu':'assistente')+'</div><div class="cmsg-bub">'+html+'</div>';
  wrap.appendChild(d);
  wrap.scrollTop=wrap.scrollHeight;
}
// ── handleChat v8 ─────────────────────────────────────────────────
async function handleChat(){
  const inp=document.getElementById('chat-inp');
  const btn=document.getElementById('chat-sbtn');
  const q=inp.value.trim();
  if(!q) return;
  inp.value='';inp.style.height='32px';btn.disabled=true;
  document.getElementById('sugs').style.display='none';
  addMsg('u',esc(q));
  addMsg('a','<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>','_ld');
  try{
    const resp=await sendChat(q);
    const ld=document.getElementById('_ld');if(ld) ld.remove();
    addMsg('a','<p>'+md(resp.text)+'</p>');
    applyActions(resp.actions,resp.aiResult);
  }catch(e){
    const ld=document.getElementById('_ld');if(ld) ld.remove();
    addMsg('a','<span style="color:#fb7185">\u26a0 '+esc(e.message)+'</span>');
  }
  btn.disabled=false;
  document.getElementById('chat-msgs').scrollTop=9999;
}

function resetChat(){
  const msgs=document.getElementById('chat-msgs');
  const inp=document.getElementById('chat-inp');
  const btn=document.getElementById('chat-sbtn');
  msgs.innerHTML='<div class="cmsg a"><div class="cmsg-lbl">assistente</div><div class="cmsg-bub">Ciao! Analizzo <strong>10.000 clienti</strong> su 30 città. Chiedimi cross-sell, proiezioni, gap prodotti, confronti demografici, analisi di un cliente specifico e tanto altro ancora.</div></div>';
  inp.value='';
  inp.style.height='32px';
  btn.disabled=false;
  document.getElementById('sugs').style.display='';
}

function toggleChat(){
  const body=document.getElementById('chat-body');
  const btn=document.getElementById('chat-toggle');
  const collapsed=body.classList.toggle('chat-collapsed');
  btn.style.transform=collapsed?'rotate(180deg)':'rotate(0deg)';
  btn.title=collapsed?'Espandi':'Comprimi';
  // Aspetta la fine esatta della transizione CSS prima di riadattare la mappa
  body.addEventListener('transitionend',function onEnd(e){
    if(e.propertyName!=='height') return;
    body.removeEventListener('transitionend',onEnd);
    fitItaly();
  });
}

document.getElementById('chat-sbtn').addEventListener('click',handleChat);
document.getElementById('chat-inp').addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleChat();}
});
document.querySelectorAll('.sug').forEach(s=>{
  s.addEventListener('click',function(){
    document.getElementById('chat-inp').value=this.dataset.q;
    handleChat();
  });
});
