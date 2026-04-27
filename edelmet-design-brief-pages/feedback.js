/* EDELMET Design-Brief — Feedback UI (общий для всех страниц)
   Каждая страница задаёт PAGE и PAGE_TITLE через window.FB_PAGE и window.FB_PAGE_TITLE до подключения этого скрипта. */
(function(){
  var PROJECT='edelmet-design-brief';
  var PAGE = window.FB_PAGE || 'unknown';
  var PAGE_TITLE = window.FB_PAGE_TITLE || PAGE;
  var SK='2p-feedback-'+PROJECT;
  function ga(){return JSON.parse(localStorage.getItem(SK)||'{}');}
  function gp(){var a=ga();return a[PAGE]||{};}
  function sp(d){var a=ga();if(Object.keys(d).length<=1&&d._title)delete a[PAGE];else a[PAGE]=d;localStorage.setItem(SK,JSON.stringify(a));}
  function tc(){var a=ga(),c=0;for(var p in a)for(var k in a[p])if(k!=='_title')c++;return c;}
  function load(){
    var pd=gp();
    for(var bid in pd){
      if(bid==='_title')continue;
      var e=pd[bid],t=(typeof e==='object')?e.text:e;
      var ta=document.getElementById('feedback-text-'+bid);
      var btn=document.querySelector('#block-'+bid+' .feedback-btn');
      var db=document.getElementById('delete-btn-'+bid);
      if(ta)ta.value=t;
      if(btn){btn.classList.add('has-comment');btn.textContent='✏️ Bearbeiten';}
      if(db)db.hidden=false;
    }
    uc();
  }
  window.toggleFeedback=function(id){
    var p=document.getElementById('feedback-panel-'+id);
    p.classList.toggle('open');
    if(p.classList.contains('open')){var ta=document.getElementById('feedback-text-'+id);if(ta)ta.focus();}
  };
  window.saveFeedback=function(id){
    var t=document.getElementById('feedback-text-'+id).value.trim();if(!t)return;
    var bl=document.getElementById('block-'+id),le=bl?bl.querySelector('.block-label'):null;
    var label=le?le.textContent:('Block '+id);
    var pd=gp();pd._title=PAGE_TITLE;pd[id]={text:t,label:label};sp(pd);
    var btn=document.querySelector('#block-'+id+' .feedback-btn');
    btn.classList.add('has-comment');btn.textContent='✏️ Bearbeiten';
    document.getElementById('delete-btn-'+id).hidden=false;
    var si=document.getElementById('saved-'+id);if(si){si.style.display='inline-flex';setTimeout(function(){si.style.display='none';},2000);}
    uc();setTimeout(function(){window.toggleFeedback(id);},1200);
  };
  window.deleteFeedback=function(id){
    var pd=gp();delete pd[id];sp(pd);
    document.getElementById('feedback-text-'+id).value='';
    var btn=document.querySelector('#block-'+id+' .feedback-btn');
    btn.classList.remove('has-comment');btn.textContent='✏️ Vorschlag';
    document.getElementById('delete-btn-'+id).hidden=true;
    uc();window.toggleFeedback(id);
  };
  function uc(){
    var c=tc(),el=document.getElementById('feedbackCounter');
    if(!el)return;
    if(c>0){el.classList.add('has-feedback');el.innerHTML='📥 Feedback: '+c+' Kommentar'+(c>1?'e':'');}
    else{el.classList.remove('has-feedback');el.innerHTML='Feedback: 0 Kommentare';}
  }
  window.openExportOverlay=function(){
    var c=tc();if(c===0)return;
    var ec=document.getElementById('exportCount');if(ec)ec.textContent=c;
    document.getElementById('exportOverlay').classList.add('open');
  };
  window.closeExportOverlay=function(){document.getElementById('exportOverlay').classList.remove('open');};
  function bft(){
    var a=ga(),c=tc(),t='FEEDBACK — EDELMET Design-Brief\nDatum: '+new Date().toLocaleDateString('de-DE')+'\n'+c+' Kommentar(e) insgesamt\n==================================================\n\n';
    var ord=['index','01_kontext','02_wettbewerber','03_design_kit','04_deliverables'];
    var seen={};
    ord.forEach(function(p){
      if(!a[p])return;seen[p]=true;
      var pd=a[p],pt=pd._title||p;t+='━━━ '+pt+' ━━━\n\n';
      for(var bid in pd){if(bid==='_title')continue;var e=pd[bid],ct=(typeof e==='object')?e.text:e,lb=(typeof e==='object'&&e.label)?e.label:('Block '+bid);
        t+='📌 '+lb+'\n----------------------------------------\n'+ct+'\n\n';}
    });
    for(var p in a){if(seen[p])continue;var pd=a[p],pt=pd._title||p;t+='━━━ '+pt+' ━━━\n\n';
      for(var bid in pd){if(bid==='_title')continue;var e=pd[bid],ct=(typeof e==='object')?e.text:e,lb=(typeof e==='object'&&e.label)?e.label:('Block '+bid);
        t+='📌 '+lb+'\n----------------------------------------\n'+ct+'\n\n';}}
    t+='==================================================\nErstellt am '+new Date().toLocaleString('de-DE')+'\n';return t;
  }
  window.exportFeedback=function(){
    var t=bft(),b=new Blob([t],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download='feedback_edelmet_design-brief_'+new Date().toISOString().slice(0,10)+'.txt';a.click();URL.revokeObjectURL(u);
    window.closeExportOverlay();
  };
  window.copyFeedback=function(){
    navigator.clipboard.writeText(bft()).then(function(){
      var b=document.querySelector('.btn-copy'),o=b.textContent;b.textContent='✅ Kopiert!';setTimeout(function(){b.textContent=o;},2000);
    });
  };
  load();
})();
