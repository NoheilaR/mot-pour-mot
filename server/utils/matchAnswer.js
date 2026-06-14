/**
 * Normalise une chaîne : minuscules, accents supprimés, espaces collapsés.
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distance de Levenshtein entre deux chaînes (itératif).
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Retourne les variantes singulier/pluriel basiques en français.
 */
function pluralVariants(word) {
  const variants = new Set([word]);
  if (word.endsWith('s') || word.endsWith('x')) {
    variants.add(word.slice(0, -1)); // ballons → ballon
  } else {
    variants.add(word + 's');        // ballon → ballons
    variants.add(word + 'x');        // bateau → bateaux
  }
  return variants;
}

/**
 * Vérifie si la réponse du joueur correspond au mot cible.
 * Tolère : casse, accents, singulier/pluriel, distance Levenshtein ≤ 1 (mots ≤5) ou ≤ 2 (plus longs).
 *
 * @param {string} answer  - réponse du joueur
 * @param {string} target  - mot cible
 * @returns {boolean}
 */
function matchAnswer(answer, target) {
  const normAnswer = normalize(answer);
  const normTarget = normalize(target);

  // Correspondance exacte ou variante pluriel/singulier
  const targetVariants = pluralVariants(normTarget);
  const answerVariants = pluralVariants(normAnswer);

  for (const av of answerVariants) {
    if (targetVariants.has(av)) return true;
  }

  // Tolérance Levenshtein sur toutes les paires de variantes
  const maxDist = normTarget.length <= 5 ? 1 : 2;
  for (const av of answerVariants) {
    for (const tv of targetVariants) {
      if (levenshtein(av, tv) <= maxDist) return true;
    }
  }

  return false;
}

module.exports = { matchAnswer, normalize, levenshtein };
