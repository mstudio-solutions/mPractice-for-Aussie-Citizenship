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
- Anonymous visit counts with Cloudflare Web Analytics (no cookies, no personal data)

## Privacy

mPractice does not collect any personal information. Recent scores stay in your browser only and are cleared when you close the tab. Full policy: open the app → **About** → **Privacy Policy**.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

Every push to `main` is built and deployed to GitHub Pages by GitHub Actions (`.github/workflows/deploy.yml`).

## Project structure

- `src/App.tsx` – app logic and pages (practice, results, About, Privacy Policy)
- `src/assets/questions.json` – question bank

## Disclaimer

mPractice is an **unofficial** practice tool. It is not made by, linked to or approved by the Australian Government or the Department of Home Affairs. Questions are based on *Australian Citizenship: Our Common Bond* (© Commonwealth of Australia) and are not the real test questions. Always check the [official source](https://immi.homeaffairs.gov.au/citizenship/test-and-interview/our-common-bond).

## Contact

- **Company:** mStudio
- **Developer:** Martin Yeung
- **Email:** mstudiosolutions@gmail.com
- **Location:** Australia

## Licence

© 2026 Martin Yeung (mStudio). All rights reserved. See [LICENSE](LICENSE).
