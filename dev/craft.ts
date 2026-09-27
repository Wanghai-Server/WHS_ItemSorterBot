bot.on("chat", (username: string, message: string)=>{
    if (message.startsWith("1378 合成") && ["PPPzzzhhh2", "Zele", "lyh1378", "lyh1379", "MC_Slime"].includes(username)){
        let item = message.slice(6)
        console.log(item)
    }
})