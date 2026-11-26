const fs = require('node:fs');
const path = require('node:path');
const { assertPlayBuild } = require('./play-build-config.cjs');
const { checkStagingBuild } = require('./check-staging-build.cjs');
function preparePlayNative(env, packagePath = path.join(__dirname, '..', 'package.json')) {
  checkStagingBuild(env);
  const play = assertPlayBuild(env);
  if (!play) return;
  if (env.EAS_BUILD !== 'true') throw new Error('Enable native Play autolinking only on the EAS cloud builder.');
  const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  manifest.expo.autolinking.exclude = manifest.expo.autolinking.exclude.filter(name => name !== 'expo-iap');
  fs.writeFileSync(packagePath, JSON.stringify(manifest, null, 2) + '\n');
}
module.exports = { preparePlayNative };
if (require.main === module) preparePlayNative(process.env);
