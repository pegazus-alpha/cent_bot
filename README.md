# WhatsApp Bot (Baileys) - Base

## Description
Prototype de bot WhatsApp utilisant Baileys (non-officiel). Fourni comme base pour :
- modération de groupes
- view-once unlock
- taggers (tag all / tag admins)
- sauvegarde messages / média
- scheduler de messages planifiés

⚠️ Utiliser avec un **numéro dédié**. Baileys est non-officiel.

## Installation (local)
1. Installer Node 20+ et npm
2. `npm install`
3. `npm run dev` (scanne le QR dans le terminal)
4. Tester dans un petit groupe

## Structure
- `src/` : code source TypeScript
- `data/` : sessions, médias, DB
- `scripts/` : scripts utilitaires

## Important
- Configure `src/config.ts`
- Ne pas spammer ; warm-up du numéro
- Sauvegarder `data/session.json`

## Docker
1. `npm run build`
2. `docker build -t whatsapp-bot .`
3. `docker run -v $(pwd)/data:/app/data -it whatsapp-bot`

## À développer
- Intégration Groq / Ollama (IA)
- UI d'administration
- Sécurité / chiffrement des backups