// Build the app version of the page into www/ for Capacitor (iOS).
// Same page as the website, but with Tailwind compiled to a local file
// (www/app.css, made by the build:www npm script) so the app works offline,
// and without the website's Cloudflare Web Analytics snippet.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const CDN = '<script src="https://cdn.tailwindcss.com"></script>';
const ANALYTICS = /<!-- Cloudflare Web Analytics -->.*?<!-- End Cloudflare Web Analytics -->\n?/s;
let html = readFileSync('index.html', 'utf8');
if (!html.includes(CDN)) throw new Error('Tailwind CDN tag not found in index.html');
html = html.replace(CDN, '<link rel="stylesheet" href="app.css"/>').replace(ANALYTICS, '');
if (html.includes('cloudflareinsights')) throw new Error('Remove analytics from the app build');

rmSync('www', { recursive: true, force: true });  // no leftovers from older builds
mkdirSync('www', { recursive: true });
writeFileSync('www/index.html', html);
console.log('www/index.html written');
