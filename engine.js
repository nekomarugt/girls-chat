// ===== ルールベース会話エンジン（文脈・記憶つき） =====
(function(G){
const NORM=[[/[！!]/g,"！"],[/[?？]/g,"？"],[/\s+/g,""],[/ほんま/g,"本当"],[/なんや/g,"何"],[/してんの/g,"してるの"],[/しとる/g,"してる"],[/しよる/g,"してる"],[/どない/g,"どう"],[/おもろい/g,"面白い"],[/あかん/g,"だめ"],[/ちゃう/g,"違う"],[/わからん/g,"わからない"],[/知らん/g,"知らない"],[/しらん/g,"知らない"],[/やねん|なんよ|やで|やん|やろ/g,"だよ"],[/なに/g,"何"],[/ナニ/g,"何"]];
function norm(t,c){t=t.normalize("NFKC").replace(/[?]/g,"？").replace(/[!]/g,"！");for(const [a,b] of NORM)t=t.replace(a,b);
 for(const n of c.calls)t=t.replace(new RegExp("^"+n+"(ちゃん|さん)?(は|って|も|、)?"),"").replace(new RegExp("(ちゃん|さん)?"+n+"$"),"");return t}
const FAV={food:/食べ|たべ|料理|ご飯|ごはん|フード|食い/,drink:/飲み|のみもの|ドリンク/,color:/色/,music:/音楽|曲|歌|アーティスト/,animal:/動物|生き物/,place:/場所|ところ|とこ/,season:/季節/,game:/ゲーム/,movie:/映画|アニメ|本|漫画/};
// 意図（上から優先）
const INTENTS=[
["myname",t=>/(私|僕|俺|わたし|ぼく|おれ|うち|自分)の名前(覚えて|わか|知って|は？|何)/.test(t)],
["setname",t=>/(?:私|僕|俺|わたし|ぼく|おれ|うち|自分)?の?名前は(.{1,10}?)(?:です|だよ|だ|っていう|って言う)?(?:よ|ね)?[。！]?$/.test(t)&&!/？/.test(t)||/^(.{1,10}?)って呼んで/.test(t)],
["mylikes",t=>/(私|僕|俺|わたし|ぼく|おれ|うち)の好きな(もの|こと)/.test(t)],
["clarify",t=>/^(何が|どういうこと|どういう意味|どゆこと|え？|は？|ん？|何の話|何のこと|というと|つまり？?)[？]*$/.test(t)],
["bye",t=>/おやすみ|ばいばい|バイバイ|またね|じゃあね|じゃね|寝るね|もう寝る|落ちる/.test(t)],
["greet",t=>/^(おはよ|こんにち|こんばん|やっほ|やあ|ハロー|hello|hi|ただいま|はじめまして|よろしく)/i.test(t)],
["imfine",t=>/^(元気|げんき|まあまあ|普通|ふつう|絶好調)(だよ|です|かな|！)*$/.test(t)],
["howareyou",t=>/元気|げんき|調子どう|調子は|大丈夫？|体調/.test(t)&&/？$|(元気|げんき)(なの|してる|してた|か)$|調子どう$/.test(t)],
["whatdoing",t=>/何して|何やって|普段|いつも何|休み(の日)?(は|って)?何|暇な時|ひまなとき|最近どう|今何/.test(t)],
["hobby",t=>/趣味/.test(t)],
["fav",t=>/好きな.{0,8}(は|って|ある|何|教え)|何が好き|好きなもの/.test(t)],
["dislike",t=>/苦手|嫌いな.{0,6}(は|ある|何)/.test(t)],
["name",t=>/名前|誰|だれ|自己紹介|何者/.test(t)],
["age",t=>/何歳|年齢|いくつ|歳は|年は/.test(t)],
["where",t=>/どこ(に住|住ん|出身|にいる|いる|から)|住んでる/.test(t)],
["likeme",t=>/(私|僕|俺|わたし|ぼく|おれ|うち)のこと(好き|どう思)/.test(t)],
["setlike",t=>/(.{1,12}?)が(大)?好き(なんだ|です|だよ|だ|なの)?[。！]*$/.test(t)&&!/？/.test(t)],
["insult",t=>/バカ|ばか|アホ|あほ|嫌い|きらい|うざ|ブス|最低|つまらない|つまんない|キモ|きも/.test(t)],
["praise",t=>/かわいい|可愛い|かっこいい|カッコいい|すごい|天才|優しい|やさしい|きれい|綺麗|^(好き|大好き)(だよ|です)?[！]*$|最高だね/.test(t)],
["sorry",t=>/ごめん|すまん|すみません|悪かった/.test(t)],
["thanks",t=>/ありがと|感謝|サンキュー|thx/i.test(t)],
["activity",t=>/(して(た|る|きた)|やって(た|る)|行って(た|きた)|見て(た|る)|遊んで(た|る)|読んで(た|る)|聴いて(た|る))[。！]*$/.test(t)&&!/？/.test(t)],
["sad",t=>/悲し|かなし|つらい|辛い|泣|さみし|寂し|落ち込|しんどい|病む|凹/.test(t)],
["tired",t=>/疲れ|つかれ|眠|ねむ|だるい|ヘトヘト|へとへと/.test(t)],
["work",t=>/仕事|会社|勉強|宿題|テスト|残業|上司|学校|バイト|試験/.test(t)],
["food",t=>/ご飯|ごはん|食べ|お腹|おなか|腹減|ラーメン|ケーキ|お菓子|スイーツ|カレー|寿司|ランチ|おやつ/.test(t)],
["weather",t=>/天気|雨|晴れ|暑|寒|雪|台風/.test(t)],
["animal",t=>/猫|ねこ|ネコ|犬|いぬ|イヌ|動物|ペット/.test(t)],
["happy",t=>/楽し|うれし|嬉し|やった|最高|いいことあった/.test(t)],
["laugh",t=>/笑|ｗ|w{1,}$|草$|ははは|あはは|ふふ/.test(t)],
["dontknow",t=>/^(わからない|わかんない|知らない|さあ|なんとも|うーん|んー|別に|べつに)/.test(t)],
["why",t=>/^(なんで|何で|どうして|なぜ)[？]*$/.test(t)],
["aizuchi",t=>/^(うん|うんうん|へー|へぇ|へえ|そうなんだ|そうなの|なるほど|ふーん|まじ|マジ|本当|ほんと|そっか|そうか|おー|いいね|せやな|そうだね|たしかに|確かに|わかる|ええ|はい|それな)[。！ー～〜]*$/.test(t)]];
function detect(t){for(const [k,f] of INTENTS)if(f(t))return k;return null}
const QTOPIC={food:"food",drink:"food",music:"hobby",game:"hobby",movie:"hobby",animal:"animal"};
function hourSlot(h){return h<5?"night":h<11?"morning":h<17?"day":h<23?"evening":"night"}
function createEngine(c){
 const S={recent:[],lastQ:null,lastTopic:null,lastBot:"",lastIntent:null,actCool:0};
 const pk=(a)=>{a=[].concat(a).filter(Boolean);const f=a.filter(x=>!S.recent.includes(x));const r=(f.length?f:a)[Math.floor(Math.random()*(f.length?f:a).length)];S.recent.push(r);if(S.recent.length>30)S.recent.shift();return r};
 const pkNew=a=>{const f=a.filter(x=>!S.recent.includes(x));return f.length?pk(f):null};
 function reply(raw,depth,mem,now){depth=depth||"normal";now=now||new Date();const t=norm(raw,c),R=c.r;let keepQ=null,it=detect(t),main,topic=null,ask=null,share=null,why="fb";
  const U=mem.name?c.addr(mem.name):c.you;const fill=s=>s.replace(/\{u\}/g,U).replace(/\{prev\}/g,S.lastBot.split(/[。\n]/)[0].slice(0,22)).replace(/\{like\}/g,mem.likes[0]||"");
  if(S.lastQ&&S.lastQ.topic==="name"&&(!it||it==="setname")&&t.length<=12){const n=t.replace(/^(私|僕|俺|わたし|ぼく|おれ|うち)は?/,"").replace(/(です|だよ|だ|って言います|っていう|って呼んで)?[。！]*$/,"");if(n){mem.name=n;S.lastQ=null;const m=pk(R.setName).replace(/\{n\}/g,c.addr(n));S.lastBot=m;S.lastWhy="react";return {text:m,action:null,intent:"setname"}}}
  // 彼女の質問への返事
  if(S.lastQ&&(!it||["aizuchi","dontknow","setlike","laugh"].includes(it)||it===S.lastQ.topic||S.lastQ.topic==="mood"&&["happy","tired","sad","imfine"].includes(it))){
   const tp=S.lastQ.topic;let lm;if(it==="setlike"&&(lm=t.match(/(.{1,12}?)が(大)?好き/))){addLike(mem,lm[1]);main=pk(R.likeIt).replace("{x}",lm[1])}
   else if(it==="dontknow")main=pk(R.reactUnsure);else if(it==="sad"||it==="tired")main=pk(R[it]);else if(tp==="mood"&&/元気|げんき|まあまあ|普通|ふつう/.test(t))main=pk(R.react.mood);else main=pk(R.react[tp]||R.react.general);
   topic=tp;share=R.share[tp];ask=null;S.lastQ=null;it="answer";why="react"}
  else switch(it){
   case "myname":main=mem.name?pk(R.recallName):pk(R.recallNone);ask=mem.name?null:{t:pk(R.askName),topic:"name",force:1};break;
   case "setname":{const m=t.match(/名前は(.{1,10}?)(?:です|だよ|だ|っていう|って言う)?(?:よ|ね)?[。！]?$/)||t.match(/^(.{1,10}?)って呼んで/);mem.name=m[1].replace(/(です|だよ|だ)$/,"");main=pk(R.setName).replace(/\{n\}/g,c.addr(mem.name));break}
   case "mylikes":main=mem.likes.length?pk(R.recallLikes).replace("{x}",mem.likes.slice(0,3).join("と")):pk(R.recallNoLikes);if(!mem.likes.length)ask={t:pk(R.ask.general),topic:"general"};break;
   case "clarify":
    if(S.lastQ){main=pk(R.clarifyQ).replace("{q}",S.lastQ.t.replace(/[？?]$/,""));ask=null;keepQ=S.lastQ}
    else if(S.lastBot){main=fill(pk(R.clarify))+(R.why[S.lastWhy]?pk(R.why[S.lastWhy]):pk(R.why.fb));}
    else main=pk(R.q);it="clarify";break;
   case "greet":if(/^ただいま/.test(t))main=pk(R.welcome);else{const sl=hourSlot(now.getHours());main=pk(R.greet[sl]);if(/^おはよ/.test(t)&&sl==="evening"||/^おはよ/.test(t)&&sl==="night")main=pk(R.greetLate)}
    if(mem.name&&Math.random()<.5)main=c.addr(mem.name)+"、"+main;ask={t:pk(R.ask.routine),topic:"routine"};break;
   case "bye":main=pk(R.bye);break;
   case "howareyou":main=pk(R.howareyou);ask={t:pk(R.askBack),topic:"mood"};why="self";break;
   case "whatdoing":main=pk(R.whatdoing);share=R.share.routine;ask={t:pk(R.ask.routine),topic:"routine"};why="self";break;
   case "hobby":main=pk(R.hobby);share=R.share.hobby;ask={t:pk(R.ask.hobby),topic:"hobby"};why="self";break;
   case "fav":{let k="default";for(const f in FAV)if(FAV[f].test(t)){k=f;break}main=pk(R.fav[k]||R.fav.default);topic=QTOPIC[k]||"general";ask={t:pk(R.ask[topic]||R.ask.general),topic};why="self";break}
   case "dislike":main=pk(R.dislike);why="self";ask={t:pk(R.ask.general),topic:"general"};break;
   case "name":main=pk(R.name);why="self";if(!mem.name)ask={t:pk(R.askName),topic:"name",force:1};break;
   case "age":main=pk(R.age);why="self";break;
   case "where":main=pk(R.where);why="self";break;
   case "likeme":main=pk(R.likeme);break;
   case "insult":main=pk(R.insult);break;
   case "praise":main=pk(R.praise);break;
   case "activity":main=pk(R.activity);ask={t:pk(R.askActivity),topic:"general"};break;
   case "sorry":main=pk(R.sorry);break;
   case "thanks":main=pk(R.thanks);break;
   case "setlike":{const m=t.match(/(.{1,12}?)が(大)?好き/);addLike(mem,m[1]);main=pk(R.likeIt).replace("{x}",m[1]);ask={t:pk(R.askLike).replace("{x}",m[1]),topic:"general"};break}
   case "why":main=S.lastQ?pk(R.whyAsk):S.lastBot?fill(pk(R.clarify))+pk(R.why[S.lastWhy]||R.why.fb):pk(R.q);break;
   case "laugh":case "dontknow":case "aizuchi":main=pk(R[it]);if(it!=="laugh"||Math.random()<.5){const tp=S.lastTopic&&R.ask[S.lastTopic]?S.lastTopic:"general";ask={t:pk(R.ask[tp]),topic:tp}}break;
   case "weather":main=pk(R.weather[/雨|台風/.test(t)?"rain":/暑/.test(t)?"hot":/寒|雪/.test(t)?"cold":"other"]);topic="weather";ask={t:pk(R.ask.weather),topic:"weather"};break;
   case "imfine":main=pk(R.react.mood);break;
   case "sad":case "tired":case "work":case "food":case "animal":case "happy":
    main=pk(R[it]);topic=it;share=R.share[it];ask=R.ask[it]?{t:pk(R.ask[it]),topic:it}:null;break;
   default:{
    if(/？$/.test(t)){main=pk(R.q);why="q"}
    else{const x=t.replace(/[。！？、]+$/,"").replace(/(んだ|なんだ|です|だよ|だね|よね|よ|ね|かな)$/,"");
     main=x.length>=2&&x.length<=14&&!/(た|てる|する|い|だ|る|ない|けど|から)$/.test(x)?pk(R.echo).replace("{x}",x):pk(R.listen)}
    if(mem.likes.length&&Math.random()<.15)ask={t:pk(R.recallAsk).replace("{x}",mem.likes[Math.floor(Math.random()*mem.likes.length)]),topic:"general"};
    else ask={t:pk(R.ask.general),topic:"general"}}}
  // 深さで組み立て
  const parts=[fill(main)];
  if(depth==="deep"){const sh=share&&pkNew(share);if(sh)parts.push(sh);if(ask)parts.push(ask.t);else if(!["bye","praise","insult","sorry","thanks","laugh","clarify","why","likeme"].includes(it)){topic=null;const a={t:pk(R.ask.general),topic:"general"};parts.push(a.t);ask=a}}
  else if(depth==="normal"){if(ask&&(ask.force||Math.random()<.6||!/？$/.test(main)&&["greet","howareyou","whatdoing","hobby","fav","answer","setlike"].includes(it)))parts.push(ask.t);else ask=null;if(!ask&&share&&Math.random()<.3)parts.push(pk(share))}
  else{if(ask&&ask.force)parts.push(ask.t);else ask=null}
  if(ask&&!parts.includes(ask.t))ask=null;
  const text=parts.map(fill).join("\n");
  S.lastQ=ask||keepQ;if(topic)S.lastTopic=topic;else if(ask)S.lastTopic=ask.topic;S.lastBot=fill(main);S.lastWhy=why;S.lastIntent=it;
  let action=null;if(S.actCool>0)S.actCool--;else if(Math.random()<.1){action=pk(c.act);S.actCool=3}
  return {text,action,intent:it||"fallback"}}
 return {reply,state:S}}
function addLike(mem,x){x=x.replace(/^(私|僕|俺|わたし|ぼく|おれ|うち)は?/,"");if(x&&!mem.likes.includes(x)){mem.likes.unshift(x);mem.likes=mem.likes.slice(0,8)}}
G.createEngine=createEngine;G.normText=norm;
})(typeof window!=="undefined"?window:globalThis);
