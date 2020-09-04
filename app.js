const Discord = require('discord.js');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const { allowedNodeEnvironmentFlags } = require('process');
const client = new Discord.Client();
const config = require("./config.json");
//Websockets init. Dit is voor het control panel van de bot.

const wss = new WebSocket.Server({
    port: 8080,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});

//stuurt het bericht direct door naar het general kanaal.
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        client.channels.cache.get(config.general).send(message);
    });
});

// Discord bot

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    switch (msg.content.split(" ")[0]) {
        case "info":
            fetch(config.api.base + config.api.nasaNrEndpoint + msg.content.split(" ")[1])
                .then(response => response.json())
                .then(data => {
                    switch (data.status) {
                        case 404:
                            msg.reply("Dit product bestaad niet. Probeer het opnieuw met een ander NASA Nummer.")
                            break;
                        default:
                            msg.reply(new AHCard(
                                data.card.products[0].title,
                                data.card.products[0].link,
                                data.card.products[0].descriptionFull,
                                data.card.products[0].images[0].url,
                                data.card.products[0].category,
                                data.card.products[0].price.now,
                                data.card.products[0].price.unitSize,
                                data.card.products[0].hqId,
                                data.card.products[0].gtins,
                                data.card.products[0].price.unitInfo
                            ));
                            break;
                    }
                })
                .catch(function (err) {
                    msg.reply("Ahoh, er ging iets fout:\n```" + err + "```");
                    console.log(err);
                });
            break;
        case "zoek":
            fetch(config.api.base + config.api.searchEndpoint + msg.content.split(" ")[1])
                .then(response => response.json())
                .then(data => {
                    switch (data.cards) {
                        case []:
                            msg.reply("Ik kon geen producten vinden. Probeer het opnieuw met een andere zoekterm.");
                            break;
                        default:
                            for (let i in data.cards) {
                                msg.reply(new AHCard(
                                    data.cards[i].products[0].title,
                                    data.cards[i].products[0].link,
                                    data.cards[i].products[0].summary,
                                    data.cards[i].products[0].images[0].url,
                                    data.cards[i].products[0].category,
                                    data.cards[i].products[0].price.now,
                                    data.cards[i].products[0].price.unitSize,
                                    data.cards[i].products[0].hqId,
                                    data.cards[i].products[0].gtins,
                                    data.cards[i].products[0].price.unitInfo
                                ));
                            }
                            break;
                    }
                })
                .catch(function (err) {
                    msg.reply("Ahoh, er ging iets fout:\n ```" + err + "```");
                    console.log(err);
                });
            break;
        default:
            return false;
    }
});

class AHCard {
    constructor(title, url, description, image, category, price, quantity, nasa, gtins, unitInfo) {
        this.color = "#00ade6";
        this.title = title;
        this.url = url;
        this.description = description.replace(/<\/?[^>]+(>|$)/g, "");
        this.image = image;
        this.category = category;
        this.price = "€ " + price.toFixed(2) + ",-";
        this.quantity = quantity;
        this.nasa = nasa;
        this.gtins = gtins;
        this.unitInfo = unitInfo;
        console.log(this);
        let embed = new Discord.MessageEmbed()
            .setColor(this.color)
            .setThumbnail(this.image)
            .addFields(
                { name: 'prijs', value: this.price, inline: true },
                { name: 'inhoud', value: this.quantity, inline: true },
                { name: 'Prijs per ' + this.unitInfo.description, value: "€ " + this.unitInfo.price.toFixed(2) + ",-", inline: true },
                { name: 'EAN Nummers', value: this.gtins, inline: true },
                { name: 'beschrijving', value: this.description || "Geen beschrijving.", inline: true }
            )
            .setTimestamp()
            .setFooter(this.category + " - " + this.nasa);
        return embed;
    }
}

client.login(config.token);