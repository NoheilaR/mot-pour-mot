const { normalize } = require('./matchAnswer');

/**
 * Valide un indice côté serveur.
 * Règles :
 *  - un seul token (pas d'espace)
 *  - différent du mot cible (normalisé)
 *  - ne contient pas le mot cible comme sous-chaîne (normalisé)
 *
 * @param {string} clue
 * @param {string} target
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateClue(clue, target) {
  const normClue = normalize(clue);
  const normTarget = normalize(target);

  if (!normClue) {
    return { valid: false, reason: 'L\'indice ne peut pas être vide.' };
  }
  if (/\s/.test(normClue)) {
    return { valid: false, reason: 'L\'indice doit être un seul mot (sans espace).' };
  }
  if (normClue === normTarget) {
    return { valid: false, reason: 'L\'indice ne peut pas être le mot cible.' };
  }
  if (normClue.includes(normTarget) || normTarget.includes(normClue)) {
    return { valid: false, reason: 'L\'indice contient ou est contenu dans le mot cible.' };
  }

  return { valid: true };
}

module.exports = { validateClue };
