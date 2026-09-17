/** Local chunks only; keep lazy collection loading outside component state. */
export async function loadOfflineIconCollections() {
  const collections = await Promise.all([
    import('@iconify-json/lucide'),
    import('@iconify-json/carbon'),
    import('@iconify-json/material-symbols'),
  ]);
  return collections.map((collection) => collection.icons);
}
