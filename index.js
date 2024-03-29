const discord = require("discord.js");
const toml = require("toml");
const http = require("http");
const https = require("https");

var fs = require("fs");
var process = require("process");

const cmdsplit = require("./cmdsplit");

g_config = toml.parse(fs.readFileSync("config.toml", "utf8"));

g_discord = new discord.Client();
g_discord.on("ready", () => {
	console.log("Discord is ready!");
});
g_discord.on("message", (msg) => {
	if (!msg.member) {
		console.log("Ignored a DM from " + msg.author.tag + ": \"" + msg.content + "\"");
		return;
	}

	if (msg.author.id == g_discord.user.id) {
		return;
	}

	var parse = cmdsplit(msg.content);

	var mentions = "";
	var resetMentions = false;

	var numCommands = 0;

	for (var i = 0; i < parse.length; i++) {
		var word = parse[i];

		if (word.startsWith("<@") && word.length > 2) {
			if (resetMentions) {
				resetMentions = false;
				mentions = "";
			}
			if (mentions.length > 0) {
				mentions += " ";
			}
			mentions += word;
		}

		if (!word.startsWith(".")) {
			continue;
		}

		if (numCommands > 3) {
			console.error("Note: Maximum number of commands reached, not allowing more for " + msg.author.tag + "!");
			return;
		}

		console.log("Command: \"" + word + "\" from " + msg.author.tag);

		let localMentions = mentions;
		resetMentions = true;

		if (word == ".wiki" && parse.length - i >= 2) {
			numCommands++;

			//TODO: Escape query from ` chars (for bot-sent messages)
			let query = parse[++i];
			let url = g_config.wiki.url + "api.php?action=opensearch&limit=3&search=" + escape(query);

			http.get(url, (res) => {
				var data = "";
				res.on("data", (chunk) => { data += chunk; });
				res.on("end", () => {
					var obj = JSON.parse(data);

					var arrTitles = obj[1];
					var arrLinks = obj[3];

					if (arrTitles.length == 0) {
						msg.channel.send("I couldn't find anything for `" + query + "`, " + msg.author.toString() + ".. :(");
						return;
					}

					var ret = localMentions + " ";
					ret += "I found this for `" + query + "`!\n";
					for (var j = 0; j < arrTitles.length; j++) {
						if (j > 0) {
							ret += "\n";
						}
						var title = arrTitles[j];
						var link = arrLinks[j];
						ret += "**" + title + "**: <" + link + ">";
					}
					msg.channel.send(ret);
				});
			});

		} else if (word == ".enablemods") {
			numCommands++;

			msg.channel.send(localMentions + " To enable mods, see this thread: <https://steamcommunity.com/app/677120/discussions/0/1734340257882962708/>");
		}
	}
});
g_discord.on("error", (err) => {
	console.error(err);
});
g_discord.login(g_config.discord.token);

var funcStop = function() {
	console.log("Bot disconnecting");
	g_discord.destroy();
	process.exit();
};

process.on("SIGINT", funcStop);
process.on("SIGTERM", funcStop);
