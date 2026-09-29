# LongJohn for Google TV and Android

A locked-in browser for LongJohn. It opens straight into the web app at your
server's address, full screen, with the remote's back button walking browser
history and the player's fullscreen button working properly. That is the
whole app: one settings screen for the address, one screen for the site.

You never need Android Studio. GitHub builds the APK.

## Getting an APK

Tag the repo and push the tag. The `Android app` workflow builds a signed APK
and attaches it to a GitHub release named after the tag:

```
git tag android-v1.0
git push origin android-v1.0
```

A few minutes later the APK is on the Releases page as `LongJohn-1.0.apk`.
For a build without a release, run the workflow from the Actions tab and
download the APK from the run's artifacts.

## Installing on a Google TV

Sideloading, once per device:

1. On the TV, allow installs from unknown sources: Settings, Apps, Security &
   restrictions, Unknown sources, and switch on the app you will install
   from (Downloader, or the file manager).
2. Get the APK onto the TV. Easiest is the free **Downloader** app from the
   Play Store: open it and enter the APK's URL from the GitHub release. A USB
   stick with the file works too.
3. Open the APK and install. LongJohn appears in the TV's app row with a
   green play mark.
4. First launch asks for the server address. Type the Pi's IP, for example
   `192.168.1.12`. It is remembered.

A new version installs over the old one; no need to uninstall first, since
every build is signed with the same key.

## Using it

- **Back** on the remote goes back a page, and exits the app from the front page.
- **Menu** on the remote opens Settings to change the address. So does the
  Settings button on the "could not reach" screen if the server is down.
- The player's fullscreen button gives real fullscreen here, which most TV
  browser apps cannot do.
- Navigation with the D-pad moves between links and buttons on the page.

## Notes for whoever changes it

- `app/src/main/java/com/longjohn/tv/` holds the two screens. `MainActivity`
  is the browser, `SettingsActivity` the address form, `Prefs` the one
  stored value.
- The signing key in `keystore/` is committed on purpose. The app is only
  ever sideloaded onto our own devices, and a stable key is what lets
  updates install over each other. Do not use it for anything that goes to
  a store.
- The server is plain http on the home network, so the manifest allows
  cleartext traffic.
- To bump the version, change `versionCode` and `versionName` in
  `app/build.gradle.kts`, then tag.
