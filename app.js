'use strict';
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
const PROG = {
  PUSH: {
    label:'PUSH', day:'Lundi', emoji:'💪', color:'#FF4D6D',
    trisets:[
      { label:'A', note:'4 tours · 60s repos', exs:[
        {id:'p_a1', name:'Développé couché barre',     target:'4×6-8',   minReps:6, maxReps:8,  incr:2.5},
        {id:'p_a2', name:'Élévations latérales',        target:'3×12-15', minReps:12,maxReps:15, incr:1},
        {id:'p_a3', name:'Extensions triceps poulie',   target:'3×12',    minReps:10,maxReps:12, incr:2.5},
      ]},
      { label:'B', note:'3 tours · 60s repos', exs:[
        {id:'p_b1', name:'Développé incliné haltères',  target:'3×10-12', minReps:10,maxReps:12, incr:2},
        {id:'p_b2', name:'Barre au-dessus de tête',     target:'3×12',    minReps:10,maxReps:12, incr:2.5},
        {id:'p_b3', name:'Dips lestés',                 target:'3×10-12', minReps:10,maxReps:12, incr:2.5},
      ]},
    ],
  },
  PULL: {
    label:'PULL', day:'Mercredi', emoji:'🔗', color:'#4CC9F0',
    trisets:[
      { label:'A', note:'4 tours · 60s repos', exs:[
        {id:'pu_a1', name:'Tractions',                  target:'4×6-8',   minReps:6, maxReps:8,  incr:2.5},
        {id:'pu_a2', name:'Curl biceps haltères',        target:'4×12-15', minReps:12,maxReps:15, incr:1},
        {id:'pu_a3', name:'Tirage poulie haute serrée',  target:'4×10-12', minReps:10,maxReps:12, incr:2.5},
      ]},
      { label:'B', note:'3 tours · 60s repos', exs:[
        {id:'pu_b1', name:'Rowing haltère unilatéral',   target:'3×10-12', minReps:10,maxReps:12, incr:2},
        {id:'pu_b2', name:'Rowing penché haltères',      target:'3×10-12', minReps:10,maxReps:12, incr:2},
        {id:'pu_b3', name:'Curl marteau',                target:'3×12-15', minReps:12,maxReps:15, incr:1},
      ]},
    ],
  },
  LEGS: {
    label:'LEGS', day:'Vendredi', emoji:'⚡', color:'#9B5DE5',
    trisets:[
      { label:'A', note:'4 tours · 60s repos', exs:[
        {id:'l_a1', name:'Squat barre',                  target:'4×6-8',   minReps:6, maxReps:8,  incr:2.5},
        {id:'l_a2', name:'Hip thrust',                   target:'4×12-15', minReps:12,maxReps:15, incr:2.5},
        {id:'l_a3', name:'Mollets debout',               target:'4×15-20', minReps:15,maxReps:20, incr:5},
      ]},
      { label:'B', note:'3 tours · 60s repos', exs:[
        {id:'l_b1', name:'Fentes avant haltères',        target:'3×10-12', minReps:10,maxReps:12, incr:2},
        {id:'l_b2', name:'Romanian Deadlift haltères',   target:'3×10-12', minReps:10,maxReps:12, incr:2},
        {id:'l_b3', name:'Leg curl',                     target:'3×12-15', minReps:12,maxReps:15, incr:2.5},
      ]},
    ],
  },
};
const ALL_EX = Object.values(PROG).flatMap(s => s.trisets.flatMap(t => t.exs));
const DB = {
  get(k, def=null) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):def; } catch { return def; } },
  set(k,v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let workouts = DB.get('ppl_workouts', [{id:'seed1',date:'2025-01-01',session:'PUSH',notes:'Première séance',exercises:{p_a1:{sets:4,reps:8,weight:82},p_a2:{sets:3,reps:12,weight:1},p_a3:{sets:3,reps:12,weight:16.5},p_b1:{sets:3,reps:11,weight:24},p_b2:{sets:3,reps:12,weight:22},p_b3:{sets:3,reps:12,weight:20}}}]);
let meals = DB.get('ppl_meals', []);
let runs = DB.get('ppl_runs', []);
let macroGoals = DB.get('ppl_goals', {cal:2400, prot:185, carbs:240, fat:70});
function saveWorkouts() { DB.set('ppl_workouts', workouts); }
function saveMeals() { DB.set('ppl_meals', meals); }
function saveRuns() { DB.set('ppl_runs', runs); }
function saveGoals() { DB.set('ppl_goals', macroGoals); }
function getReco(exId, sessionKey) {
  const ex = ALL_EX.find(e => e.id === exId);
  if (!ex) return null;
  const hist = workouts.filter(w => w.session === sessionKey && w.exercises?.[exId]);
  if (!hist.length) return null;
  const last = hist[hist.length-1].exercises[exId];
  const w = parseFloat(last.weight), r = parseInt(last.reps), s = parseInt(last.sets);
  if (!w || !r) return null;
  let nextW = w, nextS = s, type = 'hold', msg = '', detail = '';
  if (r >= ex.maxReps) {
    nextW = w + ex.incr; type = 'up';
    msg = `Augmente la charge à ${nextW}kg`;
    detail = `Tu as atteint ${r} reps (objectif max ${ex.maxReps}) — heure de progresser !`;
  } else if (r >= ex.minReps) {
    nextW = w;
    if (s < 4) { nextS = s + 1; msg = `Ajoute une série (→ ${nextS} séries) au même poids`; detail = `Reps dans la cible mais volume encore perfectible.`; }
    else { msg = `Maintiens ${s}×${w}kg, vise ${ex.maxReps} reps propres`; detail = `Tu es dans la cible, consolide avant d'augmenter.`; }
    type = 'hold';
  } else {
    nextW = Math.max(w - ex.incr, 0); type = 'down';
    msg = `Réduis à ${nextW}kg`;
    detail = `Seulement ${r} reps (min ${ex.minReps}) — allège pour garder la forme.`;
  }
  return { type, msg, detail, nextW, nextS, prevW: w, prevR: r, prevS: s };
}
function today() { return new Date().toISOString().split('T')[0]; }
function fmt(n, dec=1) { return parseFloat(n).toFixed(dec).replace(/\.0$/,''); }
function h(tag, attrs={}, ...children) {
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k==='class') el.className=v;
    else if (k==='style' && typeof v==='object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c==null||c===false) continue;
    el.append(typeof c==='string'||typeof c==='number' ? document.createTextNode(c) : c);
  }
  return el;
}
function sparkline(data, color, w=60, ht=22) {
  if (!data||data.length<2) return h('span',{style:{color:'#333',fontSize:'10px'}},'—');
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',w); svg.setAttribute('height',ht);
  const pad=3, mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
  const pts = data.map((v,i)=>`${pad+(i/(data.length-1))*(w-pad*2)},${ht-pad-((v-mn)/rng)*(ht-pad*2)}`).join(' ');
  const line = document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('points',pts); line.setAttribute('fill','none');
  line.setAttribute('stroke',color); line.setAttribute('stroke-width','1.5');
  line.setAttribute('stroke-linecap','round');
  const [lx,ly] = pts.split(' ').pop().split(',');
  const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
  dot.setAttribute('cx',lx); dot.setAttribute('cy',ly); dot.setAttribute('r','2.5');
  dot.setAttribute('fill',color);
  svg.append(line,dot);
  return svg;
}
function ring(val, max, color, size=70) {
  const pct = Math.min(val/max, 1);
  const r=28, circ=2*Math.PI*r, dash=circ*pct;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',size); svg.setAttribute('height',size); svg.setAttribute('viewBox','0 0 70 70');
  const bg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  bg.setAttribute('cx','35'); bg.setAttribute('cy','35'); bg.setAttribute('r',r);
  bg.setAttribute('fill','none'); bg.setAttribute('stroke','#1a1a2e'); bg.setAttribute('stroke-width','5');
  const fg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  fg.setAttribute('cx','35'); fg.setAttribute('cy','35'); fg.setAttribute('r',r);
  fg.setAttribute('fill','none'); fg.setAttribute('stroke',color); fg.setAttribute('stroke-width','5');
  fg.setAttribute('stroke-dasharray',`${dash} ${circ}`); fg.setAttribute('stroke-linecap','round');
  fg.setAttribute('transform','rotate(-90 35 35)');
  svg.append(bg,fg);
  return svg;
}
let currentPage = 'dashboard';
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page===page));
  const content = document.getElementById('page-content');
  content.innerHTML = '';
  const pages = {dashboard:renderDashboard, workout:renderWorkout, nutrition:renderNutrition, running:renderRunning, history:renderHistory};
  const wrap = h('div',{class:'fadein'});
  pages[page](wrap);
  content.append(wrap);
  content.scrollTop = 0;
}
function renderDashboard(root) {
  const todayMeals = meals.filter(m=>m.date===today());
  const todayCal = todayMeals.reduce((a,m)=>a+(m.calories||0),0);
  const todayProt = todayMeals.reduce((a,m)=>a+(m.protein||0),0);
  const todayRuns = runs.filter(r=>r.date===today());
  const last7Workouts = workouts.filter(w=>(new Date()-new Date(w.date))/864e5<=7);
  root.append(h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}},
    h('div',{},
      h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'28px',letterSpacing:'-0.5px'}},'PPL ',h('span',{style:{color:'#FF4D6D'}},'COACH')),
      h('div',{style:{fontSize:'11px',color:'var(--muted)'}},new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))
    ),
    h('div',{style:{width:'42px',height:'42px',borderRadius:'12px',background:'#FF4D6D22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px'}},'🔥')
  ));
  const statsRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}});
  [{v:last7Workouts.length,l:'Séances',sub:'7 derniers jours',c:'#FF4D6D'},{v:`${fmt(todayCal,0)}`,l:'Calories',sub:`/ ${macroGoals.cal} kcal`,c:'#26de81'},{v:todayRuns.length?`${fmt(todayRuns[0].km)}km`:'—',l:'Course',sub:"aujourd'hui",c:'#F7B731'}]
    .forEach(s=>statsRow.append(h('div',{class:'card',style:{padding:'14px 12px'}},h('div',{style:{fontSize:'10px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}},s.l),h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'28px',color:s.c,lineHeight:1}},s.v),h('div',{style:{fontSize:'10px',color:'#2a2a5a',marginTop:'4px'}},s.sub))));
  root.append(statsRow);
  const macroCard = h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  macroCard.append(h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}},h('span',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'14px',letterSpacing:'1px',color:'#26de81'}},'MACROS DU JOUR'),h('span',{style:{fontSize:'11px',color:'var(--muted)'}},'objectif quotidien')));
  const ringsEl = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',textAlign:'center'}});
  const todayCarbs=todayMeals.reduce((a,m)=>a+(m.carbs||0),0), todayFat=todayMeals.reduce((a,m)=>a+(m.fat||0),0);
  [{v:todayCal,max:macroGoals.cal,l:'Calories',c:'#26de81'},{v:todayProt,max:macroGoals.prot,l:'Protéines',c:'#FF4D6D'},{v:todayCarbs,max:macroGoals.carbs,l:'Glucides',c:'#F7B731'},{v:todayFat,max:macroGoals.fat,l:'Lipides',c:'#4CC9F0'}]
    .forEach(m=>{const col=h('div',{});col.append(ring(m.v,m.max,m.c,68));col.append(h('div',{style:{fontSize:'13px',fontWeight:700,fontFamily:'Barlow Condensed',marginTop:'4px'}},`${fmt(m.v,0)}`));col.append(h('div',{style:{fontSize:'9px',color:'var(--muted)',letterSpacing:'0.5px'}},m.l));ringsEl.append(col);});
  macroCard.append(ringsEl); root.append(macroCard);
  root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}},'PROGRESSION MUSCU'));
  Object.values(PROG).forEach(s=>{
    const sh=workouts.filter(w=>w.session===s.label), last=sh[sh.length-1];
    const card=h('div',{class:'card',style:{marginBottom:'12px',overflow:'hidden'}});
    const hdr=h('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderBottom:'1px solid var(--border)'}});
    hdr.append(h('div',{style:{width:'36px',height:'36px',borderRadius:'10px',background:s.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}},s.emoji),h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'16px',color:s.color}},s.label),h('div',{style:{fontSize:'11px',color:'var(--muted)'}},`${s.day} · ${sh.length} séance${sh.length!==1?'s':''}`+(last?` · ${last.date}`:''))),h('button',{style:{padding:'6px 12px',borderRadius:'8px',border:`1px solid ${s.color}44`,background:s.color+'22',color:s.color,fontSize:'11px',fontWeight:700,fontFamily:'Barlow Condensed',letterSpacing:'1px'},onClick:()=>{sessionKey=s.label;navigate('workout');}},'+ LOG'));
    card.append(hdr);
    const allEx=s.trisets.flatMap(t=>t.exs), tbl=h('div',{style:{padding:'8px 14px'}});
    const colHdr=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 62px 62px 90px',gap:'6px',marginBottom:'6px'}});
    ['Exercice','Dernier','Max','Prochaine fois'].forEach(t=>colHdr.append(h('span',{style:{fontSize:'9px',color:'#2a2a5a',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}},t)));
    tbl.append(colHdr);
    allEx.forEach(ex=>{
      const weights=sh.map(ss=>parseFloat(ss.exercises?.[ex.id]?.weight)).filter(Boolean), reco=getReco(ex.id,s.label);
      const row=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 62px 62px 90px',gap:'6px',padding:'6px 0',borderTop:'1px solid #11111f',alignItems:'center'}});
      const recoColor=!reco?'#333':reco.type==='up'?'#4ade80':reco.type==='down'?'#f87171':'#94a3b8';
      row.append(h('span',{style:{fontSize:'11px',color:'#c0c0d8'}},ex.name),h('span',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',color:'#fff'}},reco?`${reco.prevW}kg`:'—'),h('span',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',color:s.color}},weights.length?`${Math.max(...weights)}kg`:'—'),h('span',{style:{fontSize:'11px',fontWeight:700,color:recoColor}},reco?`${reco.type==='up'?'↑':reco.type==='down'?'↓':'→'} ${reco.nextW}kg`:'—'));
      tbl.append(row);
    });
    card.append(tbl); root.append(card);
  });
  if (runs.length) {
    root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',margin:'4px 0 10px'}},'COURSES RÉCENTES'));
    const runCard=h('div',{class:'card',style:{padding:'12px 14px'}});
    runs.slice(-3).reverse().forEach((r,i)=>{
      const row=h('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:i?'8px 0 0':'0',borderTop:i?'1px solid #11111f':'none'}});
      row.append(h('div',{style:{width:'32px',height:'32px',borderRadius:'8px',background:'#F7B73122',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}},'🏃'),h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'14px',color:'#F7B731'}},`${fmt(r.km)} km`),h('div',{style:{fontSize:'10px',color:'var(--muted)'}},r.date)),h('div',{style:{textAlign:'right'}},h('div',{style:{fontSize:'12px',fontWeight:700,color:'#fff'}},r.time||'—'),h('div',{style:{fontSize:'10px',color:'var(--muted)'}},r.feeling||'')));
      runCard.append(row);
    });
    root.append(runCard);
  }
}
let sessionKey='PUSH', workoutInputs={}, workoutDate=today(), workoutNotes='';
function renderWorkout(root) {
  root.append(h('div',{class:'sec-title'},'Logger'));
  root.append(h('div',{class:'sec-sub'},'Encode tes charges — conseils en temps réel'));
  const sessSel=h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'18px'}});
  Object.values(PROG).forEach(s=>{
    sessSel.append(h('button',{style:{padding:'12px 6px',borderRadius:'12px',border:`2px solid ${sessionKey===s.label?s.color:'var(--border)'}`,background:sessionKey===s.label?s.color+'22':'var(--surface)',color:sessionKey===s.label?s.color:'var(--muted)',fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'15px',lineHeight:'1.3',transition:'all 0.2s'},onClick:()=>{sessionKey=s.label;workoutInputs={};navigate('workout');}},s.emoji,h('br',{}),s.label,h('div',{style:{fontFamily:'DM Sans',fontSize:'9px',fontWeight:400,marginTop:'2px',opacity:0.7}},s.day)));
  });
  root.append(sessSel);
  const dateRow=h('div',{style:{display:'flex',gap:'12px',alignItems:'center',marginBottom:'16px'}});
  dateRow.append(h('label',{style:{fontSize:'11px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}},'Date'),h('input',{type:'date',value:workoutDate,style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',padding:'7px 12px',fontSize:'13px',color:'var(--text)',outline:'none'},onInput:e=>workoutDate=e.target.value}));
  root.append(dateRow);
  const prog=PROG[sessionKey], sh=workouts.filter(w=>w.session===sessionKey);
  prog.trisets.forEach(ts=>{
    const tsWrap=h('div',{style:{marginBottom:'14px'}});
    const tsHdr=h('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}});
    tsHdr.append(h('div',{style:{width:'26px',height:'26px',borderRadius:'7px',background:prog.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'13px',color:prog.color}},ts.label),h('span',{style:{fontSize:'11px',color:'var(--muted)'}},ts.note));
    tsWrap.append(tsHdr);
    const card=h('div',{class:'card'});
    const colHdr=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:'6px',padding:'8px 12px',background:'#0a0a14',fontSize:'9px',color:'#2a2a5a',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}});
    ['Exercice','Séries','Reps','Kg'].forEach(t=>colHdr.append(h('span',{style:{textAlign:'center'}},t)));
    colHdr.children[0].style.textAlign='left'; card.append(colHdr);
    ts.exs.forEach((ex,ei)=>{
      const inp=workoutInputs[ex.id]||{}, reco=getReco(ex.id,sessionKey), lastW=sh.length?sh[sh.length-1]?.exercises?.[ex.id]?.weight:null;
      const row=h('div',{style:{borderTop:ei?'1px solid #11111f':'none'}});
      const grid=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:'6px',padding:'10px 12px',alignItems:'center'}});
      grid.append(h('div',{},h('div',{style:{fontSize:'12px',color:'#dde',fontWeight:500}},ex.name),h('div',{style:{fontSize:'9px',color:'#2a2a5a',marginTop:'1px'}},`Cible: ${ex.target}`+(lastW?` · Prev: ${lastW}kg`:''))));
      ['sets','reps','weight'].forEach(f=>{grid.append(h('input',{class:'inp',type:'number',step:f==='weight'?'0.5':'1',placeholder:f==='sets'?'4':f==='reps'?'8':'kg',value:inp[f]||'',onInput:e=>{if(!workoutInputs[ex.id])workoutInputs[ex.id]={};workoutInputs[ex.id][f]=e.target.value;}}));});
      row.append(grid);
      if (reco) {
        const banner=h('div',{class:`reco ${reco.type}`}), icon=reco.type==='up'?'🟢':reco.type==='down'?'🔴':'🟡', col=reco.type==='up'?'#4ade80':reco.type==='down'?'#f87171':'#94a3b8';
        banner.append(h('span',{style:{fontSize:'15px',flexShrink:0}},icon),h('div',{},h('div',{style:{fontWeight:700,fontSize:'11px',color:col}},`Prochaine fois : ${reco.nextS} séries × ${ex.minReps}-${ex.maxReps} reps @ ${reco.nextW}kg`),h('div',{style:{fontSize:'10px',color:'var(--muted)',marginTop:'2px'}},reco.detail)));
        row.append(banner);
      }
      card.append(row);
    });
    tsWrap.append(card); root.append(tsWrap);
  });
  root.append(h('div',{style:{marginBottom:'14px'}},h('label',{style:{display:'block',fontSize:'11px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}},'Notes de séance'),h('textarea',{rows:2,placeholder:'Ressenti, substitutions, PR…',style:{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--text)',padding:'10px 12px',fontSize:'13px',resize:'none',outline:'none'},onInput:e=>workoutNotes=e.target.value},workoutNotes)));
  const saveBtn=h('button',{class:'btn-primary',onClick:()=>{workouts.push({id:Date.now().toString(),date:workoutDate,session:sessionKey,notes:workoutNotes,exercises:JSON.parse(JSON.stringify(workoutInputs))});saveWorkouts();workoutInputs={};workoutNotes='';saveBtn.textContent='✓ SÉANCE ENREGISTRÉE !';saveBtn.style.background='linear-gradient(135deg,#4ade80,#22c55e)';saveBtn.style.boxShadow='0 8px 24px rgba(74,222,128,0.3)';setTimeout(()=>navigate('dashboard'),1200);}},'ENREGISTRER LA SÉANCE');
  root.append(saveBtn);
}
let mealInputs={name:'',calories:'',protein:'',carbs:'',fat:'',date:today()};
function renderNutrition(root) {
  const todayMeals=meals.filter(m=>m.date===today());
  const totCal=todayMeals.reduce((a,m)=>a+(m.calories||0),0), totProt=todayMeals.reduce((a,m)=>a+(m.protein||0),0), totCarbs=todayMeals.reduce((a,m)=>a+(m.carbs||0),0), totFat=todayMeals.reduce((a,m)=>a+(m.fat||0),0);
  root.append(h('div',{class:'sec-title'},'Nutrition'));
  root.append(h('div',{class:'sec-sub'},'Suivi calories & macros · Analyse photo par IA'));
  const ringsCard=h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  const ringRow=h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',textAlign:'center'}});
  [{v:totCal,max:macroGoals.cal,l:'Calories',c:'#26de81'},{v:totProt,max:macroGoals.prot,l:'Protéines',c:'#FF4D6D'},{v:totCarbs,max:macroGoals.carbs,l:'Glucides',c:'#F7B731'},{v:totFat,max:macroGoals.fat,l:'Lipides',c:'#4CC9F0'}]
    .forEach(m=>{const col=h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}});col.append(ring(m.v,m.max,m.c,64));col.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'15px',color:m.v>m.max?'#f87171':'#fff'}},`${fmt(m.v,0)}`));col.append(h('div',{style:{fontSize:'9px',color:'var(--muted)',letterSpacing:'0.5px'}},m.l));col.append(h('div',{style:{fontSize:'9px',color:'#2a2a5a'}},`/ ${m.max}`));ringRow.append(col);});
  ringsCard.append(ringRow); root.append(ringsCard);
  const analyzeCard=h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  analyzeCard.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'#26de81',marginBottom:'10px'}},'📸 ANALYSER UN PLAT PAR PHOTO'));
  analyzeCard.append(h('div',{style:{fontSize:'12px',color:'var(--muted)',marginBottom:'12px'}},"Prends ou importe une photo — l'IA estime les macros automatiquement."));
  const fileInput=h('input',{type:'file',accept:'image/*',capture:'environment',style:{display:'none'}});
  const analyzeBtn=h('button',{style:{width:'100%',padding:'12px',borderRadius:'12px',border:'1px dashed #26de8155',background:'#26de8111',color:'#26de81',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'14px',letterSpacing:'1px'},onClick:()=>fileInput.click()},'📷 IMPORTER UNE PHOTO');
  const resultDiv=h('div',{style:{marginTop:'12px'}});
  fileInput.addEventListener('change',async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    analyzeBtn.textContent='⏳ Analyse en cours…'; analyzeBtn.style.opacity='0.6'; resultDiv.innerHTML='';
    try {
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:file.type,data:b64}},{type:'text',text:'Analyse ce plat et estime les macronutriments. Réponds UNIQUEMENT en JSON valide (sans backticks ni markdown) avec exactement ces champs: {"name":"nom du plat","calories":nombre,"protein":grammes,"carbs":grammes,"fat":grammes,"confidence":"haute/moyenne/basse","tips":"conseil court sur ce repas pour recomposition corporelle"}'}]}]})});
      const data=await resp.json();
      const text=data.content?.map(c=>c.text||'').join('');
      const parsed=JSON.parse(text.replace(/```json|```/g,'').trim());
      resultDiv.append(h('div',{style:{background:'#0a1a0a',border:'1px solid #26de8133',borderRadius:'12px',padding:'14px'}},
        h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'16px',color:'#26de81',marginBottom:'10px'}},parsed.name||'Repas analysé'),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'10px'}},...[{l:'Cal',v:parsed.calories,c:'#26de81'},{l:'Prot',v:parsed.protein,c:'#FF4D6D'},{l:'Gluc',v:parsed.carbs,c:'#F7B731'},{l:'Lip',v:parsed.fat,c:'#4CC9F0'}].map(m=>h('div',{style:{textAlign:'center',background:'#0d0d14',borderRadius:'8px',padding:'8px 4px'}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'18px',color:m.c}},m.v),h('div',{style:{fontSize:'9px',color:'var(--muted)'}},m.l)))),
        parsed.tips&&h('div',{style:{fontSize:'11px',color:'#94a3b8',fontStyle:'italic',marginBottom:'12px'}},`💡 ${parsed.tips}`),
        h('button',{style:{width:'100%',padding:'10px',borderRadius:'10px',background:'#26de81',color:'#000',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px'},onClick:()=>{meals.push({id:Date.now().toString(),date:today(),name:parsed.name||'Repas',calories:parsed.calories||0,protein:parsed.protein||0,carbs:parsed.carbs||0,fat:parsed.fat||0});saveMeals();navigate('nutrition');}},'✓ AJOUTER CE REPAS')
      ));
    } catch(err) { resultDiv.append(h('div',{style:{color:'#f87171',fontSize:'12px',padding:'8px'}},"Erreur d'analyse. Saisis manuellement.")); }
    analyzeBtn.textContent='📷 IMPORTER UNE AUTRE PHOTO'; analyzeBtn.style.opacity='1'; fileInput.value='';
  });
  analyzeCard.append(fileInput,analyzeBtn,resultDiv); root.append(analyzeCard);
  const manualCard=h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  manualCard.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'12px'}},'✏️ SAISIE MANUELLE'));
  [{k:'name',l:'Nom du repas',type:'text',ph:'Riz poulet brocolis'},{k:'calories',l:'Calories (kcal)',type:'number',ph:'500'},{k:'protein',l:'Protéines (g)',type:'number',ph:'40'},{k:'carbs',l:'Glucides (g)',type:'number',ph:'60'},{k:'fat',l:'Lipides (g)',type:'number',ph:'12'}]
    .forEach(f=>{const wrap=h('div',{style:{marginBottom:'10px'}});wrap.append(h('label',{style:{display:'block',fontSize:'10px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'4px'}},f.l),h('input',{class:'inp',type:f.type,placeholder:f.ph,value:mealInputs[f.k]||'',style:{textAlign:'left',padding:'9px 12px'},onInput:e=>mealInputs[f.k]=e.target.value}));manualCard.append(wrap);});
  manualCard.append(h('button',{style:{width:'100%',padding:'12px',borderRadius:'12px',background:'#26de81',color:'#000',fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'14px',letterSpacing:'1px',marginTop:'4px'},onClick:()=>{if(!mealInputs.name)return;meals.push({id:Date.now().toString(),date:today(),name:mealInputs.name,calories:parseFloat(mealInputs.calories)||0,protein:parseFloat(mealInputs.protein)||0,carbs:parseFloat(mealInputs.carbs)||0,fat:parseFloat(mealInputs.fat)||0});saveMeals();mealInputs={name:'',calories:'',protein:'',carbs:'',fat:'',date:today()};navigate('nutrition');}},'AJOUTER LE REPAS'));
  root.append(manualCard);
  if(todayMeals.length){
    root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}},"REPAS D'AUJOURD'HUI"));
    todayMeals.forEach(m=>{const row=h('div',{class:'card',style:{padding:'12px 14px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px'}});row.append(h('div',{style:{flex:1}},h('div',{style:{fontWeight:600,fontSize:'13px'}},m.name),h('div',{style:{fontSize:'10px',color:'var(--muted)',marginTop:'2px'}},`${m.protein}g prot · ${m.carbs}g gl · ${m.fat}g lip`)),h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'16px',color:'#26de81'}},`${m.calories} kcal`),h('button',{style:{background:'none',color:'#f87171',fontSize:'16px',padding:'4px'},onClick:()=>{meals=meals.filter(x=>x.id!==m.id);saveMeals();navigate('nutrition');}},'×'));root.append(row);});
  }
  const goalCard=h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  goalCard.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'12px'}},'⚙️ OBJECTIFS QUOTIDIENS'));
  const goalInputs={...macroGoals}, gGrid=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}});
  [{k:'cal',l:'Calories (kcal)'},{k:'prot',l:'Protéines (g)'},{k:'carbs',l:'Glucides (g)'},{k:'fat',l:'Lipides (g)'}].forEach(f=>{const w=h('div',{});w.append(h('label',{style:{display:'block',fontSize:'9px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'4px'}},f.l),h('input',{class:'inp',type:'number',value:goalInputs[f.k],onInput:e=>goalInputs[f.k]=parseFloat(e.target.value)||0}));gGrid.append(w);});
  goalCard.append(gGrid,h('button',{style:{width:'100%',padding:'10px',borderRadius:'10px',background:'#1a1a2e',border:'1px solid var(--border)',color:'var(--text)',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px'},onClick:()=>{Object.assign(macroGoals,goalInputs);saveGoals();navigate('nutrition');}},'SAUVEGARDER LES OBJECTIFS'));
  root.append(goalCard);
}
let runInputs={date:today(),km:'',time:'',avgHr:'',feeling:'',notes:''};
function renderRunning(root) {
  root.append(h('div',{class:'sec-title'},'Course'));
  root.append(h('div',{class:'sec-sub'},'Suivi de tes sorties running'));
  if(runs.length){
    const totalKm=runs.reduce((a,r)=>a+parseFloat(r.km||0),0), avgKm=totalKm/runs.length, best=Math.max(...runs.map(r=>parseFloat(r.km||0)));
    const statsRow=h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}});
    [{v:`${fmt(totalKm)}`,l:'Total km',c:'#F7B731'},{v:`${fmt(avgKm)}`,l:'Moy. sortie',c:'#F7B731'},{v:`${fmt(best)}`,l:'Meilleure',c:'#FF4D6D'}].forEach(s=>statsRow.append(h('div',{class:'card',style:{padding:'14px 10px',textAlign:'center'}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'24px',color:s.c}},s.v),h('div',{style:{fontSize:'10px',color:'var(--muted)',marginTop:'4px'}},s.l))));
    root.append(statsRow);
    const sparkCard=h('div',{class:'card',style:{padding:'14px 16px',marginBottom:'16px'}});
    sparkCard.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'12px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}},'PROGRESSION'));
    const sp=sparkline(runs.slice(-10).map(r=>parseFloat(r.km||0)),'#F7B731',300,50);
    sp.style.width='100%'; sparkCard.append(sp); root.append(sparkCard);
  }
  const formCard=h('div',{class:'card',style:{padding:'16px',marginBottom:'16px'}});
  formCard.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'#F7B731',marginBottom:'12px'}},'🏃 NOUVELLE SORTIE'));
  const formGrid=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}});
  [{k:'date',l:'Date',type:'date'},{k:'km',l:'Distance (km)',type:'number',ph:'8',step:'0.1'},{k:'time',l:'Durée (mm:ss)',type:'text',ph:'45:30'},{k:'avgHr',l:'FC moy (bpm)',type:'number',ph:'155'}]
    .forEach(f=>{const w=h('div',{});w.append(h('label',{style:{display:'block',fontSize:'10px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'4px'}},f.l),h('input',{class:'inp',type:f.type,placeholder:f.ph||'',step:f.step||'1',value:runInputs[f.k]||'',style:{textAlign:'left',padding:'9px 12px'},onInput:e=>runInputs[f.k]=e.target.value}));formGrid.append(w);});
  formCard.append(formGrid);
  formCard.append(h('div',{style:{fontSize:'10px',color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}},'Ressenti'));
  const feelRow=h('div',{style:{display:'flex',gap:'8px',marginBottom:'12px'}});
  ['😴 Dur','😐 Ok','😊 Bien','🔥 Top'].forEach(f=>{feelRow.append(h('button',{style:{flex:1,padding:'8px 4px',borderRadius:'8px',border:`1px solid ${runInputs.feeling===f?'#F7B731':'var(--border)'}`,background:runInputs.feeling===f?'#F7B73122':'var(--bg)',color:runInputs.feeling===f?'#F7B731':'var(--muted)',fontSize:'11px'},onClick:()=>{runInputs.feeling=f;navigate('running');}},f));});
  formCard.append(feelRow,h('textarea',{rows:2,placeholder:'Notes (parcours, météo…)',style:{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--text)',padding:'10px 12px',fontSize:'13px',resize:'none',outline:'none',marginBottom:'12px'},onInput:e=>runInputs.notes=e.target.value},runInputs.notes||''));
  formCard.append(h('button',{style:{width:'100%',padding:'13px',borderRadius:'12px',background:'linear-gradient(135deg,#F7B731,#e6a52a)',color:'#000',fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'15px',letterSpacing:'1px'},onClick:()=>{if(!runInputs.km)return;runs.push({id:Date.now().toString(),...JSON.parse(JSON.stringify(runInputs))});saveRuns();runInputs={date:today(),km:'',time:'',avgHr:'',feeling:'',notes:''};navigate('running');}},'ENREGISTRER LA SORTIE'));
  root.append(formCard);
  if(runs.length){
    root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'13px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}},'SORTIES RÉCENTES'));
    [...runs].reverse().slice(0,10).forEach(r=>{
      const row=h('div',{class:'card',style:{padding:'12px 14px',marginBottom:'8px'}});
      row.append(h('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},h('div',{style:{width:'36px',height:'36px',borderRadius:'9px',background:'#F7B73122',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}},'🏃'),h('div',{style:{flex:1}},h('div',{style:{display:'flex',alignItems:'baseline',gap:'6px'}},h('span',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'18px',color:'#F7B731'}},`${fmt(r.km)} km`),r.time&&h('span',{style:{fontSize:'12px',color:'var(--muted)'}},r.time)),h('div',{style:{fontSize:'10px',color:'var(--muted)'}},`${r.date}${r.avgHr?' · '+r.avgHr+' bpm':''}${r.feeling?' · '+r.feeling:''}`)),h('button',{style:{background:'none',color:'#f87171',fontSize:'16px',padding:'4px'},onClick:()=>{runs=runs.filter(x=>x.id!==r.id);saveRuns();navigate('running');}},'×')));
      if(r.notes)row.append(h('div',{style:{fontSize:'11px',color:'var(--muted)',marginTop:'6px',fontStyle:'italic'}},r.notes));
      root.append(row);
    });
  }
}
let openHist=null;
function renderHistory(root) {
  root.append(h('div',{class:'sec-title'},'Historique'));
  root.append(h('div',{class:'sec-sub'},`${workouts.length} séances · ${runs.length} courses · ${meals.length} repas`));
  root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'11px',letterSpacing:'1px',color:'var(--muted)',marginBottom:'8px'}},'💪 SÉANCES MUSCU'));
  [...workouts].reverse().slice(0,20).forEach((w,i)=>{
    const s=PROG[w.session], allEx=s.trisets.flatMap(t=>t.exs), isOpen=openHist===`w${i}`;
    const card=h('div',{class:'card',style:{marginBottom:'8px',overflow:'hidden'}});
    const hdr=h('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',cursor:'pointer'},onClick:()=>{openHist=isOpen?null:`w${i}`;navigate('history');}});
    hdr.append(h('div',{style:{width:'32px',height:'32px',borderRadius:'8px',background:s.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}},s.emoji),h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:'14px',color:s.color}},w.session),h('div',{style:{fontSize:'10px',color:'var(--muted)'}},w.date)),h('span',{style:{fontSize:'11px',color:'#2a2a5a'}},isOpen?'▲':'▼'));
    card.append(hdr);
    if(isOpen){const det=h('div',{style:{borderTop:'1px solid var(--border)',padding:'10px 14px'}});allEx.forEach(ex=>{const d=w.exercises?.[ex.id];if(!d||(!d.weight&&!d.reps))return;det.append(h('div',{style:{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #11111f',fontSize:'12px'}},h('span',{style:{color:'#aab'}},ex.name),h('span',{style:{fontFamily:'Barlow Condensed',fontWeight:700,color:s.color}},`${d.sets}×${d.reps} @ ${d.weight}kg`)));});if(w.notes)det.append(h('div',{style:{fontSize:'10px',color:'var(--muted)',marginTop:'6px',fontStyle:'italic'}},`💬 ${w.notes}`));card.append(det);}
    root.append(card);
  });
  if(runs.length){
    root.append(h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'11px',letterSpacing:'1px',color:'var(--muted)',margin:'12px 0 8px'}},'🏃 COURSES'));
    [...runs].reverse().slice(0,10).forEach(r=>{root.append(h('div',{class:'card',style:{padding:'10px 14px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'10px'}},h('span',{style:{fontSize:'16px'}},'🏃'),h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:'14px',color:'#F7B731'}},`${fmt(r.km)} km`),h('div',{style:{fontSize:'10px',color:'var(--muted)'}},r.date+(r.time?` · ${r.time}`:'')+(r.feeling?` · ${r.feeling}`:''))))); });
  }
}
navigate('dashboard');
