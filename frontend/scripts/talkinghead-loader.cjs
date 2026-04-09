/**
 * Webpack loader for @met4citizen/talkinghead
 *
 * Keeps one functional patch only:
 * replace runtime-computed dynamic import() with static imports so webpack
 * reliably bundles lipsync language modules.
 */
module.exports = function talkingheadLoader(source) {
  let patched = source
    .replace(
      /const moduleName = path \+ 'lipsync-' \+ lang\.toLowerCase\(\) \+ '\.mjs';\s*/,
      ''
    )
    .replace(
      /import\(moduleName\)\.then\(\s*module\s*=>/,
      `const _loaders = {
        'en': () => import('./lipsync-en.mjs'),
        'de': () => import('./lipsync-de.mjs'),
        'fi': () => import('./lipsync-fi.mjs'),
        'fr': () => import('./lipsync-fr.mjs'),
        'lt': () => import('./lipsync-lt.mjs'),
      };
      const _load = _loaders[lang.toLowerCase()];
      if (_load) _load().then( module =>`
    );

  if (!patched.includes('_loaders')) {
    this.emitWarning(
      new Error(
        'talkinghead-loader: static lipsync import patch did not apply; ' +
          'check scripts/talkinghead-loader.cjs against upstream module changes.'
      )
    );
  }

  return patched;
};

