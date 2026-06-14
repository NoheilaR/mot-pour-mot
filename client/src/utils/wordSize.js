// Retourne la classe CSS de taille selon la longueur du mot
export function wordSizeClass(word) {
  const len = word?.length ?? 0;
  if (len > 12) return 'current-word--xs';
  if (len > 9)  return 'current-word--sm';
  if (len > 6)  return 'current-word--md';
  return '';
}
