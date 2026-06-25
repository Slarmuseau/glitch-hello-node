// electron-builder afterPack hook: ad-hoc sign the macOS app.
//
// We have no paid Apple Developer certificate, so electron-builder's own
// signing is skipped. An unsigned app on Apple Silicon is refused by macOS
// ("is damaged"). An *ad-hoc* signature (codesign --sign -) is free and makes
// the app launchable; the user only needs to confirm once via right-click →
// Open (or by clearing the download quarantine).

const { execSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  console.log(`Ad-hoc signing ${appPath} …`)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  // Verify (does not fail the build if verification is lenient for ad-hoc).
  try {
    execSync(`codesign --verify --verbose=2 "${appPath}"`, { stdio: 'inherit' })
  } catch {
    console.log('codesign verify gaf een waarschuwing (normaal voor ad-hoc).')
  }
}
