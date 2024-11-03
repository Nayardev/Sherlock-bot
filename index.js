import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// Replace with your Discord token and Email Lookup API Key
const DISCORD_TOKEN = 'YOUR_BOT_TOKEN';
const EMAIL_API_KEY = 'YOUR_EMAIL_API_KEY'; // e.g., from Hunter.io

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// URLs for platform profile searches, now with PayPal included
const platformURLs = {
    Twitter: (username) => `https://twitter.com/${username}`,
    Discord: (username) => `https://discord.com/users/${username}`,
    YouTube: (username) => `https://www.youtube.com/${username}`,
    TikTok: (username) => `https://www.tiktok.com/@${username}`,
    Snapchat: (username) => `https://www.snapchat.com/add/${username}`,
    Steam: (username) => `https://steamcommunity.com/id/${username}`,
    Twitch: (username) => `https://www.twitch.tv/${username}`,
    Spotify: (username) => `https://open.spotify.com/user/${username}`,
    PayPal: (username) => `https://www.paypal.me/${username}`,  
};

// Command handler for "!help"
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content === '!help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Commandes du Bot')
            .setDescription('Voici les commandes disponibles:')
            .addFields(
                { name: '!emailsearch <email>', value: 'Cherche des informations publiques basées sur une adresse email.' },
                { name: '!sherlock <username>', value: 'Recherche sur les profils associés au nom d\'utilisateur donné sur les plateformes populaires, incluant Twitter, Discord, YouTube, TikTok, Snapchat, Steam, Twitch, Spotify, et PayPal.' }
            );
        message.channel.send({ embeds: [helpEmbed] });
    }
});

// Command handler for "!emailsearch" - email lookup with API
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!emailsearch')) {
        const email = message.content.replace('!emailsearch ', '').trim();
        if (!email) {
            message.channel.send("Merci de fournir une adresse email.");
            return;
        }

        await message.channel.send(`Recherche en cours pour : **${email}**...`);

        try {
            // Make an HTTP request to the email lookup API (Hunter.io in this example)
            const response = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${EMAIL_API_KEY}`);
            const data = await response.json();

            if (!data || !data.data) {
                message.channel.send("Aucun résultat trouvé pour cette adresse email.");
                return;
            }

            // Prepare results from API response
            const emailInfo = data.data;
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Résultats de recherche pour "${email}"`)
                .setFooter({ text: 'Données récupérées de Hunter.io' });

            // Add fields based on API response
            embed.addFields(
                { name: "Adresse Email", value: emailInfo.email || "Non disponible" },
                { name: "Résultat Vérification", value: emailInfo.result || "Non disponible" },
                { name: "Score", value: emailInfo.score ? emailInfo.score.toString() : "Non disponible" },
                { name: "Statut", value: emailInfo.status || "Non disponible" },
                { name: "Domain", value: emailInfo.domain || "Non disponible" }
            );

            // Send embed in chat
            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error("Erreur lors de la recherche d'email:", error);
            message.channel.send("Une erreur est survenue lors de la recherche.");
        }
    }
});

// Command handler for "!sherlock" - extended profile search
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!sherlock')) {
        const username = message.content.replace('!sherlock ', '').trim();
        if (!username) {
            message.channel.send("Merci de fournir un nom d'utilisateur.");
            return;
        }

        await message.channel.send(`Recherche approfondie en cours pour : **${username}**...`);

        // Launch Puppeteer for profile validation
        const browser = await puppeteer.launch({ headless: true });
        const results = {};

        for (const [platform, urlFunc] of Object.entries(platformURLs)) {
            const url = urlFunc(username);
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });

            const profileExists = await page.evaluate(() => !document.body.innerText.includes("Not Found"));
            if (profileExists) {
                results[platform] = url;
            } else {
                results[platform] = 'Profil introuvable';
            }
            await page.close();
        }
        
        await browser.close();

        // Creating embed for sherlock search results
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`Résultats de recherche approfondie pour "${username}"`)
            .setFooter({ text: 'Résultats de recherche basés sur le nom d\'utilisateur' });

        for (const [platform, result] of Object.entries(results)) {
            embed.addFields([
                { name: platform, value: result.includes('Profil introuvable') ? 'Profil introuvable' : `[Voir le profil](${result})` },
            ]);
        }

        message.channel.send({ embeds: [embed] });
    }
});

client.login(DISCORD_TOKEN);
