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

### 1. Build it: set the number, `npm run release`

Releases are plain numbers: 2, 3, 4. Open `package.json` at the repo root,
change `"version"` to the next number, then:

```
npm run release
```

It rebuilds the frontend first, so a release that does not compile is never
tagged, then commits the version change, tags `v2` and pushes the commit and
the tag. That tag is what starts GitHub's `Build Android APK` workflow. The
app reads the same number from `package.json`, so the tag, the APK's name
and the version shown in the app's Settings screen all say `2`. If you
forget to change the number, the script stops and says so.

To watch it: the repo's **Actions** tab, green check when done, three to
five minutes. The APK is then on the **Releases** page under the tag, as
`LongJohn-2.apk`. The run page also has an "Artifacts" section, but that
download comes wrapped in a zip, so use the release asset. A release link
does not exist until the run has finished; before that it is a 404.

For a test build with no release, open the workflow on the Actions tab and
press "Run workflow".

### 2. Install it on the TV with adb (the reliable way)

One-time setup on the stick: Settings, System, About, tap "Android TV OS
build" seven times, then Settings, System, Developer options, turn on
Network debugging. On the PC, get Google's platform tools (a small zip from
https://developer.android.com/tools/releases/platform-tools) and unzip it
anywhere.

Then, from wherever `adb` is, with the APK downloaded from the release:

```
adb connect 192.168.1.5:5555
adb install -r LongJohn-3.apk
```

The first connect shows an "Allow USB debugging?" dialog on the TV: tick
"Always allow from this computer" and OK. After that it never asks again,
and every later release is those two lines. `-r` installs over the old
version. If an install fails, adb prints the real reason, which the TV's
own installer never does.

### 3. Or install it with Downloader (worked once, then stopped)

The Downloader app on the stick can fetch the APK and install it, and it is
how the first version went on. But it later kept delivering broken files,
every one of which the stick reported as "problem parsing the package", and
the same files installed fine with adb. If adb is not an option:

1. On the Pi, park the APK where LongJohn already serves files, so the
   address is short enough to type with a remote:

   ```
   cd /home/pi/Documents/dev/longjohn
   curl -L -o public/LongJohn-3.apk https://github.com/kevinlbatchelor/longjohn/releases/download/v3/LongJohn-3.apk
   ls -l public/LongJohn-3.apk
   ```

   The size must match the release. A few bytes means the release was not
   finished when the curl ran; run it again.
2. On the stick, install "Downloader by AFTVnews" from the Play Store and
   allow it under Settings, Privacy, Security & restrictions, Unknown sources.
3. In Downloader, delete any old LongJohn files from its Files tab first,
   then enter `192.168.1.12:3000/LongJohn-3.apk` and install.

### 4. Open it

It opens straight into LongJohn at `192.168.1.12`. Nothing to enter. If the
server lives somewhere else, press **Menu** on the remote for Settings.

### Updating to a new version

Change the number in `package.json`, `npm run release`, download the APK
from the release, `adb install -r` it. The new version installs over the old
one, keeping the address, because every build is signed with the same key. The new APK installs over the old
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
- The launcher icon and banner are the LongJohn skull from the web app's
  `app/public/favicon.ico`, on green. It is 16x16 pixel art blown up a whole
  number of times per size, so it stays crisp; the generator that made the
  PNGs read the .ico directly, no image library needed.

## The pages live in the app

The web app is built into the APK at release time (the workflow runs the
frontend build and copies `app/public` to `assets/www`). The app opens
those pages and hands them the server address from Settings, so a UI change
reaches the TV with the next release and an `adb install`, and the Pi only
has to serve the API and the media. The pages the Pi serves to ordinary
browsers on port 80 are a separate copy, rebuilt on the Pi with
`npm run build` when you want them updated too.

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
- The version is not set here. `app/build.gradle.kts` reads it from the
  root `package.json`; you set it there and `npm run release` tags and
  pushes.
