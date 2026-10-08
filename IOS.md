# iOS app – build and release

The iOS app is the same app as the website, wrapped with [Capacitor](https://capacitorjs.com). The app version:

- works offline (everything is bundled, no CDN)
- has no analytics (`npm run build:app` removes the Cloudflare tag from the app build)
- saves settings, recent scores and progress on the device (the website only keeps them while the tab is open)

App Store listing text, icon and screenshots are in [`appstore/`](appstore/).

## What you need

- A Mac with Xcode (latest version from the Mac App Store)
- Node.js 20 or newer (https://nodejs.org)
- An Apple Developer Program membership (US$99 a year): https://developer.apple.com/programs/enroll/

## 1. Build the app on your Mac

```bash
git clone https://github.com/mstudio-solutions/mPractice-for-Aussie-Citizenship.git
cd mPractice-for-Aussie-Citizenship
npm install
npm run ios        # builds www/ and copies it into the Xcode project
npm run ios:open   # opens Xcode
```

Run `npm run ios` again every time the app or the questions change.

## 2. Test on the simulator or your iPhone

1. In Xcode, choose an iPhone simulator at the top and press ▶ Run.
2. To run on your own iPhone: plug it in, choose it at the top, then in **App → Signing & Capabilities** tick **Automatically manage signing** and choose your **Team**.

Check: the app opens offline (turn on Airplane Mode), a quiz works, and Recent Sessions are still there after you close and reopen the app.

## 3. Create the app in App Store Connect

1. Go to https://appstoreconnect.apple.com → **Apps** → **+** → **New App**.
2. Platform **iOS**, name **mPractice Aussie Citizenship**, language **English (Australia)**, bundle ID **com.mstudiosolutions.mpracticeaustralia**, SKU **mpractice-australia-ios**.
   - If the bundle ID is not in the list, add it first at https://developer.apple.com/account/resources/identifiers (App IDs → +).
3. To sell the app, sign the **Paid Apps** agreement and add bank and tax details in **Business** (Agreements, Tax and Banking).
4. Optional but worth it: join the **App Store Small Business Program** (15% commission instead of 30%): https://developer.apple.com/app-store/small-business-program/

## 4. Upload a build

1. In Xcode, choose **Any iOS Device (arm64)** at the top.
2. Menu **Product → Archive**.
3. In the Organizer window, choose the archive → **Distribute App** → **App Store Connect** → **Upload**.
4. Wait 10–30 minutes until the build shows in App Store Connect (TestFlight tab).

For the next version, raise **Version** (for example 1.0.1) or **Build** (2, 3, …) in **App → General** before you archive.

## 5. Fill in the listing and submit

Use the text in [`appstore/metadata.md`](appstore/metadata.md):

- App Information: subtitle, category, age rating, privacy policy URL
- Pricing and Availability: price and countries
- App Privacy: **Data Not Collected**
- Version page: screenshots from `appstore/screenshots/`, description, keywords, support URL, the build, and the App Review notes

Then press **Add for Review** → **Submit**. Review usually takes 1–3 days.

> The privacy policy and support URLs point to GitHub Pages. Make sure the website is live (merged to `main`) before you submit.
