# Wacelink

Another lavalink wrapper but focus on stability and rich features

# 🌟 Features
 - Stable client
 - Support TypeScript
 - 100% Compatible with Lavalink
 - Object-oriented
 - Easy to setup
 - Inbuilt Queue System
 - Extendable Player, Queue, Rest class
 - Backward compatible (Can run lavalink version 3.7.x)
 - Driver based (avaliable to run Nodelink v2 and port older lavalink version)
 - Plugin system
 - Using [PWSL](https://github.com/PerformanC/internals) by [The PerformanC Organization](https://github.com/PerformanC) for better WS implementation

# ➕ Plugins

This is the list of all wacelink plugin currently supported

| Name               | Type     | Link                                                                                                                          | Author    |
|--------------------|----------|-------------------------------------------------------------------------------------------------------------------------------|-----------|
| wacelink-nico      | Official | [npmjs](https://www.npmjs.com/package/wacelink-nico) / [github](https://github.com/krushna06/wacelink-nico)             | n0step |
| wacelink-deezer    | Official | [npmjs](https://www.npmjs.com/package/wacelink-deezer) / [github](https://github.com/krushna06/wacelink-deezer)         | n0step | 
| wacelink-apple     | Official | [npmjs](https://www.npmjs.com/package/wacelink-apple) / [github](https://github.com/krushna06/wacelink-apple)           | n0step | 
| wacelink-spotify   | Official | [npmjs](https://www.npmjs.com/package/wacelink-spotify) / [github](https://github.com/krushna06/wacelink-spotify)       | n0step | 
| wacelink-voice     | Official | [npmjs](https://www.npmjs.com/package/wacelink-voice) / [github](https://github.com/krushna06/wacelink-voice)           | n0step | 

# ⚙ Drivers

This is the list of all wacelink driver currently supported (codename is made up by me)

| Driver Name       | Voice Server                                          | Language   | Supported Version | Codename | Notes                                                             |
|-------------------|-------------------------------------------------------|------------|-------------------|----------|-------------------------------------------------------------------| 
| lavalink/v4/koinu | [Lavalink](https://github.com/lavalink-devs/Lavalink) | Java       | v4.0.0 - v4.x.x   | koinu    |                                                                   |
| lavalink/v3/koto  | [Lavalink](https://github.com/lavalink-devs/Lavalink) | Java       | v3.0.0 - v3.7.x   | koto     | `filter` and `resume` in lavalink below v3.4 not supported        |
| nodelink/v2/nari  | [Nodelink](https://github.com/PerformanC/NodeLink)    | Javascript | v2.0.0 - v2.x.x   | nari     | Some `filter` mode in nodelink not supported                      |
| frequenc/v1/miku  | [FrequenC](https://github.com/PerformanC/FrequenC)    | C          | IN TESTING        | miku     | This driver is in testing so don't use it or you will have errors |

# 💾 Example bot:

```js
const {Client, GatewayIntentBits} = require('discord.js');
const {Guilds, GuildVoiceStates, GuildMessages, MessageContent} = GatewayIntentBits;
const {Wacelink, Library} = require("wacelink");
const Nodes = [{
    name: 'something',
    host: '192.168.0.66',
    port: 2333,
    auth: 'youshallnotpass',
    secure: false,
}];

const client = new Client({intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent]});
const wacelink = new Wacelink({
    library: new Library.DiscordJS(client),
    nodes: Nodes,
});

client.on("ready", () => console.log(client.user?.tag + " Ready!"));

wacelink.on('nodeConnect', (node) => console.log(`Lavalink ${node.options.name}: Ready!`));
wacelink.on('nodeError', (node, error) => console.error(`Lavalink ${node.options.name}: Error Caught,`, error));
wacelink.on("nodeClosed", (node) => console.warn(`Lavalink ${node.options.name}: Closed`))
// wacelink.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
wacelink.on('nodeDisconnect', (node, code, reason) => {
  console.warn(`Lavalink ${node.options.name}: Disconnected, Code ${code}, Reason ${reason || 'No reason'}`)
});

wacelink.on("trackStart", (player, track) => {
    client.channels.cache.get(player.textId).send({content: `Now playing **${track.title}** by **${track.author}**`})
});

wacelink.on("trackEnd", (player) => {
  client.channels.cache.get(player.textId).send({content: `Finished playing`})
});

wacelink.on("queueEmpty", player => {
    client.channels.cache.get(player.textId).send({content: `Destroyed player due to inactivity.`})
    player.destroy();
});

client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    if (msg.content.startsWith("!play")) {
        const args = msg.content.split(" ");
        const query = args.slice(1).join(" ");

        const {channel} = msg.member.voice;
        if (!channel) return msg.reply("You need to be in a voice channel to use this command!");

        let player = await wacelink.create({
            guildId: msg.guild.id,
            textId: msg.channel.id,
            voiceId: channel.id,
            shardId: 0,
            volume: 40
        })

        let result = await wacelink.search(query, {requester: msg.author});
        if (!result.tracks.length) return msg.reply("No results found!");

        if (result.type === "PLAYLIST") for (let track of result.tracks) player.queue.add(track);
        else player.queue.add(result.tracks[0]);


        if (!player.playing || !player.paused) player.play();

        return msg.reply({content: result.type === "PLAYLIST" ? `Queued ${result.tracks.length} from ${result.playlistName}` : `Queued ${result.tracks[0].title}`});
    }
})

client.login('');
```