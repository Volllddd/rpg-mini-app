/* RPG Mini App. Persistent game state lives in the n8n Data Table. */
const CONFIG={API_URL:'https://lucicccccc.app.n8n.cloud/webhook/rpg-mini-api'};
const tg=window.Telegram&&window.Telegram.WebApp;
const app={page:'today',data:null,demo:false,busy:false,pending:new Set(),mapStage:0};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CAT={discipline:'Дисциплина',knowledge:'Знания',health:'Здоровье',craft:'Мастерство'};
const DIFF={easy:['Лёгкий',10,3],normal:['Средний',25,8],hard:['Сложный',50,15],epic:['Эпический',80,20]};
const DAY={1:'Пн',2:'Вт',3:'Ср',4:'Чт',5:'Пт',6:'Сб',7:'Вс'};
const DAY_NUM={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const weekday=DAY_NUM[new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Kyiv',weekday:'short'}).format(new Date())]||1;
let writes=Promise.resolve();

function levelInfo(x){let n=1,r=Number(x)||0,c=100;while(n<100&&r>=c){r-=c;n++;c=100+(n-1)*25;}return{n,r,c:n===100?0:c};}
function rank(data){let n=(data.quests||[]).filter(q=>q.status==='done').length;return n>=300?'Легенда':n>=150?'Герой':n>=60?'Ветеран':n>=20?'Следопыт':n>=5?'Авантюрист':'Путник';}
function blank(){return{xp:0,gold:0,quests:[],schedules:[],habits:[],goals:[],rewards:[],items:[{id:'rusty-sword',name:'Потёртый дорожный меч',slot:'Оружие',rarity:'Обычный',equipped:true}],skills:{discipline:0,knowledge:0,health:0,craft:0},chronicle:[],missed:[],mode:'normal'};}
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),3000);}
function showError(t){$('#content').innerHTML='<div class="empty-card error-state"><div class="empty-icon">⚠</div>'+esc(t)+'<br><br><button class="action-button" data-action="refresh">Попробовать снова</button></div>';}
function id(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():'r'+Date.now()+Math.random().toString(36).slice(2);}
function daysText(days){return(days||[]).map(Number).sort((a,b)=>a-b).map(n=>DAY[n]).join(' · ')||'Дни не выбраны';}
function live(list){return(list||[]).filter(x=>x.active!==false&&(x.days||[1,2,3,4,5,6,7]).map(Number).includes(weekday));}
async function api(action,fields={}){
 if(app.demo)return demoAction(action,fields);
 if(!tg||!tg.initData)throw Error('Открой мини‑приложение из Telegram.');
 const res=await fetch(CONFIG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(Object.assign({initData:tg.initData,action},fields))});
 let out;try{out=await res.json();}catch{throw Error('n8n вернул не JSON.');}
 if(out.state)app.data=out.state;
 if(!res.ok||out.ok===false)throw Error(out.error||'Не удалось связаться с хроникой.');
 return out;
}
function write(action,fields){const p=writes.then(()=>api(action,fields));writes=p.catch(()=>{});return p;}
function demoAction(a,f){
 const s=app.data,ident=Date.now();
 if(a==='snapshot')return{state:s};
 if(a==='quest_add')s.quests.push({id:ident,title:f.title,difficulty:f.difficulty||'normal',category:f.category||'discipline',due:f.due||'',status:'open',created:today});
 if(a==='schedule_add')s.schedules.push({id:ident,title:f.title,time:f.time,days:f.days,category:f.category,active:true,done:[]});
 if(a==='habit_add')s.habits.push({id:ident,title:f.title,days:f.days,category:f.category,active:true,done:[]});
 if(a==='goal_add')s.goals.push({id:ident,title:f.title,total:4,progress:0,status:'open'});
 if(a==='reward_add')s.rewards.push({id:ident,name:f.name,cost:Number(f.cost)});
 if(a==='quest_done'){let q=s.quests.find(x=>String(x.id)===String(f.id)&&x.status==='open');if(!q)throw Error('Квест уже закрыт.');q.status='done';q.doneDate=today;let d=DIFF[q.difficulty]||DIFF.normal;s.xp+=d[1];s.gold+=d[2];}
 if(a==='schedule_done'){let x=s.schedules.find(y=>String(y.id)===String(f.id));if(x){x.done=x.done||[];if(x.done.includes(today))throw Error('Уже отмечено на сегодня.');x.done.push(today);s.xp+=5;s.gold+=1;}}
 if(a==='habit_done'){let h=s.habits.find(y=>String(y.id)===String(f.id));if(h){h.done=h.done||[];if(h.done.includes(today))throw Error('Сегодня уже отмечено.');h.done.push(today);s.xp+=10;s.gold+=3;}}
 if(a==='schedule_remove'){let x=s.schedules.find(y=>String(y.id)===String(f.id));if(x)x.active=false;}
 if(a==='habit_remove'){let h=s.habits.find(y=>String(y.id)===String(f.id));if(h)h.active=false;}
 if(a==='quest_move'){let q=s.quests.find(y=>String(y.id)===String(f.id));if(q)q.due=tomorrow();}
 if(a==='goal_step'){let g=s.goals.find(y=>String(y.id)===String(f.id));if(g){g.progress++;if(g.progress>=g.total){g.status='done';s.xp+=100;s.gold+=30;s.items.push({id:'boss-'+g.id,name:'Трофей: '+g.title,slot:'Реликвия',rarity:'Редкий'});}}}
 if(a==='equip'){let it=s.items.find(y=>String(y.id)===String(f.id));if(it){s.items.forEach(y=>{if(y.slot===it.slot)y.equipped=false;});it.equipped=true;}}
 if(a==='reward_buy'){let r=s.rewards.find(y=>String(y.id)===String(f.id));if(!r||s.gold<r.cost)throw Error('Не хватает золота.');s.gold-=r.cost;}
 return{state:s};
}
function tomorrow(){let d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function header(){
 const s=app.data,l=levelInfo(s.xp),titles={today:'Сегодня',quests:'Квесты',schedule:'Постоянный график',habits:'Привычки',campaign:'Кампания',map:'Интерактивная карта',skills:'Ветки навыков',achievements:'Достижения',inventory:'Снаряжение'};
 $('#hero-level').textContent=l.n;$('#hero-rank').textContent=rank(s);$('#hero-xp').textContent=l.c?l.r+' / '+l.c+' XP до уровня '+(l.n+1):'Максимальный уровень · '+s.xp+' XP';
 $('#hero-gold').textContent=Number(s.gold)||0;$('#xp-fill').style.width=(l.c?Math.min(100,l.r/l.c*100):100)+'%';
 $('#page-kicker').textContent=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Kiev',weekday:'long',day:'numeric',month:'long'}).format(new Date()).toLocaleUpperCase('ru-RU');
 $('#section-title').textContent=titles[app.page]||'Сегодня';
 const add={today:'＋ Квест',quests:'＋ Квест',schedule:'＋ Запись',habits:'＋ Привычка',campaign:'＋ Кампания',inventory:'＋ Награда'};
 $('#quick-add').textContent=add[app.page]||'';$('#quick-add').hidden=!add[app.page];
}
function questCard(q){
 let d=DIFF[q.difficulty]||DIFF.normal;
 return '<article class="quest-card"><div class="quest-top"><span class="quest-mark">⚔</span><div class="quest-copy"><b>'+esc(q.title)+'</b><p>'+(q.due?'Срок '+esc(q.due)+' · ':'')+esc(CAT[q.category]||'Дисциплина')+' · +'+d[1]+' XP · '+d[2]+' ◈</p></div><span class="badge '+esc(q.difficulty)+'">'+d[0]+'</span></div><div class="card-actions"><button class="action-button" data-action="quest_done" data-id="'+esc(q.id)+'">✓ Выполнено</button><button class="quiet-button" data-action="quest_move" data-id="'+esc(q.id)+'">↗ Завтра</button></div></article>';
}
function scheduleCard(x){
 let done=(x.done||[]).includes(today);
 return '<article class="list-card schedule-card '+(done?'is-done':'')+'"><div class="time-mark">'+esc(x.time||'—')+'</div><div class="list-copy"><b>'+esc(x.title)+'</b><small>'+esc(CAT[x.category]||'Дисциплина')+' · '+daysText(x.days)+'</small></div>'+(done?'<span class="done-mark">✓ Готово</span>':'<button class="action-button" data-action="schedule_done" data-id="'+esc(x.id)+'">Отметить</button>')+'<button class="mini-icon" aria-label="Архивировать" data-action="schedule_remove" data-id="'+esc(x.id)+'">×</button></article>';
}
function habitCard(h){
 let done=(h.done||[]).includes(today);
 return '<article class="list-card habit-card '+(done?'is-done':'')+'"><div class="list-symbol">✧</div><div class="list-copy"><b>'+esc(h.title)+'</b><small>'+esc(CAT[h.category]||'Дисциплина')+' · '+daysText(h.days)+'</small></div>'+(done?'<span class="done-mark">✓ Сегодня</span>':'<button class="action-button" data-action="habit_done" data-id="'+esc(h.id)+'">Отметить</button>')+'<button class="mini-icon" aria-label="Архивировать" data-action="habit_remove" data-id="'+esc(h.id)+'">×</button></article>';
}
function empty(icon,title,body,action,label){
 return '<div class="empty-card"><div class="empty-icon">'+icon+'</div><b>'+esc(title)+'</b><p>'+esc(body)+'</p>'+(action?'<button class="action-button" data-action="'+action+'">'+esc(label||'Добавить')+'</button>':'')+'</div>';
}
function section(label,title,right){return '<div class="section-row"><div><span class="eyebrow">'+label+'</span><h2>'+title+'</h2></div>'+(right||'')+'</div>';}
function todayPage(){
 const s=app.data,quests=s.quests.filter(q=>q.status==='open'&&(!q.due||q.due<=today)),sch=live(s.schedules).sort((a,b)=>String(a.time).localeCompare(String(b.time))),hab=live(s.habits),countDone=a=>a.filter(x=>(x.done||[]).includes(today)).length;
 const date=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Kiev',weekday:'long',day:'numeric',month:'long'}).format(new Date());
 let camp=s.goals.find(g=>g.status==='open');
 $('#content').innerHTML='<section class="welcome-banner"><img src="assets/hero-level-1.png" alt=""><div class="banner-shade"></div><div class="banner-copy"><span class="eyebrow">ПЛАН НА СЕГОДНЯ</span><h2>'+esc(date)+'</h2><p>Небольшие шаги двигают кампанию вперёд.</p></div><span class="banner-mark">✦</span></section>'+
 '<div class="overview-grid"><article><b>'+quests.length+'</b><small>квестов</small></article><article><b>'+countDone(sch)+'/'+sch.length+'</b><small>расписание</small></article><article><b>'+countDone(hab)+'/'+hab.length+'</b><small>привычки</small></article></div>'+
 section('РАЗОВЫЕ ДЕЛА','Квесты дня','<button class="text-link" data-page="quests">Все квесты →</button>')+
 (quests.length?quests.slice(0,3).map(questCard).join(''):empty('⚔','Пока спокойно','Добавь одно дело, которое реально успеешь сегодня.','open_quest','＋ Создать квест'))+
 section('ПОСТОЯННЫЙ РИТМ','Расписание','<button class="text-link" data-page="schedule">Открыть →</button>')+
 (sch.length?sch.slice(0,5).map(scheduleCard).join(''):empty('◷','День ещё не распланирован','Добавь повторяющиеся дела со временем и днями недели.','open_schedule','＋ Добавить запись'))+
 section('РЕГУЛЯРНЫЕ ДЕЙСТВИЯ','Привычки','<button class="text-link" data-page="habits">Открыть →</button>')+
 (hab.length?hab.slice(0,5).map(habitCard).join(''):empty('✧','Начни с одной привычки','Привычка — регулярное действие без времени и привязки к расписанию.','open_habit','＋ Создать привычку'))+
 (camp?'<button class="campaign-peek" data-page="campaign"><span>🗺 Текущая кампания</span><b>'+esc(camp.title)+'</b><small>Глава '+(camp.progress||0)+' из '+(camp.total||4)+' · продолжить путь →</small></button>':'')+
 '<div class="secondary-actions"><button data-action="open_goal">🎯 Начать кампанию</button><button data-action="open_reward">🎁 Лавка наград</button></div>';
}
function questsPage(){
 const s=app.data,openQ=s.quests.filter(q=>q.status==='open'),done=s.quests.filter(q=>q.status==='done').slice(-6).reverse();
 $('#content').innerHTML='<div class="feature-banner feature-quests"><span>⚔</span><div><b>Журнал дел</b><small>Разовые задачи со сроком и наградой. Повторяющиеся — в расписании.</small></div><strong>'+openQ.length+'</strong></div>'+
 section('АКТИВНЫЕ','Открытые квесты','')+(openQ.length?openQ.map(questCard).join(''):empty('⚔','Журнал чист','Создай временную задачу. Отметка выполнения будет прямо в карточке.','open_quest','＋ Новый квест'))+
 (done.length?section('ПОСЛЕДНИЕ ПОБЕДЫ','Завершённые','')+done.map(q=>'<article class="completed-card"><span>✓</span><div><b>'+esc(q.title)+'</b><small>'+esc(q.doneDate||'Выполнено')+' · награда начислена</small></div></article>').join(''):'');
}
function schedulePage(){
 const all=app.data.schedules||[],active=all.filter(x=>x.active!==false).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))),arch=all.filter(x=>x.active===false);
 $('#content').innerHTML='<div class="feature-banner feature-schedule"><span>◷</span><div><b>Постоянный график</b><small>События дня с точным временем и повтором по дням.</small></div><strong>'+active.length+'</strong></div>'+
 section('ВСЕ ПОВТОРЫ','Моё расписание','<button class="text-link" data-action="open_schedule">＋ Запись</button>')+
 (active.length?active.map(scheduleCard).join(''):empty('◷','Расписание пустое','Например: «Просыпаюсь» в 10:00 по будням.','open_schedule','＋ Добавить в расписание'))+
 '<div class="note-card"><span>ⓘ</span><p>Расписание говорит <b>когда</b> происходит дело. Это не привычка и не разовый квест.</p></div>'+
 (arch.length?'<details class="archive-list"><summary>Архив расписания · '+arch.length+'</summary>'+arch.map(x=>'<div class="archive-row">'+esc(x.time||'')+' · '+esc(x.title)+'</div>').join('')+'</details>':'');
}
function habitsPage(){
 const all=app.data.habits||[],active=all.filter(x=>x.active!==false),arch=all.filter(x=>x.active===false),due=live(active),done=due.filter(h=>(h.done||[]).includes(today)).length;
 $('#content').innerHTML='<div class="feature-banner feature-habits"><span>✧</span><div><b>Формирование ритма</b><small>Отмечай действие в выбранные дни. Здесь нет времени выполнения.</small></div><strong>'+done+'/'+due.length+'</strong></div>'+
 section('ТВОИ ПОВТОРЫ','Список привычек','<button class="text-link" data-action="open_habit">＋ Привычка</button>')+
 (active.length?active.map(habitCard).join(''):empty('✧','Привычек пока нет','Выбери действие и целевые дни. Его отметки будут отдельно от расписания.','open_habit','＋ Создать привычку'))+
 '<div class="note-card"><span>ⓘ</span><p>Привычка — <b>что</b> ты хочешь регулярно делать. Для точного времени используй постоянный график.</p></div>'+
 (arch.length?'<details class="archive-list"><summary>Архив привычек · '+arch.length+'</summary>'+arch.map(h=>'<div class="archive-row">'+esc(h.title)+'</div>').join('')+'</details>':'');
}
function goalCard(g){
 const n=Number(g.total)||4,p=Number(g.progress)||0,w=Math.min(100,p/n*100);
 return '<article class="campaign-card"><div class="campaign-card-top"><span class="boss-sigil">♜</span><div><span class="eyebrow">'+(g.status==='done'?'ГЛАВА ЗАВЕРШЕНА':'ЦЕЛЬ КАМПАНИИ')+'</span><h3>'+esc(g.title)+'</h3></div><span class="boss-level">БОСС</span></div><div class="boss-bar"><i style="width:'+w+'%"></i></div><div class="goal-meta"><span>'+(g.status==='done'?'Путь пройден':'Глава '+p+' / '+n)+'</span><span>'+Math.max(0,n-p)+' этапа</span></div>'+(g.status==='open'?'<div class="card-actions"><button class="action-button" data-action="goal_step" data-id="'+esc(g.id)+'">⚔ Отметить реальный шаг</button><button class="quiet-button" data-page="map">Карта пути →</button></div>':'<div class="victory-note">🏆 Босс повержен · трофей в рюкзаке</div>')+'</article>';
}
function campaignPage(){
 const goals=app.data.goals||[],active=goals.filter(g=>g.status==='open'),done=goals.filter(g=>g.status==='done');
 $('#content').innerHTML='<div class="campaign-hero"><div class="campaign-glow"></div><span class="eyebrow">БОЛЬШОЙ ПУТЬ</span><h2>Цель становится ближе<br>с каждым этапом</h2><p>Раздели долгую задачу на главы. Карта покажет путь и босса кампании.</p><button class="gold-button" data-action="open_goal">＋ Начать кампанию</button><button class="ghost-button" data-page="map">Открыть интерактивную карту →</button></div>'+
 (active.length?section('АКТИВНЫЕ МАРШРУТЫ','Твои кампании','')+active.map(goalCard).join(''):empty('🗺','Маршрут ждёт начала','Создай большую цель — путь разделится на главы и финального босса.','open_goal','＋ Начать кампанию'))+
 (done.length?section('ПРОЙДЕННЫЕ ГЛАВЫ','Победы','')+done.map(goalCard).join(''):'');
}
function mapPage(){
 const goals=app.data.goals||[],g=goals.find(x=>x.status==='open')||goals[0],progress=g?Number(g.progress)||0:0,total=g?Number(g.total)||4:4,selected=Math.min(app.mapStage,total);
 const names=['Порог пути','Первый рубеж','Глубокий лес','Крепость','Логово босса'],desc=['Кампания начинается с ясного намерения.','Первый выполненный шаг закрепляет маршрут.','Продолжай движение небольшими действиями.','Последний рубеж перед встречей с боссом.','Финальная глава завершит кампанию и принесёт трофей.'];
 let nodes=names.slice(0,total+1).map((name,i)=>'<button class="map-node '+(i<progress?'cleared ':'')+(i===progress?'current ':'')+(i===total?'boss-node':'')+'" data-map-stage="'+i+'" aria-label="'+esc(name)+'"><span>'+(i===total?'♜':i<progress?'✓':i+1)+'</span><small>'+esc(name)+'</small></button>').join('');
 $('#content').innerHTML=g?'<div class="map-title-card"><span class="eyebrow">МАРШРУТ КАМПАНИИ</span><h2>'+esc(g.title)+'</h2><p>Пройдено '+Math.min(progress,total)+' из '+total+' этапов</p></div>'+
 '<div class="world-map" aria-label="Интерактивная карта"><div class="map-moon"></div><div class="map-mountains"></div><svg class="route-line" viewBox="0 0 360 180" aria-hidden="true"><path d="M30 135 C65 45 100 155 145 90 S225 25 250 100 S300 155 330 42" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="6 8"/></svg><div class="map-nodes">'+nodes+'</div><div class="map-caption"><span>СЕВЕРНЫЙ ТРАКТ</span><b>'+(progress>=total?'Дорога очищена':'Путь впереди')+'</b></div></div>'+
 '<article class="map-detail"><span class="eyebrow">ТОЧКА МАРШРУТА '+(selected+1)+'</span><h3>'+esc(names[selected]||'Новая глава')+'</h3><p>'+esc(desc[selected]||'Продолжай путь шаг за шагом.')+'</p>'+(selected===progress&&g.status==='open'&&selected<total?'<button class="action-button" data-action="goal_step" data-id="'+esc(g.id)+'">⚔ Закрыть текущий этап</button>':'')+(selected===total&&g.status==='done'?'<span class="done-mark">🏆 Победа</span>':'')+'</article>'+
 (goals.length>1?section('ДРУГИЕ МАРШРУТЫ','Кампании','')+goals.map(x=>'<button class="map-campaign-link" data-map-goal="'+esc(x.id)+'"><span>🗺</span><b>'+esc(x.title)+'</b><small>'+(x.progress||0)+'/'+(x.total||4)+'</small></button>').join(''):'')
 :empty('⌖','Здесь появится твой мир','Начни кампанию, и карта покажет главы и путь к боссу.','open_goal','＋ Создать кампанию');
}
function skillsPage(){
 const values=app.data.skills||{},branches=[
 {key:'discipline',icon:'🛡',title:'Стойкость',desc:'ритм, ответственность и последовательность',nodes:['Первый шаг','Верность плану','Сила привычки','Надёжный оплот']},
 {key:'knowledge',icon:'📜',title:'Мудрость',desc:'учёба, чтение и развитие знаний',nodes:['Любопытство','Ученик','Исследователь','Хранитель знаний']},
 {key:'health',icon:'🌿',title:'Жизненная сила',desc:'забота о здоровье и восстановлении',nodes:['Искра','Равновесие','Выносливость','Крепкий дух']},
 {key:'craft',icon:'⚒',title:'Мастерство',desc:'навыки, ремесло и работа над проектами',nodes:['Подмастерье','Практика','Мастерская','Искусный мастер']}
 ];
 $('#content').innerHTML='<div class="feature-banner feature-skills"><span>⚒</span><div><b>Дерево развития</b><small>Опыт направления постепенно открывает следующие узлы.</small></div></div>'+branches.map(b=>{
  const xp=Number(values[b.key])||0,unlocked=Math.min(b.nodes.length,Math.floor(xp/25)),inside=xp%25;
  return '<article class="skill-branch"><div class="skill-heading"><span class="skill-emblem">'+b.icon+'</span><div><h2>'+b.title+'</h2><small>'+b.desc+'</small></div><span class="branch-level">УР. '+(1+Math.floor(xp/100))+'</span></div><div class="skill-path">'+b.nodes.map((n,i)=>'<div class="skill-node '+(i<unlocked?'unlocked ':'')+(i===unlocked?'next':'')+'"><span>'+(i<unlocked?'✓':i+1)+'</span><small>'+n+'</small></div>').join('')+'</div><div class="skill-track"><i style="width:'+Math.min(100,inside/25*100)+'%"></i></div><div class="skill-foot"><span>'+xp+' мастерства</span><span>'+(25-inside)+' до следующего узла</span></div></article>';
 }).join('')+'<div class="note-card"><span>ⓘ</span><p>Опыт навыка начисляется за выполненные квесты подходящего направления. Это игровой прогресс, а не медицинская оценка.</p></div>';
}
function stats(){
 const s=app.data,done=(s.quests||[]).filter(q=>q.status==='done'),dates=new Set([...done.map(q=>q.doneDate),...(s.habits||[]).flatMap(h=>h.done||[]),...(s.schedules||[]).flatMap(x=>x.done||[])].filter(Boolean));
 let streak=0,d=new Date(today+'T12:00:00Z');if(!dates.has(today))d.setUTCDate(d.getUTCDate()-1);
 while(streak<365&&dates.has(d.toISOString().slice(0,10))){streak++;d.setUTCDate(d.getUTCDate()-1);}
 return{quests:done.length,goals:(s.goals||[]).filter(g=>g.status==='done').length,habitDays:new Set((s.habits||[]).flatMap(h=>h.done||[])).size,days:dates.size,streak,items:Math.max(0,(s.items||[]).length-1),skills:s.skills||{}};
}
function achievementsPage(){
 const st=stats(),list=[
 ['🗡','Первый шаг','Заверши первый временный квест.',st.quests,1],
 ['⚔','Десяток дел','Заверши 10 временных квестов.',st.quests,10],
 ['✧','Ритм укоренился','Отметь привычки в 3 разные даты.',st.habitDays,3],
 ['🌅','Неделя движения','Сделай хотя бы один шаг 7 дней подряд.',st.streak,7],
 ['🐉','Повелитель босса','Заверши первую кампанию.',st.goals,1],
 ['🧭','Путь исследователя','Сделай отметки в 14 разные даты.',st.days,14],
 ['🎒','Первая находка','Получи предмет в инвентарь.',st.items,1],
 ['⚒','Ветвь силы','Набери 100 опыта в любой ветке.',Math.max(0,...Object.values(st.skills).map(Number)),100]
 ];
 const unlocked=list.filter(x=>x[3]>=x[4]).length;
 $('#content').innerHTML='<div class="feature-banner feature-achievements"><span>🏅</span><div><b>Знаки пройденного пути</b><small>Достижения появляются за действия и устойчивый прогресс.</small></div><strong>'+unlocked+'/'+list.length+'</strong></div><div class="achievement-grid">'+list.map(x=>{
  let yes=x[3]>=x[4],percent=Math.min(100,x[3]/x[4]*100);
  return '<article class="achievement-card '+(yes?'unlocked':'')+'"><div class="achievement-icon">'+x[0]+'</div><div class="achievement-body"><b>'+x[1]+'</b><p>'+x[2]+'</p><div class="achievement-progress"><i style="width:'+percent+'%"></i></div><small>'+(yes?'Получено':Math.min(x[3],x[4])+' / '+x[4])+'</small></div><span class="lock-mark">'+(yes?'✓':'◇')+'</span></article>';
 }).join('')+'</div><div class="note-card"><span>ⓘ</span><p>Достижения основаны на отметках в приложении и не обещают медицинский или иной внешний результат.</p></div>';
}
function inventoryPage(){
 const s=app.data,items=s.items||[],slots=['Оружие','Броня','Плащ','Реликвия'],rewards=s.rewards||[];
 $('#content').innerHTML='<div class="gear-banner"><div><span class="eyebrow">АРСЕНАЛ ПУТНИКА</span><h2>Снаряжение меняется<br>по мере пути</h2><p>Находки редки и значимы. Экипируй то, что заработал.</p></div><img src="assets/hero-level-1.png" alt="Персонаж"></div>'+section('ЭКИПИРОВКА','Активные слоты','')+
 '<div class="gear-grid">'+slots.map(slot=>{let item=items.find(x=>x.slot===slot&&x.equipped);return '<article class="gear-slot '+(item?'occupied':'')+'"><div class="gear-icon">'+(slot==='Оружие'?'⚔':slot==='Броня'?'⛨':slot==='Плащ'?'♜':'✧')+'</div><small>'+slot+'</small><b>'+(item?esc(item.name):'Пустой слот')+'</b>'+(item?'<span class="rarity">'+esc(item.rarity||'Обычный')+'</span>':'')+'</article>';}).join('')+'</div>'+
 (items.filter(i=>!i.equipped).length?section('СОБРАННЫЕ ВЕЩИ','Рюкзак','')+items.filter(i=>!i.equipped).map(i=>'<article class="list-card"><span class="list-symbol">✧</span><div class="list-copy"><b>'+esc(i.name)+'</b><small>'+esc(i.slot)+' · '+esc(i.rarity||'Находка')+'</small></div><button class="action-button" data-action="equip" data-id="'+esc(i.id)+'">Надеть</button></article>').join(''):empty('🎒','Рюкзак пока лёгкий','Трофеи кампаний и вехи уровня будут пополнять его постепенно.'))+
 section('ЛИЧНЫЕ ПООЩРЕНИЯ','Лавка наград','<button class="text-link" data-action="open_reward">＋ Добавить</button>')+'<div class="gold-balance">Твой баланс <b>◈ '+(Number(s.gold)||0)+'</b></div>'+
 (rewards.length?rewards.map(r=>'<article class="list-card reward-card"><span class="list-symbol">✦</span><div class="list-copy"><b>'+esc(r.name)+'</b><small>Настоящая награда за накопленный путь</small></div><button class="action-button" data-action="reward_buy" data-id="'+esc(r.id)+'">'+esc(r.cost)+' ◈</button></article>').join(''):empty('✦','Лавка пуста','Добавь небольшое поощрение, которое захочется заработать.','open_reward','＋ Добавить награду'));
}
function render(){
 if(!app.data)return;header();
 const pages={today:todayPage,quests:questsPage,schedule:schedulePage,habits:habitsPage,campaign:campaignPage,map:mapPage,skills:skillsPage,achievements:achievementsPage,inventory:inventoryPage};
 (pages[app.page]||todayPage)();
 $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===app.page));
 $$('.utility-item').forEach(x=>x.classList.toggle('active',x.dataset.page===app.page));
}
async function refresh(){if(app.busy)return;app.busy=true;$('#refresh').disabled=true;try{if(!tg||!tg.initData){app.demo=true;app.data=app.data||blank();}else{app.demo=false;await api('snapshot');}render();if(app.demo)toast('Предпросмотр · запись пока не сохраняется');}catch(e){showError(e.message);toast(e.message);}finally{app.busy=false;$('#refresh').disabled=false;}}
function open(id){let d=$(id);if(d&&!d.open)d.showModal();}
function formSubmit(form,action,fields,message,after){
 if(form.dataset.locked==='1')return;form.dataset.locked='1';
 const btn=form.querySelector('[type=submit]'),old=btn.textContent,token=form.querySelector('[name=requestId]');
 if(token&&!token.value)token.value=id();
 btn.disabled=true;btn.textContent='Сохраняю…';
 write(action,Object.assign({},fields,{requestId:token?token.value:id()})).then(result=>{form.reset();if(token)token.value='';form.closest('dialog').close();if(after)after();render();toast(result&&result.duplicate?'Такая запись уже есть — второй экземпляр не создан.':message);}).catch(e=>toast(e.message)).finally(()=>{form.dataset.locked='0';btn.disabled=false;btn.textContent=old;});
}
function act(action,ident,button){
 let key=action+':'+(ident||'');if(app.pending.has(key))return;app.pending.add(key);if(button)button.disabled=true;
 const fields={};if(ident!==undefined)fields.id=ident;if(action==='quest_move')fields.due=tomorrow();
 write(action,fields).then(()=>{render();toast(({quest_done:'Квест завершён: опыт и золото начислены.',quest_move:'Квест перенесён на завтра.',schedule_done:'Пункт расписания отмечен.',habit_done:'Привычка отмечена.',goal_step:'Этап кампании сохранён.',reward_buy:'Награда приобретена.',equip:'Предмет экипирован.',schedule_remove:'Запись перенесена в архив.',habit_remove:'Привычка перенесена в архив.'})[action]||'Изменения сохранены.');}).catch(e=>toast(e.message)).finally(()=>{app.pending.delete(key);if(button)button.disabled=false;});
}
$$('.modal').forEach(d=>{d.querySelector('.close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d)d.close();});d.addEventListener('close',()=>{let f=d.querySelector('form');if(f&&f.dataset.locked!=='1'){f.reset();let t=f.querySelector('[name=requestId]');if(t)t.value='';}});});
document.addEventListener('click',e=>{
 let p=e.target.closest('[data-page]');if(p){app.page=p.dataset.page;render();return;}
 let node=e.target.closest('[data-map-stage]');if(node){app.mapStage=Number(node.dataset.mapStage)||0;mapPage();return;}
 let mg=e.target.closest('[data-map-goal]');if(mg){let g=(app.data.goals||[]).find(x=>String(x.id)===String(mg.dataset.mapGoal));if(g)app.mapStage=Number(g.progress)||0;mapPage();return;}
 let b=e.target.closest('[data-action]');if(!b)return;let a=b.dataset.action,ident=b.dataset.id;
 if(a==='open_quest')return open('#quest-dialog');if(a==='open_schedule')return open('#schedule-dialog');if(a==='open_habit')return open('#habit-dialog');if(a==='open_goal')return open('#goal-dialog');if(a==='open_reward')return open('#reward-dialog');if(a==='refresh')return refresh();
 act(a,ident,b);
});
$('#quick-add').addEventListener('click',()=>open(({schedule:'#schedule-dialog',habits:'#habit-dialog',campaign:'#goal-dialog',inventory:'#reward-dialog'})[app.page]||'#quest-dialog'));
$('#refresh').addEventListener('click',refresh);
$('#quest-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget);formSubmit(e.currentTarget,'quest_add',{title:f.get('title'),difficulty:f.get('difficulty'),category:f.get('category'),due:f.get('due')},'Квест добавлен в журнал.');});
$('#schedule-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget),days=f.getAll('days').map(Number);if(!days.length)return toast('Выбери хотя бы один день.');formSubmit(e.currentTarget,'schedule_add',{title:f.get('title'),time:f.get('time'),days,category:f.get('category')},'Запись добавлена в расписание.');});
$('#habit-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget),days=f.getAll('days').map(Number);if(!days.length)return toast('Выбери хотя бы один целевой день.');formSubmit(e.currentTarget,'habit_add',{title:f.get('title'),category:f.get('category'),days},'Привычка добавлена отдельно от расписания.');});
$('#goal-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget);formSubmit(e.currentTarget,'goal_add',{title:f.get('title')},'Кампания началась.',()=>{app.page='campaign';});});
$('#reward-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget);formSubmit(e.currentTarget,'reward_add',{name:f.get('name'),cost:f.get('cost')},'Награда добавлена в лавку.');});
if(tg){tg.ready();tg.expand();tg.setHeaderColor&&tg.setHeaderColor('#101a2b');tg.setBackgroundColor&&tg.setBackgroundColor('#101a2b');}
refresh();
