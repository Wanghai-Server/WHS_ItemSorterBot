import type { Bot } from "mineflayer";
import * as Config from "./config.json" with { type: "json" }
import * as Config_north from "./config_north.json" with { type: "json" }
import * as Config_useful from "./config_useful.json" with { type: "json" }
import * as goals from "mineflayer-pathfinder";
import { pathfinder, Movements } from "mineflayer-pathfinder";

// let GoalNear = goals.goals.GoalNear
import { Vec3 } from "vec3";
import { fake_player_name as fpn, clear_fake_player_default as clearFakePlayer } from "../settings.ts" with {type: "json"} 

type configType = {[key:string]: [number, string, string] | [number, string, string, number]};
let config: configType = (Config as any).default;
let config_north: configType = (Config_north as any).default;
let config_useful: configType = (Config_useful as any).default;
let tossItems: { type: number; count: number; name: string }[] = [];

export function sleep(ms: number) { 
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfigs(
  itemName: string
): ([number, string, string] | [number, string, string, number])[] {
  return [
    config[itemName],
    config_north[itemName],
    config_useful[itemName],
  ].filter((x) => x !== undefined);
}
export class ItemRequest {
  name: string = "";
  count: number = 0;
  unit: string = "个";
  shulker_positions: [number, number, number][] = [];
  take_shulker_positions: [number, number, number][] = [];
  stand_positions: [number, number, number][] = [];
  take_positions: [number, number, number][] = [];
  stack: number;
  w: string[] = [];
  constructor(name: string, count: number, unit: string) {
    this.count = count;
    this.name = name;
    this.unit = unit;
    let confs = getConfigs(name);
    if (confs.length === 0) throw new Error("物品 " + name + " 检索失败！");
    this.stack = confs[0][3] ?? 64;
    for (let i of confs) {
      let w = i[1];
      let Zindex = i[0];
      switch (w) {
        case "left":
          this.shulker_positions.push([3, 86, Zindex]);
          this.take_shulker_positions.push([2, 88, Zindex]);
          this.w.push("大宗");
          this.stand_positions.push([5.5, 87, Zindex]);
          break;
        case "right":
          this.shulker_positions.push([13, 86, Zindex]);
          this.take_shulker_positions.push([14, 88, Zindex]);
          this.w.push("大宗");
          this.stand_positions.push([11.5, 87, Zindex]);
          break;
        case "useful":
          this.shulker_positions.push([13, 87, Zindex]);
          this.take_shulker_positions.push([12, 90, Zindex]);
          this.w.push("常用");
          this.stand_positions.push([10.5, 87, Zindex]);
          break;
        case "leftN":
          this.shulker_positions.push([3, 87, Zindex]);
          this.take_shulker_positions.push([2, 86, Zindex]);
          this.w.push("北仓");
          this.stand_positions.push([5.5, 87, Zindex]);
          break;
        case "rightN":
          this.shulker_positions.push([13, 87, Zindex]);
          this.take_shulker_positions.push([14, 86, Zindex]);
          this.w.push("北仓");
          this.stand_positions.push([11.5, 87, Zindex]);
          break;
        default:
          throw new Error("配置出错！");
      }
    }
    if (unit === "盒") {
      this.take_positions = this.take_shulker_positions.slice();
    } else {
      this.take_positions = this.shulker_positions.slice();
    }
  }
  async getItem(bot: Bot) {
    let confs = getConfigs(this.name);
    let itemid = this.unit !== "盒" ? confs[0][2] : "shulker_box";
    let remaining = this.count * (this.unit === "组" ? this.stack : 1);
    let attempts = 0;
    const maxAttempts = 5;
    let totalTaken = 0;
    let successful = 1;
    for (let i = 0; i < this.stand_positions.length; i++) {
      attempts = 0;
      let Pos = this.stand_positions[i];
      await gotoPos(bot, Pos[0], Pos[1], Pos[2]);
      while (remaining > 0 && attempts < maxAttempts) {
        ++attempts;
        const block = bot.blockAt(
          new Vec3(
            this.take_positions[i][0],
            this.take_positions[i][1],
            this.take_positions[i][2]
          )
        );
        if (
          !block ||
          (block.name !== "chest" &&
            block.name !== "dropper" &&
            !block.name.endsWith("shulker_box"))
        ) {
          if (totalTaken > 0) {
            bot.chat(
              `容器消失，已取出 ${totalTaken} 个，未达到需求 ${this.count} ${this.unit}，等待换盒`
            );
            await sleep(1000)
            continue
          } else {
            bot.chat(`指定位置${this.take_positions}不是容器或容器已消失`);
            console.warn(`指定位置${this.take_positions}不是容器或容器已消失`);
            successful=0;
            break;
          }
        }

        const chest = await bot.openContainer(block);
        try {
          const items = chest.containerItems();
          const targetItems = items.filter(
            (i: { type: number; count: number; name: string }) => {
              return i.name && i.name.includes(itemid);
            }
          );
          let totalInChest = targetItems.reduce(
            (sum: number, i: { type: number; count: number; name: string }) =>
              sum + i.count,
            0
          );
          if (totalInChest === 0) {
            await chest.close();
            if (this.w[i] === "北仓") {
              bot.chat(`当前盒内无 ${this.name}，等待换盒...`);
              await sleep(1000);
              continue;
            } else {
              bot.chat(`容器中没有 ${this.name}`);
              break;
            }
          }
          let takeCount = Math.min(totalInChest, remaining);
          for (const item of targetItems) {
            if (takeCount <= 0) break;
            const take = Math.min(item.count, takeCount);
            await chest.withdraw(item.type, null, take);
            tossItems.push({ type: item.type, count: take, name: item.name });
            totalTaken += take;
            remaining -= take;
            takeCount -= take;
          }
          await chest.close();
          console.log(`本次取出 ${totalTaken} / ${remaining} 个 `);

          if (remaining <= 0) {
            console.log("成功取物，共取出 " + totalTaken + " 个");
            return [];
          }
          if (this.w[i] === "北仓" || this.unit !== "盒") {
            await sleep(1500);
          } else {
            console.log(`库存不足，仅取出 ${totalTaken} 个，换下一位置`);
            break;
          }
        } catch (e) {
          bot.chat("取物出错：" + e);
          await chest.close();
          console.log(e);
        }
      }
    }
    if (remaining > 0) successful = 0;
    console.log(successful)
    if(successful === 1) return [];
    else return [`${this.name}储量不足，只投放若干`];
  }
  usage(){
    if(this.unit !== "个") return this.count;
    return Math.ceil(this.count / this.stack);
  }
}
async function toPack(bot: Bot) {
  bot.chat("!!kill")
  let pos = {x:21, y:84, z:62};
  await gotoPos(bot, 8, 84, 50);
  await gotoPos(bot, 21, 84, 50);
  await gotoPos(bot, pos.x-1, pos.y, pos.z);

  const block = bot.blockAt(new Vec3(pos.x, pos.y, pos.z))
  if (!block || !block.name.endsWith('shulker_box')) {
    throw new Error(`坐标 (${pos.x}, ${pos.y}, ${pos.z}) 处没有潜影盒`)
  }

  const container = await bot.openContainer(block)
  try {
    for (let i = 9; i <= 44; i++) {
      const item = bot.inventory.slots[i]
      if (item) {
        await container.deposit(item.type, item.metadata, item.count)
      }
    }
  } catch(e){}
  finally {
    await container.close()
  }
  const noteblock = bot.blockAt(new Vec3(19, 84, 62));
  if(!noteblock) return;
  await bot.activateBlock(noteblock);
  await sleep(1000)
}
async function dropAll(bot: Bot) {
  for (let i = 9; i <= 44; i++) {
    const item = bot.inventory.slots[i];
    if (item) {
      await bot.tossStack(item);
    }
  }
}
async function dropToFakePlayer(bot: Bot){
  await gotoPos(bot, 8, 87, -6);
  await bot.lookAt(new Vec3(4, 88, -6));
  await dropAll(bot);
  await sleep(4000);
}

export async function executeAirdropNew(itemlist: ItemRequest[], bot: Bot) {
  bot.chat("!!kill")
  await clearAirdropPlayer(bot)
  await sleep(500);
  bot.chat(`/player ${fpn} kill`);
  await sleep(500);
  bot.chat(`/player ${fpn} spawn at 5.5 87 -5.5`);
  await sleep(500);
  let t1=0, t2=0, tmp=0;
  let b = [], t: ItemRequest[] = [];
  let T=[]
  for(let item of itemlist){
    if(item.unit !== "盒" && (item.unit==="个"?1:64)*item.count>=item.stack*27){
      T.push(new ItemRequest(item.name, Math.floor((item.unit==="个"?1:item.count)*item.count / (item.stack*27)), "盒"))
      T.push(new ItemRequest(item.name, (item.unit==="个"?1:item.count)*item.count % (item.stack*27), "个"))
    }else T.push(item);
  }
  itemlist=T;
  for(let item of itemlist){
    t1+=item.usage();
    if(item.unit === "盒") t2+=item.usage();
    else {
      if(tmp+item.usage()>=26) {
        t.push(new ItemRequest(item.name, 26-tmp, "组"));
        b.push(t);
        t=[]; // 不满盒可以拆，杂盒分类没问题
        t.push(new ItemRequest(item.name, item.count-(26-tmp) * (item.unit === "组"?1:item.stack), item.unit));
      }
      else t.push(item);
      tmp+=item.usage();
    }
    while(tmp >= 27) t2++, tmp-=27;
  }
  if(t.length) b.push(t)
  if(tmp>0) t2++;
  if(t2>36) return "物品太多了，无法空投！";
  if(t1<=36){
    tmp=1;
  }else{
    tmp=0;
  }
  console.log(b)
  // 空投 红色混凝土10组 粉色混凝土10组 黄色混凝土10组
  let message:string[] = [];
  for(let i of itemlist.filter(x=>x.unit === "盒")){
    let TT = await i.getItem(bot);
    message.concat(TT);
    await dropToFakePlayer(bot);
  }
  for(let i of b){
    for(let j of i){
      let TT = await j.getItem(bot); 
      console.info(TT)
      message.concat(TT);
    }
    if(!tmp){
      await toPack(bot);
    }
    await dropToFakePlayer(bot);
  }
  console.info(message)
  return message.join("\n");
}
export async function gotoPos(bot: Bot, x: number, y: number, z: number, dis = 0.1) {
  const defaultMove = new Movements(bot);
  // bot.setControlState("sprint", true);
  defaultMove.allow1by1towers = false
  defaultMove.canDig = false;
  defaultMove.allowSprinting = true;
  defaultMove.allowParkour=true

  defaultMove.maxDropDown = 100
  bot.pathfinder.setMovements(defaultMove);
  // @ts-ignore
  const goal = new goals.default.goals.GoalNear(x, y, z, dis);
  try {
    console.log(`正在前往 (${x}, ${y}, ${z})`);
    await bot.pathfinder.goto(goal);
    console.log(`已到达 (${x}, ${y}, ${z})`);
  } catch (err: any) {
    console.error(`寻路失败: ${err.message}`);
  }
}
async function clearAirdropPlayer(bot: Bot) {
  const lockInput = bot.blockAt(new Vec3(5, 83, 8));
  if (lockInput != null && lockInput.name === "redstone_block") {
    bot.chat("全物品输入口已锁定，不进行清空假人");
    return false;
  }
  await gotoPos(bot, 6.5, 87, 8.5)
  await dropAll(bot)
  const input = bot.blockAt(new Vec3(7, 86, 7))
  if(input != null && input.name === "smooth_quartz"){
    const noteblock = bot.blockAt(new Vec3(6, 86, 6));
    if(noteblock){
      await bot.activateBlock(noteblock);      
    }
  }
  bot.chat(`/player ${fpn} kill`);
  await sleep(200);
  bot.chat(`/player ${fpn} spawn at 7.5 87 10.3 facing -150 30`);
  await sleep(1000);
  bot.chat(`/player ${fpn} dropStack all`);
  await sleep(500);
  return true;
}