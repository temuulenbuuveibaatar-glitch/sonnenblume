(function(){
  const b=document.getElementById('delAll'),m=document.getElementById('delMsg');let armed=false,t=0;
  b.addEventListener('click',async()=>{
    if(!armed){armed=true;b.textContent='Tap again to permanently delete';clearTimeout(t);t=setTimeout(()=>{armed=false;b.textContent='Delete all my data';},4000);return;}
    armed=false;b.textContent='Delete all my data';
    try{localStorage.removeItem('sonnenblume-v1');}catch(e){}
    try{if(window.caches){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('sonnenblume')).map(k=>caches.delete(k)));}}catch(e){}
    try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));}}catch(e){}
    m.textContent='Done. All Sonnenblume data has been removed from this browser.';
  });
})();
