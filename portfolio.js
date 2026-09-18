document.addEventListener('DOMContentLoaded',()=>{
  const items=document.querySelectorAll('.reveal');
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
  items.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i,6)*70)+'ms';io.observe(el)});
  document.querySelectorAll('[data-tilt]').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      if(innerWidth<800)return;
      const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(900px) rotateX(${-y*3}deg) rotateY(${x*3}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });
});