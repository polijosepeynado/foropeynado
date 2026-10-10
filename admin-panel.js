(() => {
  'use strict';
  const SB = 'https://reyyjgzieyqdtxfkfllp.supabase.co';
  const KEY = 'sb_publishable_XR5_4gJ1knSfOYoNIVSKCg_TB2y3ah4';
  const ADMIN_ID = '8b21f591-f99b-4018-bb82-bc3ebe08e142';
  const ADMIN_EMAIL = 'docmisterio52@gmail.com';
  let state = { view: 'overview', stats: null, users: [], content: [], reported: [], busy: false };
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = s => { if (!s) return '—'; const d = new Date(s); return Number.isNaN(+d) ? '—' : d.toLocaleString(); };
  const session = () => { try { return JSON.parse(localStorage.getItem('fps') || 'null'); } catch (_) { return null; } };
  async function token() {
    const refresh = async () => {
      let s = session();
      if (!s) throw new Error('Inicia sesión con la cuenta administradora en Foro Peynado.');
      if (s.u?.id !== ADMIN_ID || String(s.u?.email || '').toLowerCase() !== ADMIN_EMAIL) throw new Error('Esta sección solo está disponible para la cuenta administradora autorizada.');
      if (s.exp && s.exp - Date.now()/1000 > 90 && s.at) return s.at;
      if (!s.rt) throw new Error('La sesión expiró. Cierra sesión e inicia sesión nuevamente.');
      const r = await fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: {'apikey': KEY, 'Content-Type':'application/json'},
        body: JSON.stringify({refresh_token:s.rt})
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || !j.access_token) {
        const latest = session();
        if (latest?.at && latest.exp > Date.now()/1000 && latest.rt !== s.rt) return latest.at;
        throw new Error(j.msg || j.message || 'No se pudo renovar la sesión.');
      }
      s = {at:j.access_token, rt:j.refresh_token || s.rt, exp:j.expires_at || Math.floor(Date.now()/1000)+(j.expires_in||3600), u:j.user || s.u};
      localStorage.setItem('fps', JSON.stringify(s));
      return s.at;
    };
    return navigator.locks && navigator.locks.request
      ? navigator.locks.request('fp-auth-refresh', refresh)
      : refresh();
  }
  async function api(action, extra={}) {
    const t = await token();
    const r = await fetch(SB + '/functions/v1/admin-panel', {
      method:'POST', headers:{'apikey':KEY,'Authorization':'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action,...extra})
    });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || j.error) throw new Error(j.error || ('Error HTTP '+r.status));
    return j;
  }
  function toast(msg, bad=false) {
    let el=$('#fp-admin-toast');
    if (!el) { el=document.createElement('div'); el.id='fp-admin-toast'; document.body.append(el); }
    el.textContent=msg; el.style.background=bad?'#8b252b':'#182a24'; el.classList.add('show');
    clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove('show'),3600);
  }
  function install() {
    if ($('#fp-admin-open')) return;
    const header=document.querySelector('body > header');
    if (!header) return;
    const btn=document.createElement('button');
    btn.id='fp-admin-open'; btn.type='button'; btn.textContent='⚙ Admin';
    btn.addEventListener('click', openPanel);
    const right=header.lastElementChild;
    if (right) right.insertBefore(btn, right.firstChild); else header.append(btn);
    const style=document.createElement('style');
    style.textContent=`
      #fp-admin-open{border:1px solid #557f69;background:#193c2b;color:#e8fff0;border-radius:10px;padding:9px 12px;font-weight:750;cursor:pointer;white-space:nowrap}
      #fp-admin-open:hover{filter:brightness(1.12)}
      #fp-admin-overlay{position:fixed;inset:0;z-index:9999;background:rgba(5,8,12,.78);display:flex;align-items:center;justify-content:center;padding:12px}
      #fp-admin-panel{background:var(--k,#101419);color:var(--tx,#f1f3f5);border:1px solid var(--bd,#303741);border-radius:16px;width:min(1100px,100%);height:min(850px,94dvh);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 80px #0009}
      #fp-admin-panel *{box-sizing:border-box}
      .fpa-head{padding:15px 18px;border-bottom:1px solid var(--bd,#303741);display:flex;gap:12px;align-items:center;justify-content:space-between}
      .fpa-head h2{margin:0;font-size:20px}.fpa-muted{opacity:.72;font-size:12px}
      .fpa-close,.fpa-btn,.fpa-tab{font:inherit;cursor:pointer;border:1px solid var(--bd,#3a414b);border-radius:9px;padding:8px 11px;background:transparent;color:inherit}
      .fpa-btn.primary{background:#245d3c;border-color:#36734d}.fpa-btn.danger{color:#ff9a9a;border-color:#844247}.fpa-btn:disabled{opacity:.5;cursor:wait}
      .fpa-tabs{display:flex;gap:7px;padding:10px 14px;border-bottom:1px solid var(--bd,#303741);overflow-x:auto}
      .fpa-tab.active{background:#244b35;border-color:#477b5c}
      .fpa-body{padding:16px;overflow:auto;flex:1}
      .fpa-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px}
      .fpa-stat,.fpa-card{border:1px solid var(--bd,#303741);border-radius:12px;padding:13px;background:rgba(120,130,140,.06)}
      .fpa-stat strong{display:block;font-size:25px;margin-top:5px}
      .fpa-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
      .fpa-input,.fpa-select,.fpa-area{font:inherit;width:100%;min-width:0;background:rgba(120,130,140,.08);color:inherit;border:1px solid var(--bd,#303741);border-radius:8px;padding:9px}
      .fpa-toolbar .fpa-input{flex:1;min-width:180px}
      .fpa-tablewrap{overflow:auto;border:1px solid var(--bd,#303741);border-radius:10px}
      .fpa-table{border-collapse:collapse;width:100%;font-size:13px;min-width:680px}
      .fpa-table th,.fpa-table td{padding:10px;border-bottom:1px solid var(--bd,#303741);text-align:left;vertical-align:top}
      .fpa-table th{position:sticky;top:0;background:var(--k,#101419);z-index:1}
      .fpa-actions{display:flex;gap:6px;flex-wrap:wrap}.fpa-actions .fpa-btn{font-size:12px;padding:6px 8px}
      .fpa-badge{display:inline-block;border-radius:99px;padding:3px 7px;background:rgba(100,150,110,.18);font-size:11px}
      .fpa-badge.warn{background:rgba(220,90,90,.17);color:#ffaaaa}
      .fpa-empty{padding:24px;text-align:center;opacity:.75}
      #fp-admin-toast{position:fixed;z-index:10001;left:50%;bottom:22px;transform:translate(-50%,15px);opacity:0;transition:.2s;background:#182a24;color:white;padding:11px 16px;border-radius:10px;max-width:90vw;box-shadow:0 5px 25px #0007;pointer-events:none}
      #fp-admin-toast.show{opacity:1;transform:translate(-50%,0)}
      .fpa-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      @media(max-width:600px){#fp-admin-overlay{padding:0}#fp-admin-panel{height:100dvh;border-radius:0}.fpa-head{padding:12px}.fpa-body{padding:10px}.fpa-formgrid{grid-template-columns:1fr}.fpa-table{min-width:640px}}
    `;
    document.head.append(style);
    const s=session();
    if (s?.u?.id===ADMIN_ID && String(s.u.email||'').toLowerCase()===ADMIN_EMAIL) btn.style.display='';
    else btn.style.display='none';
    window.addEventListener('storage', syncButton);
  }
  function syncButton(){const b=$('#fp-admin-open'),s=session();if(b)b.style.display=s?.u?.id===ADMIN_ID&&String(s.u.email||'').toLowerCase()===ADMIN_EMAIL?'':'none';}
  function openPanel(){
    const s=session();
    if(s?.u?.id!==ADMIN_ID || String(s.u?.email||'').toLowerCase()!==ADMIN_EMAIL){toast('Inicia sesión con la cuenta administradora.',true);return;}
    if ($('#fp-admin-overlay')) return;
    const o=document.createElement('div');o.id='fp-admin-overlay';
    o.innerHTML='<section id="fp-admin-panel" role="dialog" aria-modal="true" aria-label="Panel de administración"><div class="fpa-head"><div><h2>Panel de administración</h2><div class="fpa-muted">Foro Peynado · acceso restringido</div></div><button class="fpa-close" data-fpa="close" aria-label="Cerrar">✕</button></div><div class="fpa-tabs"><button class="fpa-tab active" data-view="overview">Resumen</button><button class="fpa-tab" data-view="users">Usuarios</button><button class="fpa-tab" data-view="content">Contenido</button><button class="fpa-tab" data-view="reports">Reportes</button><button class="fpa-tab" data-view="trash">Papelera</button></div><div class="fpa-body"><div class="fpa-empty">Comprobando autorización…</div></div></section>';
    o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-fpa="close"]'))o.remove();});
    o.addEventListener('click',e=>{const t=e.target.closest('[data-view]');if(t){state.view=t.dataset.view;drawTabs();loadView();}});
    o.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handleAction(b);});
    o.addEventListener('change',e=>{if(e.target.id==='fpa-user-filter')renderUsers();if(e.target.id==='fpa-content-filter')renderContent();});
    o.addEventListener('input',e=>{if(e.target.id==='fpa-search-users')renderUsers();if(e.target.id==='fpa-search-content')renderContent();});
    document.body.append(o);
    api('status').then(()=>loadView()).catch(e=>{const body=$('.fpa-body',o);if(body)body.innerHTML='<div class="fpa-card"><b>No se pudo autorizar el panel</b><p>'+esc(e.message)+'</p><button class="fpa-btn" data-fpa="close">Cerrar</button></div>';});
  }
  function drawTabs(){document.querySelectorAll('.fpa-tab').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));}
  async function loadView(){
    const body=$('.fpa-body');if(!body)return;
    body.innerHTML='<div class="fpa-empty">Cargando…</div>';
    try{
      if(state.view==='overview'){const r=await api('overview');state.stats=r.stats||{};body.innerHTML=overviewHtml();}
      else if(state.view==='users'){const r=await api('users');state.users=r.users||[];renderUsers();}
      else if(state.view==='reports'){const r=await api('reports');state.reported=r.items||[];renderReports();}
      else {const r=await api('content');state.content=r.content||[];renderContent();}
    }catch(e){body.innerHTML='<div class="fpa-card"><b>No se pudo cargar la sección</b><p>'+esc(e.message)+'</p><button class="fpa-btn" data-action="retry">Reintentar</button></div>';}
  }
  function overviewHtml(){const s=state.stats||{};return '<div class="fpa-stats">'+[['Usuarios',s.user],['Publicaciones',s.post],['Historias',s.story],['Comentarios',s.cm],['Mensajes',s.msg],['Reportes',s.rep],['Papelera',s.trash],['Sanciones activas',s.bans]].map(([n,v])=>'<div class="fpa-stat"><span class="fpa-muted">'+n+'</span><strong>'+Number(v||0)+'</strong></div>').join('')+'</div><div class="fpa-card" style="margin-top:14px"><b>Acciones de administración</b><p class="fpa-muted">Puedes revisar cuentas y moderar publicaciones. Las eliminaciones permanentes no se pueden deshacer.</p><div class="fpa-actions"><button class="fpa-btn primary" data-view="users">Administrar usuarios</button><button class="fpa-btn" data-view="content">Revisar contenido</button><button class="fpa-btn" data-view="trash">Abrir papelera</button></div></div>';}
  function renderUsers(){
    const body=$('.fpa-body');if(!body)return;
    const oldSearch=$('#fpa-search-users'), caret=oldSearch?oldSearch.selectionStart:0, hadFocus=oldSearch&&document.activeElement===oldSearch; const q=(oldSearch?.value||'').toLowerCase(),f=$('#fpa-user-filter')?.value||'all';
    const list=state.users.filter(u=>(!q||[u.name,u.email,u.id].some(x=>String(x||'').toLowerCase().includes(q)))&&(f==='all'||(f==='banned'&&u.banned)||(f==='normal'&&!u.banned)));
    body.innerHTML='<div class="fpa-toolbar"><input id="fpa-search-users" class="fpa-input" placeholder="Buscar por nombre, correo o ID" value="'+esc(q)+'"><select id="fpa-user-filter" class="fpa-select" style="max-width:180px"><option value="all" '+(f==='all'?'selected':'')+'>Todos</option><option value="normal" '+(f==='normal'?'selected':'')+'>Sin sanción</option><option value="banned" '+(f==='banned'?'selected':'')+'>Sancionados</option></select><button class="fpa-btn" data-action="refresh">Actualizar</button></div><div class="fpa-tablewrap"><table class="fpa-table"><thead><tr><th>Usuario</th><th>Correo</th><th>Registro / último acceso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>'+list.map(u=>'<tr><td><b>'+esc(u.name)+'</b><div class="fpa-muted">'+esc(u.id)+'</div></td><td>'+esc(u.email||'—')+'</td><td>'+esc(fmt(u.created_at))+'<div class="fpa-muted">Último: '+esc(fmt(u.last_sign_in_at))+'</div></td><td>'+(u.is_admin?'<span class="fpa-badge">Administradora</span>':u.banned?'<span class="fpa-badge warn">Sancionado · '+esc(u.ban_type==='permanent'?'permanente':'temporal')+'</span>':'<span class="fpa-badge">Activo</span>')+(u.banned&&u.ban_reason?'<div class="fpa-muted">'+esc(u.ban_reason)+'</div>':'')+'</td><td><div class="fpa-actions">'+(u.is_admin?'':u.banned?'<button class="fpa-btn" data-action="unban" data-id="'+esc(u.id)+'">Retirar sanción</button>':'<button class="fpa-btn danger" data-action="ban" data-id="'+esc(u.id)+'" data-name="'+esc(u.name)+'">Sancionar</button>')+'</div></td></tr>').join('')+'</tbody></table></div><p class="fpa-muted">'+list.length+' de '+state.users.length+' usuarios</p>';
  }
  function contentTitle(c){const d=c.data||{};return d.t||d.title||d.text||d.name||c.id;}
  function contentOwner(c){return c.owner||c.data?.uid||c.data?.u||'—';}
  function renderContent(){
    const body=$('.fpa-body');if(!body)return;
    const oldSearch=$('#fpa-search-content'), caret=oldSearch?oldSearch.selectionStart:0, hadFocus=oldSearch&&document.activeElement===oldSearch; const trash=state.view==='trash',q=(oldSearch?.value||'').toLowerCase(),f=$('#fpa-content-filter')?.value||'all';
    const list=state.content.filter(c=>trash?c.deleted:!c.deleted).filter(c=>(f==='all'||c.kind===f)&&(!q||[contentTitle(c),c.id,c.kind,contentOwner(c)].some(x=>String(x||'').toLowerCase().includes(q))));
    const kinds=['all','post','story','cm','rep','msg'];
    body.innerHTML='<div class="fpa-toolbar"><input id="fpa-search-content" class="fpa-input" placeholder="Buscar texto, ID o propietario" value="'+esc(q)+'"><select id="fpa-content-filter" class="fpa-select" style="max-width:170px">'+kinds.map(k=>'<option value="'+k+'" '+(f===k?'selected':'')+'>'+(k==='all'?'Todos los tipos':({post:'Publicaciones',story:'Historias',cm:'Comentarios',rep:'Reportes',msg:'Mensajes'}[k]||k))+'</option>').join('')+'</select><button class="fpa-btn" data-action="refresh">Actualizar</button></div><div class="fpa-tablewrap"><table class="fpa-table"><thead><tr><th>Tipo</th><th>Contenido</th><th>ID / propietario</th><th>Última actualización</th><th>Acciones</th></tr></thead><tbody>'+list.map(c=>'<tr><td>'+esc(({post:'Publicación',story:'Historia',cm:'Comentario',rep:'Reporte',msg:'Mensaje'}[c.kind]||c.kind))+'</td><td>'+esc(String(contentTitle(c)).slice(0,240))+(String(contentTitle(c)).length>240?'…':'')+'</td><td><code>'+esc(c.id)+'</code><div class="fpa-muted">'+esc(contentOwner(c))+'</div></td><td>'+esc(fmt(c.updated_at))+'</td><td><div class="fpa-actions">'+(trash?'<button class="fpa-btn" data-action="restore" data-id="'+esc(c.id)+'">Restaurar</button><button class="fpa-btn danger" data-action="permanent" data-id="'+esc(c.id)+'">Eliminar definitivamente</button>':'<button class="fpa-btn danger" data-action="soft-delete" data-id="'+esc(c.id)+'">Enviar a papelera</button>')+'</div></td></tr>').join('')+'</tbody></table></div><p class="fpa-muted">'+list.length+' elementos'+(trash?' en la papelera':'')+'</p>';
    if(!list.length)body.insertAdjacentHTML('beforeend','<div class="fpa-empty">No hay elementos para mostrar.</div>'); if(hadFocus){const inp=$('#fpa-search-content');inp?.focus();try{inp.setSelectionRange(caret,caret)}catch(_){}}
  }
  function renderReports(){const body=$('.fpa-body');if(!body)return;const list=state.reported||[];body.innerHTML='<div class="fpa-toolbar"><span class="fpa-muted">Contenido reportado. Las publicaciones se ocultan con 3 reportes y los comentarios con 10, salvo decisión de administración.</span><button class="fpa-btn" data-action="refresh">Actualizar</button></div>'+(list.length?list.map(x=>'<div class="fpa-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span class="fpa-badge warn">'+esc(x.reports)+' reportes</span> <b>'+esc(({post:'Publicación',story:'Historia',cm:'Comentario'}[x.kind]||x.kind))+'</b><div class="fpa-muted">ID: '+esc(x.id)+' · Autor: '+esc(x.owner||'—')+'</div></div><div class="fpa-actions">'+(x.kind==='post'?'<button class="fpa-btn" data-action="'+(x.pinned?'unpin':'pin')+'" data-id="'+esc(x.id)+'">'+(x.pinned?'Desfijar':'Fijar')+'</button>':'')+'<button class="fpa-btn" data-action="'+(x.visibility==='hidden'?'report-show':'report-hide')+'" data-id="'+esc(x.id)+'">'+(x.visibility==='hidden'?'Volver visible':'Ocultar')+'</button></div></div><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(x.title||'(sin texto)')+'</p><div class="fpa-muted">Estado: '+esc(x.visibility==='hidden'?'Oculto por administración':x.autoHidden?'Oculto por reportes':'Visible')+'</div></div>').join(''):'<div class="fpa-empty">No hay contenido reportado.</div>');}
  async function handleAction(b){
    const a=b.dataset.action,id=b.dataset.id;
    try{
      if(a==='retry'||a==='refresh'){await loadView();return;}
      if(a==='report-show'||a==='report-hide'||a==='pin'||a==='unpin'){b.disabled=true;const visibility=a==='report-show'?'visible':a==='report-hide'?'hidden':undefined;const pinned=a==='pin'?true:a==='unpin'?false:undefined;await api('moderate_content',{id,visibility,pinned});toast(a==='report-show'?'Contenido visible de nuevo.':a==='report-hide'?'Contenido ocultado.':a==='pin'?'Publicación fijada.':'Publicación desfijada.');await loadView();return;}
      if(a==='ban'){showBanForm(id,b.dataset.name||'usuario');return;}
      if(a==='unban'){if(!confirm('¿Retirar la sanción de esta cuenta?'))return;b.disabled=true;await api('unban',{userId:id});toast('Sanción retirada.');await loadView();return;}
      if(a==='soft-delete'){if(!confirm('¿Enviar este contenido a la papelera? Se podrá restaurar después.'))return;b.disabled=true;await api('soft_delete',{id});toast('Contenido enviado a la papelera.');await loadView();return;}
      if(a==='restore'){if(!confirm('¿Restaurar este contenido?'))return;b.disabled=true;await api('restore',{id});toast('Contenido restaurado.');await loadView();return;}
      if(a==='permanent'){if(!confirm('Esto borrará el registro de forma permanente. No se puede deshacer. ¿Continuar?'))return;b.disabled=true;await api('permanent_delete',{id});toast('Contenido eliminado.');await loadView();return;}
      if(a==='submit-ban'){
        const form=$('#fpa-ban-form'),userId=form.dataset.id,type=$('#fpa-ban-type').value,reason=$('#fpa-ban-reason').value.trim();
        let expiresAt=null;
        if(type==='temporary'){const v=$('#fpa-ban-until').value;if(!v)throw new Error('Elige la fecha y hora de vencimiento.');expiresAt=new Date(v).toISOString();}
        if(!reason)throw new Error('Escribe el motivo de la sanción.');
        b.disabled=true;await api('set_ban',{userId,type,reason,expiresAt});toast('Sanción aplicada.');await loadView();return;
      }
    }catch(e){toast(e.message||'Ocurrió un error.',true);b.disabled=false;}
  }
  function showBanForm(id,name){
    const body=$('.fpa-body');if(!body)return;
    const d=new Date(Date.now()+24*3600000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    body.insertAdjacentHTML('afterbegin','<div class="fpa-card" style="margin-bottom:12px"><h3 style="margin-top:0">Sancionar a '+esc(name)+'</h3><form id="fpa-ban-form" data-id="'+esc(id)+'"><div class="fpa-formgrid"><label>Tipo de sanción<select id="fpa-ban-type" class="fpa-select"><option value="temporary">Temporal</option><option value="permanent">Permanente</option></select></label><label id="fpa-ban-until-wrap">Válida hasta<input id="fpa-ban-until" class="fpa-input" type="datetime-local" value="'+d.toISOString().slice(0,16)+'"></label></div><label style="display:block;margin-top:10px">Motivo<textarea id="fpa-ban-reason" class="fpa-area" rows="2" maxlength="500" placeholder="Explica brevemente el motivo"></textarea></label><div class="fpa-actions" style="margin-top:10px"><button class="fpa-btn danger" type="button" data-action="submit-ban">Confirmar sanción</button><button class="fpa-btn" type="button" data-action="cancel-ban">Cancelar</button></div></form></div>');
    $('#fpa-ban-type').addEventListener('change',()=>{$('#fpa-ban-until-wrap').style.display=$('#fpa-ban-type').value==='temporary'?'':'none';});
    const cancel=$('[data-action="cancel-ban"]');cancel.addEventListener('click',()=>$('#fpa-ban-form')?.closest('.fpa-card')?.remove());
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-a="pin"]');if(!b)return;e.preventDefault();e.stopPropagation();const id=b.dataset.id,was=b.title==='Desfijar publicación';b.disabled=true;api('moderate_content',{id,pinned:!was}).then(()=>{toast(was?'Publicación desfijada.':'Publicación fijada.');location.reload()}).catch(err=>{toast(err.message||'No se pudo fijar la publicación.',true);b.disabled=false;});},true);
  document.addEventListener('DOMContentLoaded',install);
  install();
  setInterval(syncButton,2500);
})();