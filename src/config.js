// Configuration centralisée - remplace les placeholders par tes valeurs
export const config = {
    sessionFile: './data/session.json',
    mediaDir: './data/media',
    dbFile: './data/bot.db',
    botJid: '', // Rempli automatiquement après connexion
    serverPort: process.env.PORT || 3000,
    groqApiKey: process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY',
    instanceName: 'FLAG-WA-BOT',
    warmup: {
        messagesPerHour: 30
    }
};
//# sourceMappingURL=config.js.map