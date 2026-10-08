import nacl from "tweetnacl";
const response=(content)=>({type:4,data:{content,flags:64}});
const codes=()=>{try{return JSON.parse(process.env.CREATOR_CODES||"{}")}catch{return {}}};
const dbReady=()=>Boolean(process.env.KV_REST_API_URL&&process.env.KV_REST_API_TOKEN);
async function redis(...args){if(!dbReady())throw Error("Database not configured");const r=await fetch(process.env.KV_REST_API_URL.replace(/\/$/,""),{method:"POST",headers:{Authorization:"Bearer "+process.env.KV_REST_API_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(args)});if(!r.ok)throw Error("Database request failed");const data=await r.json();if(data.error)throw Error("Database request failed");return data.result;}
const creatorKey=id=>"impact:creator:"+id;
async function creatorCode(id){if(!id)return null;const saved=dbReady()?await redis("GET",creatorKey(id)):null;return saved||codes()[id]||null;}
const owner=id=>(process.env.OWNER_DISCORD_IDS||"").split(",").map(s=>s.trim()).includes(id);
const briefs=[
["Recognition","Invincible fans know what this means.","Pendant macro, on-body, close-up","Did you recognise it?"],
["Outfit","Fandom jewellery that works with any outfit.","Black tee, hoodie, jacket","Which fit wins?"],
["Review","This is what actually arrives.","Box, unboxing, pendant, on-body","Would you wear it?"],
["Founder","I made jewellery I wanted to wear.","Design, real product, packaging","What fandom next?"]
];
async function post(url,content){if(!url)return false;try{const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content,allowed_mentions:{parse:[]}})});return r.ok}catch{return false}}
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).send("Method not allowed");
 const signature=req.headers["x-signature-ed25519"],timestamp=req.headers["x-signature-timestamp"],key=process.env.DISCORD_PUBLIC_KEY;
 // Discord signatures require the original request bytes, not re-serialized JSON.
 const raw=req.rawBody?Buffer.from(req.rawBody):req.body!==undefined?Buffer.from(typeof req.body==="string"?req.body:JSON.stringify(req.body)):await new Promise((resolve,reject)=>{const chunks=[];req.on("data",chunk=>chunks.push(chunk));req.on("end",()=>resolve(Buffer.concat(chunks)));req.on("error",reject)});
 if(!signature||!timestamp||!key||!raw.length||!nacl.sign.detached.verify(Buffer.concat([Buffer.from(timestamp),raw]),Buffer.from(signature,"hex"),Buffer.from(key,"hex")))return res.status(401).send("Invalid signature");
 let i;try{i=JSON.parse(raw.toString("utf8"))}catch{return res.status(400).send("Invalid JSON")};if(i.type===1)return res.json({type:1});
 const name=i.data?.name,id=i.member?.user?.id||i.user?.id;
 let code;try{code=await creatorCode(id)}catch{return res.json(response("Creator database is temporarily unavailable. Please try again later."));}
 const opts=Object.fromEntries((i.data?.options||[]).map(o=>[o.name,o.value]));
 let message="";
 if(name==="mycode")message=code?"Your code: **"+code+"**. Customers get 10% off; you earn 10% commission on eligible sales.":"No code linked to your Discord account yet.";
 else if(name==="product")message="**IMPACT || 001**\nSubtle Viltrumite-inspired stainless-steel necklace with a 50cm chain. IMPACT makes fandom-inspired jewellery; this is not official Invincible merchandise.";
 else if(name==="content")message=process.env.CONTENT_VAULT_URL||"Content Vault link not configured yet.";
 else if(name==="ideas"){const b=briefs[Math.floor(Math.random()*briefs.length)];message="**"+b[0]+"**\nHook: "+b[1]+"\nClips: "+b[2]+"\nCTA: "+b[3]+(code?"\nUse **"+code+"** for 10% off.":"");}
 else if(name==="hooks")message="Invincible fans know what this means.\nMost people see three lines.\nFandom jewellery without the merch look.\nWould you actually wear this?"+(code?"\nUse "+code+" for 10% off.":"");
 else if(name==="caption")message="Most people see jewellery. Invincible fans see something else. Subtle enough for everyday wear."+(code?"\nUse "+code+" for 10% off.":"")+"\n#Invincible #Viltrumite #FandomJewellery #ImpactStudio";
 else if(name==="links")message="Website: "+(process.env.IMPACT_WEBSITE||"Not configured")+"\nInstagram: "+(process.env.IMPACT_INSTAGRAM||"Not configured")+"\nTikTok: "+(process.env.IMPACT_TIKTOK||"Not configured");
 else if(name==="faq")message="**FAQ**\nIMPACT makes subtle fandom-inspired jewellery.\nIMPACT || 001 is stainless steel with a 50cm chain.\nCreator terms: 10% customer discount and 10% creator commission.\nCheck the store checkout for current shipping rates.";
 else if(name==="submit"){const url=String(opts.url||"");if(!/^https:\/\/(www\.)?(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)\//i.test(url))message="Please provide a valid TikTok, Instagram or YouTube HTTPS link.";else if(!code)message="Your creator code must be linked before submitting.";else if(!dbReady())message="Submission database is not configured yet.";else{try{const record=JSON.stringify({creator:id,code,url,at:new Date().toISOString()});await redis("LPUSH","impact:submissions",record);await redis("INCR","impact:submission-count");await post(process.env.SUBMISSIONS_WEBHOOK_URL,"**New creator post**\nCreator: "+id+"\nCode: "+code+"\n"+url);message="Your post has been saved to the private submission log."}catch{message="Could not save your submission. Please try again."}}}
 else if(name==="help")message="/mycode /product /content /ideas /hooks /caption /submit /links /faq /help";
 else if(["dashboard","creators","creator","addcreator","removecreator","announce"].includes(name)&&!owner(id))message="Owner-only command.";
 else if(name==="dashboard"){if(!dbReady())message="Database not configured yet. Creator records are not persistent.";else try{const ids=await redis("SMEMBERS","impact:creator-ids")||[];const count=Number(await redis("GET","impact:submission-count")||0);message="**Creator HQ**\nLinked Discord creators: "+ids.length+"\\nSaved creator submissions: "+count}catch{message="Database unavailable. Try again later."}}
 else if(name==="creators"){if(!dbReady())message="Database not configured.";else try{const ids=await redis("SMEMBERS","impact:creator-ids")||[];const entries=await Promise.all(ids.map(async uid=>uid+": "+(await creatorCode(uid))));message=entries.join("\n").slice(0,1800)||"No creators linked."}catch{message="Database unavailable."}}
 else if(name==="creator"){try{const found=await creatorCode(opts.user);message=found?"Creator code: "+found:"Creator not found."}catch{message="Database unavailable."}}
 else if(name==="addcreator"){if(!dbReady())message="Database not configured.";else if(!/^\d{17,22}$/.test(String(opts.user||""))||! /^[A-Za-z0-9_-]{2,32}$/.test(String(opts.code||"")))message="Invalid creator ID or code.";else try{await redis("SET",creatorKey(opts.user),String(opts.code).toUpperCase());await redis("SADD","impact:creator-ids",opts.user);message="Creator saved. Code: "+String(opts.code).toUpperCase()}catch{message="Could not save creator."}}
 else if(name==="removecreator"){if(!dbReady())message="Database not configured.";else try{await redis("DEL",creatorKey(opts.user));await redis("SREM","impact:creator-ids",opts.user);message="Creator removed."}catch{message="Could not remove creator."}}
 else if(name==="announce")message=await post(process.env.ANNOUNCEMENTS_WEBHOOK_URL,String(opts.message||""))?"Announcement posted.":"Announcement channel not configured or posting failed.";
 else message="Unknown command. Try /help.";
 return res.json(response(message));
}