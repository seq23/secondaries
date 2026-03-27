# Secondary Deal Economics Dashboard v3

Static HTML/CSS/JS web app for comparing secondary/SPV deal economics.

## What changed in v3

- every core dashboard field remains editable
- reset now loads a saved **industry standards profile**
- added a separate `standards.html` page where you can edit and save your own standards
- standards are stored in browser localStorage, so they persist on the deployed site for that browser
- dashboard shows the current saved standards profile used by reset
- premium / discount section remains editable
- side-by-side structure comparison, XIRR, fee split logic, and SPV overhead logic remain in place

## Files

- `index.html` — live dashboard
- `standards.html` — standards/defaults editor
- `app.js` — shared app logic
- `styles.css` — styles

## Local use

Open `index.html` in a browser.

## GitHub + Cloudflare Pages deploy

This is a static project. No build step is required.

### Cloudflare Pages settings

- Framework preset: None
- Build command: leave blank
- Build output directory: /

## Notes

- Saved standards live in browser storage. They do not sync across browsers or devices unless you add a backend later.
- This is a fast commercial comparison tool, not a substitute for final fund/SPV docs, waterfall counsel review, tax advice, or legal review.
