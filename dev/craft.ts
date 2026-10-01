import { default as setting } from "./craft_conf.json" with { type: "json" };
import { sleep, gotoPos, executeAirdropNew, ItemRequest } from "./airdrop.ts";
import type { Bot } from "mineflayer";
function calcuteMaterial(itemname: keyof typeof setting, count: number): [string, number][] {
    let materials: Record<string, number> = {};
    let recipe = setting[itemname].recipe;
    count = Math.ceil(count/setting[itemname].count);
    for(let i=0; i<3; i++){
        for(let j=0; j<3; j++){
            if(recipe[i][j] !== ""){
                materials[recipe[i][j]] = (materials[recipe[i][j]] || 0) + count;
            }
        }
    }
    // 合并材料
    
    return Object.entries(materials);
}
export function craft(username: string, message: string, bot: Bot & {pathfinder: any}) {
    let test = /^1378 合成\s*\S*?\s*\d*[个组盒]$/
    if(!test.test(message)) {
        bot.chat("用法：1378 合成 <itemname> <number><unit>");
        return;
    }
    let itemS = message.slice(7).replace(" ", "")
    test = /\d*[个组盒]$/
    let count_unit = test.exec(itemS)?.[0] as keyof typeof setting
    test = /^[^\d\s]*/
    if(!count_unit) return;
    let itemname = test.exec(itemS)?.[0] as keyof typeof setting
    let count = parseInt(count_unit.slice(0, count_unit.length-1))
    let unit = count_unit.at(-1)
    // console.log(itemname)
    let recipe = setting[itemname];
    if(!recipe) {
        bot.chat("检索失败！")
        return;
    }
    let fullCount = count*(unit==="盒"?27*recipe.stack:unit==="组"?recipe.stack:1);
    bot.chat(fullCount + "个")
    if(fullCount > 36*recipe.stack){
        bot.chat("物品太多了")
        return;
    }
    let stack = recipe.stack;
    // 计算合成方法，使用树状结构，每次合成材料不超过36*stack
    let craftTree = [];
    let nexts = [];
    craftTree.push({
        type: itemname,
        count: fullCount,
        name: itemname,
    }) // 根节点，接下来要逐层查询
    nexts.push()
}
// no common js
if (import.meta.main) {
    console.log(calcuteMaterial("红石粉", 1000))
}