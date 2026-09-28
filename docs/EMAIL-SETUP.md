# Email Setup — omotanicaringfoundation.com

How `info@omotanicaringfoundation.com` gets set up on Google Workspace for Nonprofits.

## Current state

| Thing | Where it lives | Status |
|---|---|---|
| Domain registrar | Squarespace | Active, renews Sep 13 2027 |
| DNS / nameservers | Squarespace (`ns01–04.squarespacedns.com`) | Active |
| Website hosting | Netlify (apex `75.2.60.5`, `www` → `apex-loadbalancer.netlify.com`) | Active |
| Email (MX) | — | **None. Mail to the domain bounces.** |
| SPF / DKIM / DMARC | — | None |

The domain is registered *through* Squarespace, so DNS records are edited in the
Squarespace panel. No nameserver migration is required.

## Step 1 — Apply to Google for Nonprofits

Apply at <https://www.google.com/nonprofits/> before creating any paid account.

You will need:

- **EIN:** `85-2581703`
- The IRS 501(c)(3) determination letter
- Organisation address: 8337 N Lee Trevino Drive, Tucson, Arizona, USA 85742

Eligibility is validated by Google's partner (Percent, formerly TechSoup).
Approval typically takes a few days to about two weeks.

> **Do not click "Add email" or buy Google Workspace inside the Squarespace
> Domains panel.** That sells a retail Workspace seat at full price. The
> nonprofit grant only applies when the account is created through Google for
> Nonprofits. If a paid subscription already exists it can be converted later,
> but starting clean is simpler.

Once approved, enable the **Google Workspace for Nonprofits** offering —
free, Business Starter equivalent, 30 GB per user.

## Step 2 — Create the Workspace account

During signup, give `omotanicaringfoundation.com` as the domain. Google issues a
verification token — a TXT record — and the MX records below.

Suggested initial mailboxes:

| Address | Purpose |
|---|---|
| `info@omotanicaringfoundation.com` | Public contact address used across the site |
| `les@…` / `todd@…` | Personal mailboxes (optional) |

`info@` can also be a **group** or **alias** delivering to both personal
mailboxes, which avoids consuming a licensed seat.

## Step 3 — Add DNS records in Squarespace

Path: **Domains & Email → Domains → omotanicaringfoundation.com → DNS → DNS
Settings → Custom Records**.

### Domain verification (temporary)

| Host | Type | Value |
|---|---|---|
| `@` | TXT | `google-site-verification=…` (exact string from Google) |

### Mail routing (required)

Google's current recommendation is a single MX record:

| Host | Type | Priority | Value |
|---|---|---|---|
| `@` | MX | `1` | `smtp.google.com` |

<details>
<summary>Legacy five-record set (equivalent, if the panel rejects the above)</summary>

| Host | Type | Priority | Value |
|---|---|---|---|
| `@` | MX | 1 | `ASPMX.L.GOOGLE.COM` |
| `@` | MX | 5 | `ALT1.ASPMX.L.GOOGLE.COM` |
| `@` | MX | 5 | `ALT2.ASPMX.L.GOOGLE.COM` |
| `@` | MX | 10 | `ALT3.ASPMX.L.GOOGLE.COM` |
| `@` | MX | 10 | `ALT4.ASPMX.L.GOOGLE.COM` |

</details>

Delete any pre-existing MX records first — leftovers silently break delivery.

### Anti-spoofing (do not skip)

Without these, mail from the domain lands in spam and anyone can forge it.

| Host | Type | Value |
|---|---|---|
| `@` | TXT | `v=spf1 include:_spf.google.com ~all` |
| `google._domainkey` | TXT | DKIM key — generate in Admin console |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:info@omotanicaringfoundation.com` |

**DKIM** is not issued at signup. Generate it after the account exists:
Admin console → **Apps → Google Workspace → Gmail → Authenticate email** →
select the domain → *Generate new record* (2048-bit) → paste into Squarespace →
return and click **Start authentication**.

**DMARC** starts at `p=none` (monitor only). After a few weeks of clean reports,
tighten to `p=quarantine`, then `p=reject`.

### Leave these alone

The website records must not be touched:

| Host | Type | Value |
|---|---|---|
| `@` | A | `75.2.60.5` |
| `www` | CNAME | `apex-loadbalancer.netlify.com` |

## Step 4 — Verify

DNS changes take anywhere from minutes to a few hours to propagate.

```bash
nslookup -type=MX omotanicaringfoundation.com 8.8.8.8      # expect smtp.google.com
nslookup -type=TXT omotanicaringfoundation.com 8.8.8.8     # expect v=spf1 ...
nslookup -type=TXT _dmarc.omotanicaringfoundation.com 8.8.8.8
```

Then send a real test message from an outside account (a personal Gmail) to
`info@omotanicaringfoundation.com`, and reply from it. Confirm the reply is *not*
flagged as spam — check the recipient's headers for `SPF: PASS` and `DKIM: PASS`.

## Step 5 — Contact form

The contact form at [`site/contact-us.html`](../site/contact-us.html) now uses
**Netlify Forms**, which is independent of the mailbox above and works today.

In the Netlify dashboard: **Forms** (enable if prompted) → **Form notifications**
→ *Add notification* → **Email notification** → set the recipient.

Point it at `omotanicaringfoundation@gmail.com` now, and switch it to
`info@omotanicaringfoundation.com` once Workspace is live.

Netlify only registers the form after it has deployed the new markup, so deploy
first — the form will not appear in that panel until then.

Submissions are also stored in the Netlify dashboard, so nothing is lost even if
email delivery fails.

## Outstanding items

All of these live in the Supabase `footer_settings` table, which
[`site/js/footer-loader.js`](../site/js/footer-loader.js) uses to overwrite the
footer on all 47 pages at page load. Values there win over anything hardcoded in
the HTML. Edit them in **Admin → Footer Settings** (the anon key is read-only on
this table, so they cannot be changed by script).

- [x] **`ein`** corrected from the placeholder `12-3456789` to **`85-2581703`**
      (2026-09-28). Donors use this to verify 501(c)(3) status and substantiate
      deductions, so it must stay accurate.
- [x] **`contact_email`** corrected from `info@omotanifoundation.org` (an
      unregistered domain that could never receive mail) to the interim
      **`omotanicaringfoundation@gmail.com`** (2026-09-28).
- [x] **`copyright_year`** cleared to `null`, so the footer now tracks the
      current year automatically
      (`settings.copyright_year || new Date().getFullYear()`).
- [ ] **Cut over to `info@omotanicaringfoundation.com`** once Google Workspace is
      live: clear the `contact_email` override so the address already hardcoded
      in the site HTML takes effect, and set the Gmail account to forward to the
      new mailbox so no in-flight threads are lost.

### Note on the stale schema file

[`database/admin-content-tables.sql`](../database/admin-content-tables.sql) does
**not** match the live database. It declares `email`, `address_line1`,
`address_city` and `foundation_text`, whereas the live table has
`contact_email`, `address_street`, `address_city_state` and
`foundation_description`. Its RLS policies (`FOR ALL USING (true)`) are also not
what is deployed — anon writes are in fact rejected. Treat the file as historical
and do not re-run it against production.
