# UI match with the original site — tracker

Compared 2026-10-10: original `kaydyachaanifaydyach.com` (reference only) vs ours
`kaydyachaanifayddyacha.com`, on phone (375 px), tablet (768 px) and desktop (1280 px).
Pages: home, `/ebooks`, book page, `/combos`, `/about`, `/contact`, `/my-books`, `/terms`.

**Rule:** copy the original's *look*; keep our own data (contact details, prices), our buying
flow (no form, instant download, WhatsApp delivery) and anything safer than the original.

Decision: ✅ apply (approved 2026-10-10) · ⚠️ owner decides · ❌ skip
Status: ⬜ to do · 🟡 in progress · ✔️ done (commit) · ⏸ waiting for owner

## Bugs on our side

| # | Item | Decision | Status | Notes |
|---|---|---|---|---|
| 1 | Phone: card button "PDF डाउनलोड करा" wraps to 3 lines; "50% OFF" breaks | ✅ | ✔️ 10-10 | Card = stacked price + compact navy button + pink offer pill (original layout) |
| 2 | During a deploy (~1 min) a page can load without CSS (new page, old container serves the CSS → 404) | ✅ | ✔️ 10-10 | Caddy: a `/_next/static/*` file missing on one container is fetched from the other (tested locally with 2 fake containers, both up / one down). Deploy copies the Caddyfile and reloads Caddy |
| 3 | Tablet: `/ebooks` shows 2 huge cards per row → 3 | ✅ | ✔️ 10-10 | `/ebooks` grid: 2 → 3 (tablet) → 4 (desktop) columns |
| 4 | WhatsApp button covers content + buy bar on book pages (original hides it there) | ✅ | ✔️ 10-10 | Hidden while the sticky buy bar is on (book pages) |

## Whole site

| # | Original | Ours | Decision | Status | Notes |
|---|---|---|---|---|---|
| 5 | English text in Geist; Marathi/Hindi in the phone's own font | Lato + Noto Sans Devanagari | ✅ | ✔️ 10-10 | Geist (self-hosted, 1 variable file 29 KB) replaces Lato (3 files 69 KB) |
| 6 | Footer: gold-gradient title, big tagline, pink→yellow Instagram button, gold headings + dot bullets, icon-box contact rows with labels, proprietor/Udyam pill, decorative glow | Plain, compact | ✅ | ✔️ 10-10 | Rebuilt from the original markup; Instagram link set to the real account |
| 7 | Footer "Sitemap" → HTML page `/site-index` | → raw `/sitemap.xml` | ✅ | ✔️ 10-10 | New `/site-index` page (+ in sitemap.xml); old redirect `/site-index → /ebooks` removed |
| 8 | Bottom nav: "कॉम्बो"; active = light bg + navy icon | "कॉम्बो पॅक्स"; solid navy + white icon | ✅ | ✔️ 10-10 |  |
| 9 | WhatsApp button has a label "काही अडचण असल्यास येथे संपर्क साधा" | Round button only | ⚠️ | ⏸ | |
| 10 | Header search icon plain | In a bordered box | ✅ | ✔️ 10-10 |  |
| 11 | No language switch in header | मराठी / हिंदी switch | ❌ | — | Keep ours |
| 12 | Original: header text overflows on desktop; Contact scrolls sideways on phones | — | ❌ | — | Their bugs |

## Home page

| # | Original | Ours | Decision | Status | Notes |
|---|---|---|---|---|---|
| 13 | Hero: no badge, gold disclaimer line, taller search with gold icon, gold "लोकप्रिय:", bigger yellow button with sparkle icon, 2 compact stat cards | Badge, grey text, 3 tall stat cards | ✅ | ✔️ 10-10 | Headline still visible from first paint (PageSpeed fix kept) |
| 14 | Bestsellers = swipe carousel (big card, neighbours peeking), centred heading | 2-column grid of all books (page 9,300 px vs 6,900 px) | ✅ | ✔️ 10-10 | Same row for combos (tinted). Desktop auto-advances one card / 4 s, pauses on hover |
| 15 | How to buy: centred steps, coloured icon boxes (blue/purple/green/yellow) | Left cards, grey icons | ✅ | ✔️ 10-10 | Step text = our real flow |
| 16 | Benefits heading has gold underline bar | No bar | ✅ | ✔️ 10-10 |  |
| 17 | Testimonials = swipe carousel, 5 gold stars per card | Stacked, no stars | ✅ | ✔️ 10-10 |  |
| 18 | Fake "X from Y just bought" pop-ups | — | ❌ | — | Misleading social proof; dark-pattern risk |

## E-book list (+ Combos)

| # | Original | Ours | Decision | Status | Notes |
|---|---|---|---|---|---|
| 19 | Navy banner, back arrow, centred white + gold title (Combos: "Special Combo Packages") | Black title on white | ✅ | ✔️ 10-10 | Also on `/combos` with the yellow "Limited Time Offer" note |
| 20 | Tab bar under banner: "All / सर्व · हिंदी · English" | None | ✅ | ✔️ 10-10 | Tabs replace our language chips when there are 3+ languages (no duplicate filters) |
| 21 | "Book ID" search box | Missing | ✅ | ✔️ 10-10 | Filters by card number across all books |
| 22 | Category buttons with icons, rounded-xl, navy when active | Round, gold when active | ✅ | ✔️ 10-10 |  |
| 23 | No yellow disclaimer box, no "Featured" sort | Both | ⚠️ | ⏸ | Suggest: keep disclaimer, drop sort |
| 24 | Card price stacked (₹198 struck, big ₹99), pink offer pill with flame | One line, orange text | ✅ | ✔️ 10-10 |  |

## Book page

| # | Original | Ours | Decision | Status | Notes |
|---|---|---|---|---|---|
| 25 | Hindi book → Hindi UI labels | Always Marathi labels | ✅ | ✔️ 10-10 | Book-page labels follow the edition on show (PRODUCT_COPY / GALLERY_COPY in src/lib/product-copy.ts) |
| 26 | Price box light green, "छूट"/offer pills, yellow buy button | White box, navy button | ✅ | ✔️ 10-10 | Yellow buy buttons (top + lower card) |
| 27 | 5 gold stars, green "✓ तुरंत डिजिटल डिलीवरी" | 1 star, English "Instant Digital Delivery" | ✅ | ✔️ 10-10 |  |
| 28 | Yellow notice "no refund after PDF download" | Not shown | — | ✔️ already | Our book page already shows "⚠️ एकदा PDF डाउनलोड केल्यानंतर परतावा (Refund) शक्य नाही." (missed in the first comparison) |
| 29 | Small pills (PDF, pages, instant); round 4-step progress line | Bigger boxes/cards | ✅ | ✔️ 10-10 | Style only |

## Other pages

| # | Original | Ours | Decision | Status | Notes |
|---|---|---|---|---|---|
| 30 | About: gradient title, bigger text, light-green Mission card | Small label, black title | ✅ | ✔️ 10-10 |  |
| 31 | Contact: gradient title, icon boxes, hints (e.g. working hours) | Plain cards | ✅ | ✔️ 10-10 | Hours "Mon – Sat, 9:00 AM – 6:00 PM IST" were already on our About page |
| 32 | Policy pages: Marathi title, "Official info" + business details box | English title, plain text | ✅ | ✔️ 10-10 | All 6 policy pages: Marathi-first title, Official info card, Business details box |
| 33 | My Books: app-style header, help links, "Best Value Combos" row | Our "send to WhatsApp" flow | ✅ style + combos row | ✔️ 10-10 | App-style bar, help links, "PDF कुठे मिळेल?" tip, combos row; our send-to-WhatsApp flow kept |

## Found while implementing — owner decides

| # | Item | Decision | Status | Notes |
|---|---|---|---|---|
| 34 | Original Contact page has a "Send us a Message" form (name, email, subject, message) | ✅ | ✔️ 10-10 | Form saves to table `contact_messages` (migration 006, applied to Mumbai DB 10-10); inbox at /dashboard/messages with Mark as done; honeypot + 5/hour per IP (IP stored only as SHA-256) |
| 35 | Original Contact page promises "Response time: 48 hours \| Resolution: within 7 working days" | ✅ | ✔️ 10-10 | Shown on /contact in all 3 languages |
| 36 | Book pages tell Google "4.8 stars from 128 ratings" (structured data) and the home page shows testimonials copied from the original | ✅ | ✔️ 10-10 | Removed the invented "128 ratings" from book-page structured data. Visible testimonials / 4.8 stars kept — still confirm with the client that they are real |

## Owner requests 2026-10-10 (second batch)

| # | Item | Status | Notes |
|---|---|---|---|
| 37 | First-visit language popup (मराठी / हिंदी / English) on every device | ✔️ 10-10 | Bottom sheet on phones, centred card on tablet/desktop; not on /dashboard or /order. Shown until a language is chosen; phone header has a language button (म / हि / EN) that reopens it; desktop/laptop header dropdown from 1024 px |
| 38 | Whole site in Marathi, Hindi and English | ✔️ 10-10 | Header, footer, home, lists, book page, preview viewer, About, Contact, policy chrome, My Books, order page, 404. Policy body text stays English (legal text); customer quotes stay in their original language |
| 39 | Buying in Hindi gives the Hindi book | ✔️ verified | Hindi mode → checkout request `locale: "hi"` (tested by intercepting the request); order + download + WhatsApp use the order's edition. Books without a Hindi edition sell the edition they have |
| 40 | After payment: tell buyers where the PDF was downloaded | ✔️ 10-10 | Order page box with steps for Android / iPhone / computer + the file name; order page text follows the visitor's language (cookie `kaf_locale`) |
| 41 | Header logo too small | ✔️ 10-10 | 32→36 px phones, 40→44 px tablet, 28→40 px laptop, 44 px large screens |
| 42 | PageSpeed report 10-10 (mobile LCP 3.8 s) | ✔️ 10-10 | First home carousel cover loads eagerly with high priority + correct sizes (it was the lazy LCP image); contrast fixes; stars `role="img"`. Optional for owner: turn off Cloudflare Web Analytics auto-beacon if unused (it is in the critical chain) |
