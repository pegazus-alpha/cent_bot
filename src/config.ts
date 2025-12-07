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
  },
  moderation: {
    blockWhatsappLinks: true, // Bloque les liens d'invitation WhatsApp
    blockImages: false,
    blockVideos: false,
    blockAudio: false,
    blockDocs: false,
    blockLinks: false,
    blockMentions: false,
    bannedWords: ['test', 'motinterdit'], // Liste de mots interdits
    antiFlood: {
      enabled: true,
      messageLimit: 5, // messages
      timeFrame: 10,   // seconds
      action: 'warn' as 'warn' | 'kick'
    }
  }
};
