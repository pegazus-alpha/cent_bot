/**
 * Gestionnaire de sessions pour les conversations interactives
 */

interface UserSession {
  step: 'SELECT_GROUP' | 'SELECT_ACTION' | 'ENTER_MESSAGE' | 'CONFIRM';
  groupId?: string;
  groupName?: string;
  action?: 'toggle' | 'edit_message' | 'view_settings';
  messageBuffer?: string[];
  timestamp: number;
}

class SessionManager {
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  /**
   * Démarre une nouvelle session pour un utilisateur
   */
  startSession(userId: string, step: UserSession['step']): void {
    this.sessions.set(userId, {
      step,
      timestamp: Date.now(),
      messageBuffer: []
    });
  }

  /**
   * Récupère la session d'un utilisateur
   */
  getSession(userId: string): UserSession | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    // Vérifier l'expiration
    if (Date.now() - session.timestamp > this.SESSION_TIMEOUT) {
      this.sessions.delete(userId);
      return null;
    }

    return session;
  }

  /**
   * Met à jour une session
   */
  updateSession(userId: string, updates: Partial<UserSession>): void {
    const session = this.getSession(userId);
    if (session) {
      Object.assign(session, updates, { timestamp: Date.now() });
    }
  }

  /**
   * Ajoute une ligne au buffer de message
   */
  addMessageLine(userId: string, line: string): void {
    const session = this.getSession(userId);
    if (session && session.messageBuffer) {
      session.messageBuffer.push(line);
    }
  }

  /**
   * Récupère le message complet du buffer
   */
  getCompleteMessage(userId: string): string {
    const session = this.getSession(userId);
    if (session && session.messageBuffer) {
      return session.messageBuffer.join('\n');
    }
    return '';
  }

  /**
   * Termine une session
   */
  endSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Vérifie si un utilisateur a une session active
   */
  hasActiveSession(userId: string): boolean {
    return this.getSession(userId) !== null;
  }

  /**
   * Nettoie les sessions expirées
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.timestamp > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
      }
    }
  }
}

// Instance singleton
export const sessionManager = new SessionManager();

// Nettoyage automatique des sessions expirées toutes les minutes
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 60000);