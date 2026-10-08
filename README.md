# mPractice for Aussie Citizenship

**Australian Citizenship Test practice – by mStudio**

mPractice for Aussie Citizenship helps you get ready for the Australian Citizenship Test. Practise as many times as you like with questions based on the testable sections of *Our Common Bond*.

🌐 **Try it:** https://mstudio-solutions.github.io/mPractice-for-Aussie-Citizenship/

## Features

- 111 practice questions across Parts 1–4
- **Full Mock test** – 20 questions incl. 5 Values questions; pass = 75% + all Values correct (same rule as the real test)
- Practice by Part, Values only, Key questions or Random
- Timer per question (30s / 45s / 60s / 90s / 135s) or untimed
- Fixed answer layout, with optional shuffle
- Review mistakes with explanations
- Large buttons and text, easy to read
- No sign-up, no ads, no cookies – works without a backend
- Anonymous visit counts on the website with Cloudflare Web Analytics (no cookies, no personal data). The iOS app has no analytics.

## Privacy

mPractice does not collect any personal information. On the website, recent scores stay in your browser only and are cleared when you close the tab. In the iOS app, settings, recent scores and progress are saved on the device only. Full policy: open the app → **About** → **Privacy Policy**, or [privacy.html](https://mstudio-solutions.github.io/mPractice-for-Aussie-Citizenship/privacy.html).

## Project structure

- `index.html` – the full app: practice, results, About and Privacy Policy pages (question bank is embedded)
- `questions.json` – the question bank as plain JSON (generated)
- `data/part1.json` … `data/part4.json` – question source, one file per testable part of *Our Common Bond*
- `scripts/build.py` – checks the questions and rebuilds `questions.json` and `index.html`
- `privacy.html` – standalone Privacy Policy page (used by the App Store listing)
- `ios/`, `capacitor.config.json`, `package.json`, `scripts/build-www.mjs` – the iOS app (see [IOS.md](IOS.md))
- `appstore/` – App Store listing text, icon and screenshots

## iOS app

The same page is also packaged as an iPhone app with Capacitor. It works offline, has no analytics, and saves settings and progress on the device. See [IOS.md](IOS.md) for how to build and submit it.

## Edit or add questions

1. Edit a file in `data/`. Put the correct answer in `a` and the two wrong answers in `w`. Answer order is shuffled automatically. Keep the `id` of a question you edit; give a new question the next free number.
2. Run `python3 scripts/build.py`
3. Commit `data/`, `questions.json` and `index.html`. For the iOS app, also run `npm run ios` on the Mac before archiving.

`python3 scripts/build.py --check` fails if the generated files are out of date.

Every push to `main` is published to GitHub Pages by GitHub Actions (`.github/workflows/deploy.yml`). It checks the question bank, then publishes `index.html` and `privacy.html`.

## Disclaimer

mPractice is an **unofficial** practice tool. It is not made by, linked to or approved by the Australian Government or the Department of Home Affairs. Questions are based on *Australian Citizenship: Our Common Bond* (© Commonwealth of Australia) and are not the real test questions. Always check the [official source](https://immi.homeaffairs.gov.au/citizenship/test-and-interview/our-common-bond).

## Contact

- **Company:** mStudio
- **Developer:** Martin Yeung
- **Email:** mstudiosolutions@gmail.com
- **Location:** Australia

## Licence

© 2026 Martin Yeung (mStudio). All rights reserved. See [LICENSE](LICENSE).
