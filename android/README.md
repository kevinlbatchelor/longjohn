# LongJohn for Google TV and Android

A locked-in browser for LongJohn. It opens straight into the web app at your
server's address, full screen, with the remote's back button walking browser
history and the player's fullscreen button working properly. That is the
whole app: one settings screen for the address, one screen for the site.

You never need Android Studio. GitHub builds the APK.

## The whole flow, start to finish

Four stages: build it on GitHub, park the APK on the Pi, fetch it on the TV,
open it. The first three take about five minutes; only the TV stage is
repeated when a new version comes out, and it is shorter then.

### 1. Build it: push, or tag

Two kinds of build, both by GitHub's `Build Android APK` workflow.

**Every push to master that touches `android/`** rebuilds the app and
updates a rolling pre-release called `android-latest`. Its APK always lives
at the same address, so this is the everyday way to get a build onto the TV:

```
https://github.com/kevinlbatchelor/longjohn/releases/download/android-latest/LongJohn-latest.apk
```

The version inside shows as `1.2-6466521`, the number plus the commit, so
Settings on the TV tells you exactly which build is installed.

**A tag starting with `android-v`** makes a numbered release for keeps. Bump
the version first, in `app/build.gradle.kts`: `versionCode` up by one,
`versionName` to the number. Commit, then:

```
git tag android-v1.3
git push origin android-v1.3
```

Either way, to watch it: the repo's **Actions** tab, green check when done,
three to five minutes. The APK is on the **Releases** page, under the tag
for a numbered build or under "Latest build" for the rolling one. The run
page also has an "Artifacts" section, but that download comes wrapped in a
zip, so use the release asset.

If the tag was pushed in the same `git push` that first added the workflow
file, GitHub may not start a run. Delete the tag and push it again:

```
git push origin :refs/tags/android-v1.1
git push origin android-v1.1
```

For a test build with no release, open the workflow on the Actions tab and
press "Run workflow".

### 2. Park it on the Pi

Typing a GitHub URL with a TV remote is miserable, and LongJohn already
serves its `public` folder, so give the APK a short address on the home
network. On the Pi, in PuTTY:

```
cd /home/pi/Documents/dev/longjohn
mkdir -p public
curl -L -o public/LongJohn-1.1.apk https://github.com/kevinlbatchelor/longjohn/releases/download/android-v1.1/LongJohn-1.1.apk
```

No restart needed. Check it from any browser on the network:
`http://192.168.1.12:3000/LongJohn-1.1.apk` should download the file.

### 3. Install it on the TV

Sideloading with the free **Downloader** app, which is the standard tool for
this on Google TV and the onn stick. All done with the remote.

1. Open the Play Store on the TV and install "Downloader by AFTVnews".
2. Allow it to install apps: Settings, Privacy, Security & restrictions,
   Unknown sources, and switch on Downloader. On some builds the path is
   Settings, Apps, Security & restrictions.
3. Open Downloader and type the short address into its box:

   ```
   192.168.1.12:3000/LongJohn-1.1.apk
   ```

4. It downloads in a second or two and shows the install screen. Choose
   Install, then Open.

LongJohn is now in the TV's app row with a green play mark, and Downloader
can stay for the next version.

Without the Pi step, Downloader can fetch from GitHub directly; the address
is the release link, `github.com/kevinlbatchelor/longjohn/releases/download/android-v1.1/LongJohn-1.1.apk`.
Same result, far more typing. A USB stick with the file and the TV's file
manager works too.

### 4. Open it

It opens straight into LongJohn at `192.168.1.12`. Nothing to enter. If the
server lives somewhere else, press **Menu** on the remote for Settings.

### Updating to a new version

Stages 1 to 3 again with the new number. The new APK installs over the old
one, keeping the address, because every build is signed with the same key.
No uninstall.

## Using it

- It opens straight into LongJohn at `192.168.1.12`. To point it elsewhere,
  press **Menu** on the remote for Settings; the Settings button on the
  "could not reach" screen does the same when the server is down.
- **The arrows move a pointer** and **OK clicks** where it is. Hold an arrow
  to move faster; push past an edge and the page scrolls. The pointer fades
  after a few seconds and comes back on the next press.
- **Hold OK** to switch the pointer off and steer by focus instead, the way
  the stock TV browsers do. Hold again to switch it back.
- **Back** goes back a page, and exits the app from the front page.
- The player's fullscreen button gives real fullscreen here, which most TV
  browser apps cannot do.
- The page sits 20dp below the top of the screen so the menu clears the bezel;
  the number is `paddingTop` in `res/layout/activity_main.xml`.
- The launcher icon and banner are the same green play mark the web app now
  uses as its favicon (`app/public/favicon.svg`).

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
