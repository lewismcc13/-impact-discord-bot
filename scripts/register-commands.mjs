const app=process.env.DISCORD_APPLICATION_ID,token=process.env.DISCORD_BOT_TOKEN,guild=process.env.DISCORD_GUILD_ID;
if(!app||!token||!guild)throw Error("Set DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN and DISCORD_GUILD_ID");
const cmd=(name,description,options=[])=>({name,description,options});
const user={type:6,name:"user",description:"Discord user",required:true};
const commands=[
cmd("mycode","Show your IMPACT creator code and commission"),
cmd("product","Show IMPACT 001 product information"),
cmd("content","Open the Creator Content Vault"),
cmd("ideas","Get a ready-to-use video idea"),
cmd("hooks","Get short video hooks"),
cmd("caption","Get a caption and hashtags"),
cmd("submit","Submit a published creator video",[{type:3,name:"url",description:"TikTok, Instagram or YouTube post URL",required:true}]),
cmd("links","IMPACT website and socials"),cmd("faq","Product and creator FAQs"),cmd("help","Show DRIOD commands"),
cmd("dashboard","Owner: creator summary"),cmd("creators","Owner: list creators"),cmd("creator","Owner: look up creator",[user]),
cmd("addcreator","Owner: reserved for database update",[user,{type:3,name:"code",description:"Discount code",required:true}]),
cmd("removecreator","Owner: reserved for database update",[user]),
cmd("announce","Owner: post creator announcement",[{type:3,name:"message",description:"Announcement",required:true}])
];
const url="https://discord.com/api/v10/applications/"+app+"/guilds/"+guild+"/commands";
const r=await fetch(url,{method:"PUT",headers:{Authorization:"Bot "+token,"Content-Type":"application/json"},body:JSON.stringify(commands)});
if(!r.ok)throw Error("Discord registration failed: "+r.status+" "+await r.text());
console.log("Registered "+commands.length+" commands");