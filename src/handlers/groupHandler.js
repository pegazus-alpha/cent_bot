/**
 * Group events: welcome / goodbye / update metadata
 */
import { createOrUpdateUser } from '../services/db.js';
export async function handleGroupUpdate(sock, ev) {
    try {
        if (!ev)
            return;
        // ev might be a "group-participants.update"
        if (ev.action && (ev.action === 'add' || ev.action === 'remove')) {
            for (const participant of ev.participants) {
                if (ev.action === 'add') {
                    createOrUpdateUser(participant, 'unknown');
                    // Envoyer le message de bienvenue en privé
                    await sock.sendMessage(participant, {
                        text: `👋 Bienvenue dans le groupe ! 
            
            📋 Merci de lire attentivement les règles du groupe.
            🤝 N'hésitez pas à vous présenter et à participer aux discussions.
            ✨ Bonne intégration !

            *Bienvenue dans la communauté 100% ACADEMY 🎓💚*

            _Ravi de t’avoir avec nous 🙌_
            Ici, on apprend, on s’entraide et on progresse ensemble.

            *Dans ce groupe, tu vas pouvoir :*

            * Accéder à des opportunités de formations certifiantes

            * Poser tes questions et échanger avec d'autres

            * Recevoir des ressources pour t’aider à avancer 📚

            📢 *Notre chaîne*:
            https://whatsapp.com/channel/0029VaEJh7WEgGfKGl7Fyd3j

            *Et pour ceux qui souhaitent évoluer encore plus vite, nous proposons aussi :*

            * Cours de soutien en ligne

            * Packs vidéos de formation

            * Formations en ligne

            * Formations en présentiel


            > Ici, personne ne te met la pression.
            Tu avances à ton rythme, avec nous 💚

            *Encore une fois, _bienvenue dans la famille_ 🚀*
            *100% ACADEMY*`
                    });
                    // Message discret dans le groupe (optionnel)
                    // await sock.sendMessage(ev.id, { 
                    //   text: `👋 Bienvenue @${participant.split('@')[0]} !`, 
                    //   mentions: [participant]
                    // });
                }
                else {
                    await sock.sendMessage(participant, { text: `voulez vous vraiment nous quitter?` });
                }
            }
        }
    }
    catch (e) {
        console.error('handleGroupUpdate error', e);
    }
}
//# sourceMappingURL=groupHandler.js.map