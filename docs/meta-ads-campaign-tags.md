# Meta ads: campaign tags (for Dashboard → Analytics → Campaigns & ads)

**Status: ⏳ waiting for the client** (asked 2026-10-23). Owner tells the client; mark done in
`PROJECT-STATUS.md` §11 "Waiting on the owner / client" item 12 when the client confirms.

## Why
Our site records which link brought each visit and sale (migration 016, live 23 Oct). Without these tags,
every Meta ad visit shows only as **"Meta ad (no campaign tag)"** — we can't tell which campaign or ad
sells. With them, each campaign shows by name, each ad under "By ad", and typing the campaign's spend
shows the return on ad spend.

## What the client does (2 minutes per ad, once)
1. Open **Ads Manager** → the **Ads** tab.
2. Select an ad (or tick several / all ads at once) → **Edit**.
3. Scroll down to **Tracking** → **URL parameters** → paste exactly this line:

   ```
   utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
   ```

4. **Publish**. Repeat for every running ad, and add the same line to every **new** ad.

Notes for the client:
- Copy the line exactly — the `{{campaign.name}}` / `{{ad.name}}` parts are filled in by Meta automatically.
- Editing URL parameters does not restart the ad's learning phase in most cases, but publishing at a quiet
  hour is safest.
- Use clear campaign and ad names (e.g. `Diwali_Marathi_Reels`, `Video3_RTI`) — they appear as-is in our dashboard.

## How we check it worked
After the client publishes, open one ad's link from Facebook/Instagram (or wait for real ad visits) →
`/dashboard/analytics` → **Campaigns & ads** shows the campaign name instead of "Meta ad (no campaign tag)".
Then: update this file's status, `PROJECT-STATUS.md` §7c Meta row "Campaign tags on every ad" (→ ✅) and §11 item 12.
