document.addEventListener('DOMContentLoaded',()=>{
  const items=document.querySelectorAll('.reveal');
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
  items.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i,6)*70)+'ms';io.observe(el)});
  document.querySelectorAll('[data-tilt]').forEach(card=>{
    let raf=0,px=0,py=0;
    card.addEventListener('pointermove',e=>{
      if(innerWidth<800)return;
      const r=card.getBoundingClientRect();
      px=(e.clientX-r.left)/r.width-.5;
      py=(e.clientY-r.top)/r.height-.5;
      if(!raf)raf=requestAnimationFrame(()=>{
        raf=0;
        card.style.transform=`perspective(900px) rotateX(${-py*3}deg) rotateY(${px*3}deg) translateY(-4px)`;
      });
    });
    card.addEventListener('pointerleave',()=>{
      if(raf){cancelAnimationFrame(raf);raf=0;}
      card.style.transform='';
    });
  });
});