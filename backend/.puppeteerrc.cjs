const { join } = require('path');

/**
 * Sur Render (et d'autres plateformes similaires), le dossier de cache par
 * défaut de Puppeteer (situé hors du répertoire du projet, ex. ~/.cache)
 * n'est pas conservé entre la phase de build et l'instance de production.
 * En forçant le téléchargement de Chrome DANS le répertoire du projet,
 * il est bien inclus dans ce qui est réellement déployé.
 *
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};