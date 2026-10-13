const $=id=>document.getElementById(id),log=$("log"),inp=$("in");
const pick=a=>a[Math.floor(Math.random()*a.length)],tm=()=>new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
let C=null,H=[];
// 旧バージョン（ひまりのみ）の履歴を引き継ぐ
if(localStorage.getItem("himari-chat")&&!localStorage.getItem("chat-himari")){localStorage.setItem("chat-himari",localStorage.getItem("himari-chat"));localStorage.removeItem("himari-chat")}
function avatar(c,tag){const a=document.createElement(tag||"div");a.className="av";a.style.backgroundImage=`url(${c.img})`;a.style.backgroundSize=c.bg;a.style.backgroundPosition=c.pos;return a}
// キャラ選択
CHARS.forEach(c=>{const b=document.createElement("button");b.className="card";b.dataset.id=c.id;b.style.setProperty("--cc",c.theme.btn);
 b.innerHTML=`<img src="${c.img}" alt=""><div class="c"><b>${c.name}</b><p>${c.intro}</p></div>`;b.onclick=()=>open(c.id);$("cards").append(b)});
function applyTheme(t){const s=$("app").style;for(const k in t)s.setProperty("--"+k,t[k])}
function open(id){C=CHARS.find(c=>c.id===id);localStorage.setItem("last-char",id);applyTheme(C.theme);
 $("hav").replaceWith(Object.assign(avatar(C),{id:"hav"}));$("hname").textContent=C.name;$("sel").hidden=true;$("chat").hidden=false;
 log.innerHTML="";H=JSON.parse(localStorage.getItem("chat-"+id)||"[]");H.length?H.forEach(draw):add("bot",C.hello);inp.focus()}
$("back").onclick=()=>{$("chat").hidden=true;$("sel").hidden=false;C=null};
function draw(m){const d=document.createElement("div");
 if(m.w==="act"){d.className="act";d.textContent=m.t}
 else{d.className="row "+m.w;const b=document.createElement("div");b.className="b";b.textContent=m.t;const s=document.createElement("span");s.className="t";s.textContent=m.at;
 if(m.w==="me")d.append(s,b);else d.append(avatar(C),b,s)}
 log.append(d);log.scrollTop=log.scrollHeight}
function add(w,t,save=true){const m={w,t,at:tm()};if(save){H.push(m);localStorage.setItem("chat-"+C.id,JSON.stringify(H.slice(-200)))}draw(m)}
// ルールエンジン（キャラごとに文脈を保存）／ユーザー情報は全キャラ共通
const ENG={};const MEM=()=>JSON.parse(localStorage.getItem("user-mem")||'{"name":null,"likes":[]}');
const DEPTH=()=>localStorage.getItem("depth")||"normal";
function eng(c){if(!ENG[c.id]){ENG[c.id]=createEngine(c);Object.assign(ENG[c.id].state,JSON.parse(localStorage.getItem("estate-"+c.id)||"{}"))}return ENG[c.id]}
function ruleReply(t){const e=eng(C),mem=MEM(),r=e.reply(t,DEPTH(),mem);localStorage.setItem("user-mem",JSON.stringify(mem));localStorage.setItem("estate-"+C.id,JSON.stringify(e.state));return r}
// ===== AIモード（WebLLM・ブラウザ内） =====
const S=()=>JSON.parse(localStorage.getItem("local-ai")||'{"on":false,"model":"Qwen2.5-0.5B-Instruct-q4f16_1-MLC"}');
let engine=null,engineModel=null,loading=null;
const DP={short:["とても短い返事（1文）",60],normal:["LINEのような短い返事（1〜2文）",150],deep:["少し長めの返事（2〜4文）。自分の話もして、最後に相手への質問を一つ入れる",300]};
function sysPrompt(c){const m=MEM(),d=DP[DEPTH()]||DP.normal,f=(m.name?`ユーザーの名前は「${m.name}」。`:"")+(m.likes.length?`ユーザーの好きなもの：${m.likes.join("、")}。`:"");return `${c.persona}\n${f}\nルール：ユーザーとチャットしている。標準語のカジュアルな日本語だけで、${d[0]}にする。相手の言葉にちゃんと噛み合う返事をする。常にキャラになりきり、AIであることには触れない。フレンドリーで楽しく、性的・過激な内容は扱わず、そういう話題はやんわり別の話にそらす。`}
function prog(show,p,t){$("prog").hidden=!show;if(p!=null)$("pbar").style.width=Math.round(p*100)+"%";if(t)$("ptxt").textContent=t;$("hst").textContent=show?"AI準備中… "+Math.round((p||0)*100)+"%":stLabel()}
async function loadEngine(){const s=S();if(engine&&engineModel===s.model)return engine;if(loading)return loading;
 if(!navigator.gpu)throw Error("このブラウザはWebGPUに対応していません（Chrome/Edge最新版で試してね）");
 loading=(async()=>{try{const webllm=await import("https://esm.run/@mlc-ai/web-llm");prog(true,0,"モデルを準備中…");
  if(engine){await engine.unload();engine=null}
  engine=await webllm.CreateMLCEngine(s.model,{initProgressCallback:r=>prog(true,r.progress,r.text)});engineModel=s.model;prog(false);return engine}
  catch(e){prog(false);engine=null;throw e}finally{loading=null}})();return loading}
async function aiReply(bubble){const eng=await loadEngine(),hist=H.filter(m=>m.w!=="act").slice(-10);
 const st=await eng.chat.completions.create({stream:true,temperature:.8,max_tokens:(DP[DEPTH()]||DP.normal)[1],messages:[{role:"system",content:sysPrompt(C)},...hist.map(m=>({role:m.w==="me"?"user":"assistant",content:m.t}))]});
 let out="";for await(const ch of st){out+=ch.choices[0]?.delta?.content||"";if(bubble){bubble.textContent=out;log.scrollTop=log.scrollHeight}}return out.trim()}
async function bot(t){const c=C,ty=document.createElement("div");ty.className="row bot typing";ty.append(avatar(C));ty.insertAdjacentHTML("beforeend",'<div class="b"><span></span><span></span><span></span></div>');log.append(ty);log.scrollTop=log.scrollHeight;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));let txt,err;
 if(S().on){try{const bub=ty.querySelector(".b");let first=true;
   txt=await aiReply({set textContent(v){if(first){ty.classList.remove("typing");first=false}bub.textContent=v}})}catch(e){err=String(e.message||e).slice(0,90)}}
 else await wait(600+Math.random()*900);
 ty.remove();if(C!==c)return;
 if(err){const d=document.createElement("div");d.className="row bot err";d.innerHTML='<div class="b"></div>';d.firstChild.textContent="⚠️ AIが使えませんでした："+err+"（いつもの返事にするね）";log.append(d)}
 if(!txt){const r=ruleReply(t);if(r.action)add("act",r.action);txt=r.text}add("bot",txt)}
$("f").onsubmit=e=>{e.preventDefault();const t=inp.value.trim();if(!t)return;inp.value="";add("me",t);bot(t)};
$("reset").onclick=()=>{if(confirm(C.name+"との履歴を消しちゃう？")){H=[];localStorage.removeItem("chat-"+C.id);localStorage.removeItem("estate-"+C.id);delete ENG[C.id];log.innerHTML="";add("bot",C.hello)}};
// 設定パネル
const stLabel=()=>S().on?"オンライン・AIモード✨":"オンライン";
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const s=S();$("aion").checked=s.on;$("dp").value=DEPTH();$("am").value=s.model;$("dlg").hidden=false});
$("sclose").onclick=()=>$("dlg").hidden=true;
$("ssave").onclick=()=>{localStorage.setItem("depth",$("dp").value);localStorage.setItem("local-ai",JSON.stringify({on:$("aion").checked,model:$("am").value}));updSt();
 if(S().on)loadEngine().then(()=>{$("ptxt").textContent="準備完了！";$("hst").textContent=stLabel()}).catch(e=>{$("prog").hidden=false;$("ptxt").textContent="⚠️ "+(e.message||e)+" → ルール返信を使います"});else $("dlg").hidden=true};
function updSt(){$("hst").textContent=stLabel()}updSt();
localStorage.removeItem("ai-settings");
