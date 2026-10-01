

import * as mineflayer from "mineflayer"
import { pathfinder } from "mineflayer-pathfinder";
import fs from "fs";
import type {Bot} from "mineflayer"
import type {ChatMessage} from "prismarine-chat";
import { craft } from "./dev/craft.ts";
import { executeAirdropNew, gotoPos, ItemRequest } from "./dev/airdrop.ts";

const botOptions = {
  host: "h1.getmc.cn",
  username: "lyh1378",
  port: 31410,
  version: "1.21.11",
  keepAlive: true,
};
import { fake_player_name as fpn, clear_fake_player_default as clearFakePlayer } from "./settings.ts" with {type: "json"} 

const admins = ["1410happy_", "PPPzzzhhh2", "lyh1378", "lyh1379", "Zele"]
let canHello = false;
let spawnFakePlayer = false;
let successToGetSbox = false;
const RECONNECT_DELAY = 2000;
let Version = "Version 2.0.3-dev-b";
let isReconnecting = false;
// doesn't provide a export named 'name'
import B from "./ban.json" with {type: "json"};
// 解决ban有default的问题
let ban = B as string[];
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let loginTime;
let killInterval: NodeJS.Timeout = setInterval(() => {}, 5000);

console.log("正在尝试连接服务器");
let bot: Bot & {pathfinder: any} = mineflayer.createBot(botOptions);
bot.loadPlugin(pathfinder);
// bot.loadPlugin(pvp);
setupBot();

async function autoKill() {
  if (bot.food <= 6) {
    bot.chat("!!kill");
    return;
  }
}

process.stdin.on("data", (data)=>{
  if(data.toString().trim().startsWith("/run ")){
    let command = data.toString().trim().slice(5);
    try{ 
      eval(command)
    }catch(e){
      console.log(e)
    }
    return;
  }
  bot.chat(data.toString().trim());
})


let doing = false;

function setupBot() {
  bot.once("login", () => {
    bot.chat("/l 114514");
    loginTime = Date.now();
    if (killInterval) clearInterval(killInterval);
    killInterval = setInterval(autoKill, 5000);
  });

  bot.on("message", async (jsonMsg: ChatMessage, position: string = "") => {
    const text = jsonMsg.toString();
    console.log(text)
    if(text === "[SignUp]你今天还没有签到哦！使用 !!signup 签到吧~"){
      bot.chat("!!signup")
    }
    if (
      text.startsWith("=") ||
      text.startsWith("附近")
    ) {
      return;
    }
    const match = text.match(
      /(\S+)\s+\[([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\]/
    );

    if (match && spawnFakePlayer) {
      const orgindim = match[1];
      const x = parseFloat(match[2]);
      const y = parseFloat(match[3]);
      const z = parseFloat(match[4]);
      let dim;
      if (orgindim === "主世界") {
        dim = "minecraft:overworld";
      } else if (orgindim === "地狱") {
        dim = "minecraft:the_nether";
      } else if (orgindim === "末地") {
        dim = "minecraft:the_end";
      } else {
        dim = undefined;
      }
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        if (spawnFakePlayer) {
          await bot.chat(`/player ${fpn} kill`);
          await sleep(500)
          await bot.chat(
            `/player ${fpn} spawn at ${x} ${y} ${z} facing 0 0 in ${dim}`
          );
          spawnFakePlayer = false;
        }
        return;
      }
    }
  });

  bot.on("chat", async (username: string, message: string, translate: string | null, jsonMsg: ChatMessage, matches: string[] | null) => {
    if(jsonMsg.toString().startsWith("[消息同步群]")) return;
    if(ban.includes(username)){
      return;
    }
    // console.log(username, message)
    let targetUser = username;
    let msg = message;
    const giveMatch = msg.match(/^给(\S+?)\s*(空投\s+.+)$/);
    if (giveMatch) {
      targetUser = giveMatch[1];
      msg = giveMatch[2];
    }

    const parts = msg.split(" ");
    const command = parts[0];
    const command1 = parts[1]
    if (command === "1378" && command1 === "move") {
      if(doing) {
        bot.chat("正在执行任务！")
        return;
      }
      
      if (parts.length < 4) {
        bot.chat("用法: 1378 move x y z");
        return;
      }
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);
      const z = parseFloat(parts[4]);
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        bot.chat("坐标不合法");
        return;
      }
      doing=true;
      await gotoPos(bot, x, y, z);
      doing=false;
      return;
    }
    else if(command === "空投滚木"){
      if(doing) return; doing=true;
      await executeAirdropNew([], bot);
        spawnFakePlayer = true;
      //  bot.chat(`/player ${fpn} kill`);
        bot.chat(`${targetUser}在哪`);
        doing=false
    }
    else if (command === "空投" || command === "1378" && command1 === "空投") {
      let rest = parts.slice(1).join(" ");
      if(command === "1378") rest = parts.slice(2).join(" ");
      const re = /\s*(\S+?)\s*(\d+)\s*([个组盒])\s*/g;
      let match;
      const airdrops = [];
      while ((match = re.exec(rest)) !== null) {
        try{
          airdrops.push(new ItemRequest(match[1], parseInt(match[2], 10), match[3]));
        }catch(e){
          // bot.chat(e as string);
          bot.chat(match[1]+"检索失败")
          return;
        }
      }

      if (airdrops.length === 0) {
        bot.chat("格式错误,用法: 1378 空投 <物品名><数量><单位> ...");
        bot.chat("         或: 空投 <物品名><数量><单位> ...");
        return;
      }
      if(doing) {
              bot.chat("正在执行任务！")
              return;
      }
      doing = true;
      let cfp = clearFakePlayer;
      successToGetSbox = false;
      console.log(airdrops)
      const result = await executeAirdropNew(airdrops, bot);
      cfp = false;
      console.log(result)
      bot.chat(result);
      spawnFakePlayer = true;
      bot.chat(`${targetUser}在哪`);
      doing=false;
      return;
    }
    else if (command === "kill1378" || command === "1378" && command1 === "kill") {
      bot.chat("!!kill");
    }
    else if (command === "1378" && command1 === "抽奖"){
      bot.chat("/tell "+username+" 正在抽奖中~")
      let prices = ["雪镇谷度假", "北雪镇度假", "南雪镇度假", "发配修铁路", "发配修建筑", "啥都没有", "啥都没有", "啥都没有", "啥都没有", 
        "8号线车票全程，必须坐完", "S6号线车票全程，必须坐完", "1号线车票全程，必须坐完", "2号线车票全程，必须坐完", "发配修铁路", "发配修建筑"]
      let w = Math.floor(Math.random()*15);
      bot.chat("/tell "+username+" 纯属娱乐，切勿当真");
      bot.chat("/tell "+username+" 你抽到了：" + prices[w]);
      if(w == 0 || w == 1 || w == 2){
        bot.chat("恭喜"+username+"抽到了"+prices[w]);
      }else if(w == 3 || w == 4 || w>=9){
        bot.chat("真·恭喜"+username+"抽到了"+prices[w]);
      }
    }
    else if(command === "1378" && command1 === "--help"){
      bot.chat("用法：")
      bot.chat("- 1378 空投 <itemname><count><unit> [<itemname2><count2><unit2>...]");
      bot.chat("- 1378 抽奖");
      bot.chat("- 1378 kill");
      bot.chat("- 1378 --Version");
      bot.chat("- 1378 --help");
      bot.chat("- 1378 hello [<playername>]")
    }
    else if(command === "1378" && command1 === "--Version"){
      bot.chat(`lyh1378, ${Version}`)
    }else if(command === "1378" && command1 === "合成" && admins.includes(username)){
      craft(username, message, bot);
    }else if(command === "1378" && command1 === "ban"){
      let command2 = parts[2] ?? username;
      ban.push(command2);  
      bot.chat("封禁"+command2+"成功");
      bot.chat("当前封禁列表：")
      bot.chat(ban.join(" "));
      fs.writeFileSync("./ban.json", JSON.stringify(ban, null, 2));
    }else if(command === "1378" && command1 === "unban" && admins.includes(username)){
      let command2 = parts[2] ?? username;
      if(!ban.includes(command2)){
        bot.chat("该玩家未被禁用")
        return;
      }
      ban = ban.filter((item) => item !== command2);
      bot.chat("解禁"+command2+"成功");
      bot.chat("当前封禁列表：")
      bot.chat(ban.join(" "));
      fs.writeFileSync("./ban.json", JSON.stringify(ban, null, 2)); 
    }
    else if(command === "1378" && command1 === "hello"){
      let command2 = parts[2] ?? username;
      bot.chat("你好！"+command2+"，全物品假人lyh1378为你服务。输入 \"1378 --help\"即可查看我的用法！");
    }
    else if(command === "1378"){
      bot.chat("未知的指令。")
      bot.chat("用法：")
      bot.chat("- 1378 空投 <itemname><count><unit> [<itemname2><count2><unit2>...]");
      bot.chat("- 1378 抽奖");
      bot.chat("- 1378 kill");
      bot.chat("- 1378 --Version");
      bot.chat("- 1378 --help");
      bot.chat("- 1378 hello [<playername>]")
    }
  });

  bot.once("spawn", async () => {
    console.log("成功进入服务器");
    isReconnecting = false;
    await sleep(1000);
    bot.chat(`空投机器人lyh1378已上线（测试版${Version}）`);
  });

  bot.on("end", (reason: string) => {
    console.warn(`连接已断开，原因: ${reason}`);
    bot=mineflayer.createBot(botOptions);
    bot.loadPlugin(pathfinder)
// bot.loadPlugin(pvp);
    setupBot();
  });

  bot.on("error", (err: any) => {
    console.log(`发生错误: ${err.message}`);
  });
}

/*
/run bot.chat(`/player bot_airdrop kill`)
/run spawnFakePlayer=true
/run bot.chat(`hongyan250在哪`)
*/