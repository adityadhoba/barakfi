# Launch distribution copy (Barakfi)

Tone: helpful, not salesy. Copy and adapt before posting.

---

## Google Search Console (manual)

1. Go to [Google Search Console](https://search.google.com/search-console) and add the property `https://barakfi.in` (DNS or HTML file verification as prompted).
2. Submit the sitemap URL: `https://barakfi.in/sitemap.xml`
3. Use **URL Inspection** on a few stock pages (e.g. `https://barakfi.in/stocks/INFY`) and click **Request indexing** for the first batch if needed.
4. Stock pages are listed in the Next.js sitemap (`frontend/src/app/sitemap.ts`); `robots.txt` allows crawling of public routes and disallows `/api/` (API is on a separate host in production).

---

## Reddit (one post)

**Title (example):** Is there a simple way to check if a stock is halal before you buy?

A lot of Muslim investors get stuck in PDFs and conflicting blog posts. I wanted something that runs the boring part for you: pull public numbers, run a few mainstream Shariah screens side by side, and show where they agree (or not).

I’ve been building a small checker for Indian names (and some global tickers) called Barakfi. It’s not a fatwa machine—just a way to get a clear snapshot before you talk to a scholar or your fund.

If you’ve been burned by vague “halal lists” before, try it and tell me what’s confusing. Honest feedback helps more than hype.

---

## Twitter / X (five short posts)

1. Honest question: how do you currently decide if a stock is halal for *your* portfolio—not someone else’s thread?
2. Most “halal stock” posts show one opinion. Markets are messier: debt, income mix, and which standard you use all change the answer.
3. Built a tiny tool that compares several published screens on the same filings. Still not a fatwa—just fewer spreadsheets for you.
4. If you’ve ever bought a name and *then* found a ratio that worried you—what would have helped *before* you clicked buy?
5. Barakfi: quick multi-methodology snapshot for stocks you’re researching. Try one ticker you care about; reply with what felt unclear.

---

## WhatsApp (shareable)

Assalamu alaikum—if you’re researching stocks and tired of random “halal / not halal” takes, there’s a free checker that shows several mainstream Shariah screens on the same company (with sources from public data). Not a fatwa—just a clearer starting point: https://barakfi.in — feedback welcome.
