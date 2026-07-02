const sharp = require('sharp');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 680">
  <rect width="680" height="680" fill="#8b2020" rx="120"/>
  <circle cx="340" cy="340" r="230" fill="#f5f0e8" stroke="#e0d8c8" stroke-width="4"/>
  <path d="M 220 200 C 180 270, 180 410, 220 480" fill="none" stroke="#cc2020" stroke-width="11" stroke-linecap="round"/>
  <path d="M 460 200 C 500 270, 500 410, 460 480" fill="none" stroke="#cc2020" stroke-width="11" stroke-linecap="round"/>
  <line x1="220" y1="225" x2="255" y2="215" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="212" y1="258" x2="248" y2="252" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="207" y1="292" x2="244" y2="290" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="206" y1="326" x2="243" y2="328" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="208" y1="360" x2="244" y2="366" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="213" y1="394" x2="248" y2="404" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="220" y1="426" x2="254" y2="440" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="231" y1="456" x2="261" y2="472" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="460" y1="225" x2="425" y2="215" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="468" y1="258" x2="432" y2="252" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="473" y1="292" x2="436" y2="290" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="474" y1="326" x2="437" y2="328" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="472" y1="360" x2="436" y2="366" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="467" y1="394" x2="432" y2="404" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="460" y1="426" x2="426" y2="440" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <line x1="449" y1="456" x2="419" y2="472" stroke="#cc2020" stroke-width="7" stroke-linecap="round"/>
  <text x="340" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="110" fill="#8b2020" letter-spacing="-4">DB</text>
</svg>`;

const buf = Buffer.from(svg);
const out = path.join(__dirname, '..', 'public');

Promise.all([
  sharp(buf).resize(192, 192).png().toFile(path.join(out, 'deadball-icon-192.png')),
  sharp(buf).resize(512, 512).png().toFile(path.join(out, 'deadball-icon-512.png')),
]).then(() => console.log('Icons written: deadball-icon-192.png, deadball-icon-512.png'))
  .catch(e => { console.error(e); process.exit(1); });
