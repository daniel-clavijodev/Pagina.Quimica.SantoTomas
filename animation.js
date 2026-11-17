// Diagram of atom conservation, not a molecular mechanism or geometry.
function atomLayout(formulas, coefficients, left, parse) {
  const atoms = [], labels = [];
  formulas.forEach((formula, i) => {
    const parsed = parse(formula), elements = Object.entries(parsed.atoms);
    const total = elements.reduce((s, [, n]) => s + n, 0) * coefficients[i];
    const x0 = left ? 24 : 414, y0 = 48 + i * 98;
    labels.push({x:x0,y:y0-15,text:coefficients[i]+' × '+formula});
    let k = 0;
    for (const [element, n] of elements) for(let j=0;j<n*coefficients[i];j++,k++) {
      const cols = Math.min(16, Math.max(1,total));
      atoms.push({element,x:x0+10+(k%cols)*20,y:y0+Math.floor(k/cols)*20});
    }
  });
  return {atoms,labels};
}
function atomPairs(left,right){const queues={};right.forEach(a=>(queues[a.element]??=[]).push(a));return left.map(a=>({from:a,to:queues[a.element]?.shift()||null}));}
function createAtomAnimation(host,parse) {
  const ns='http://www.w3.org/2000/svg', colors={H:'#dce9fa',O:'#ffaca3',C:'#b6c3d2',N:'#a4c9ff',Fe:'#ffc875',Ca:'#ccb6ed',Cl:'#b9df93',K:'#e9b2df',Mn:'#d6b3df'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  host.innerHTML='<div class="anim-heading"><div><span class="eyebrow">ÁTOMOS EN MOVIMIENTO</span><h4>Así se conserva la materia</h4></div><button type="button" class="secondary" id="atomPlay" disabled>Reproducir</button></div><p id="atomState" role="status" aria-live="polite"></p><svg viewBox="0 0 760 360" role="img" aria-label="Inventario de átomos de reactivos y productos"></svg><p class="anim-note">Cada esfera representa un átomo; los conjuntos se agrupan por sustancia. Es un esquema de conservación, no una representación de enlaces, geometría o mecanismo de reacción.</p>';
  const svg=host.querySelector('svg'), state=host.querySelector('#atomState'), play=host.querySelector('button');
  let frame=0,elapsed=0,last=0,running=false,pairs=[],nodes=[],balanced=false,canDraw=false;
  function node(tag,attrs,text){const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;svg.append(n);return n;}
  function stop(){cancelAnimationFrame(frame);running=false;last=0;}
  function paint(t){const p=Math.min(1,t/3200),ease=p*p*(3-2*p);pairs.forEach((pair,i)=>{const end=pair.to||pair.from;const x=pair.from.x+(end.x-pair.from.x)*ease,y=pair.from.y+(end.y-pair.from.y)*ease-Math.sin(p*Math.PI)*25;nodes[i].setAttribute('transform',`translate(${x} ${y})`)});}
  function tick(time){if(!running)return;if(last)elapsed+=Math.min(time-last,80);last=time;paint(elapsed);if(elapsed>=3200){stop();play.textContent='↻ Repetir';state.textContent='Los mismos átomos ahora están distribuidos entre los productos. La carga total también se conserva.';return}frame=requestAnimationFrame(tick);}
  function start(){if(!balanced||!canDraw)return;if(running){stop();play.textContent='▶ Continuar';return}if(elapsed>=3200)elapsed=0;if(reduced.matches){elapsed=3200;paint(elapsed);play.textContent='↻ Repetir';state.textContent='Distribución final: se conservan todos los átomos y la carga. Movimiento reducido activado.';return}running=true;play.textContent='Ⅱ Pausar';frame=requestAnimationFrame(tick);}
  play.onclick=start;
  reduced.addEventListener('change',()=>{if(running&&reduced.matches){stop();elapsed=3200;paint(elapsed);play.textContent='↻ Repetir';}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();play.textContent='▶ Continuar';}});
  return function update(ex,c,result){
    stop();elapsed=0;pairs=[];nodes=[];svg.replaceChildren();balanced=result.valid&&result.balanced;play.disabled=true;play.textContent='▶ Reproducir';
    if(!result.valid){state.textContent='Introduce coeficientes enteros de 1 a 99 para visualizar los átomos.';svg.style.display='none';return}
    const counts=[ex.left,ex.right].map((fs,side)=>fs.map((f,i)=>Object.values(parse(f).atoms).reduce((a,b)=>a+b,0)*c[i+(side?ex.left.length:0)]));
    canDraw=counts.every(side=>side.every(n=>n<=64));
    if(!canDraw){svg.style.display='none';state.textContent=(balanced?'La ecuación está balanceada. ':'')+'Para mantener las esferas legibles, la animación muestra hasta 64 átomos por sustancia. Reduce los coeficientes; el inventario de arriba sigue mostrando todos los valores exactos.';return}
    svg.style.display='block';
    const l=atomLayout(ex.left,c.slice(0,ex.left.length),true,parse),r=atomLayout(ex.right,c.slice(ex.left.length),false,parse);
    node('text',{x:24,y:16,class:'diagram-title'},'REACTIVOS');node('text',{x:414,y:16,class:'diagram-title'},'PRODUCTOS');node('path',{d:'M380 28 V345',stroke:'#b9c9df','stroke-dasharray':'5 6'});
    [...l.labels,...r.labels].forEach(a=>node('text',{x:a.x,y:a.y,class:'diagram-formula'},a.text.replace(/\^/g,'')));
    function sphere(a,ghost=false){const g=node('g',{transform:`translate(${a.x} ${a.y})`});const circle=document.createElementNS(ns,'circle');circle.setAttribute('r','8');circle.setAttribute('fill',ghost?'#fff':(colors[a.element]||'#dce9fa'));circle.setAttribute('stroke',ghost?'#a5b6ce':'#002b5c');g.append(circle);const text=document.createElementNS(ns,'text');text.setAttribute('text-anchor','middle');text.setAttribute('dy','3');text.setAttribute('font-size','8');text.setAttribute('fill','#002b5c');text.textContent=a.element;g.append(text);return g;}
    r.atoms.forEach(a=>sphere(a,balanced));pairs=atomPairs(l.atoms,r.atoms);nodes=l.atoms.map(a=>sphere(a));
    state.textContent=balanced?(result.minimal?'¡Balance logrado! Observa cómo se conserva cada átomo.':'Está balanceada. La animación conserva los átomos, pero todavía puedes simplificar los coeficientes.'):'Ajusta los coeficientes: las esferas aparecen o desaparecen según el inventario de cada lado. La transformación se habilita al conservar átomos y carga.';
    play.disabled=!balanced;
    if(balanced&&!reduced.matches)start();
  };
}
if(typeof module!=='undefined')module.exports={atomLayout,atomPairs};
