# The Kevin Olson Collection — Draft 0.5 (November 8, 2026)

A private preview of the gallery for Eric and close friends.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Homepage: opening, "From his collection" showcase, Night Garden prints coming soon |
| `gallery.html` | All 150 pieces together, with filters, search and the heart (select) button |
| `piece.html` | One page per piece (`piece.html?id=KO-C007`), with photos, Inquire, Share a story |
| `data.js` | The catalog: every piece, its ID, title, artist and photos (made from the master spreadsheet) |
| `config.js` | One setting: the Google Sheet web address for form submissions |
| `site.css`, `site.js` | Shared design, selections list and forms |
| `images/` | Web-sized photos |
| `google-sheet-script.gs` | The script that writes form submissions into your Google Sheet |

## Step 1: connect the forms to a Google Sheet (about 3 minutes)

1. In Google Drive, open **Kevin Olson Collection** and create a new Google Sheet called **Stories & Inquiries**.
2. In the sheet, click **Extensions › Apps Script**.
3. Delete what's there, paste in everything from `google-sheet-script.gs`, and click **Save**.
4. Click **Deploy › New deployment**. Click the gear and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, approve the Google permission prompt, and copy the **Web app URL**.
6. Open `config.js` and paste the URL between the quotes after `endpoint:`.

Every submission now lands in the **Submissions** tab: date, type (Inquiry, Story, Selection, Print notify), piece ID and title, name, email, phone, note, and a Status column for you to track replies.

Until a URL is pasted in, the site still works and shows the thank-you message, but submissions stay in the visitor's browser only.

## Step 2: put it on GitHub Pages

1. On github.com, create a repository called `kevin-olson-collection`. Public; leave "Add a README" unchecked.
2. Click **uploading an existing file**, open this folder in Finder, select **everything inside it** (Cmd+A), and drag it in. Commit.
3. Go to **Settings › Pages** and set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/kevin-olson-collection/`.

Note: GitHub's web uploader takes up to 100 files at a time. If it complains, upload the HTML/JS/CSS files first, then the `images` folder in a second (and third) upload.

The pages are marked "noindex", so they won't show up in Google search. Anyone with the link can still view them, so share it only with Eric and the family for now.

## How selections work

- The heart on any piece adds it to **My selections** (bottom-right corner). The list is remembered in that person's browser, even if they close the tab.
- They can add a note to each piece, then **Send my selections** once: one row per piece lands in the sheet.
- Sent pieces move to "Already sent", so they keep a running record of everything they've asked about.

## Updating the catalog

`data.js` is generated from `kevin-olson-master-catalog.csv`. Send the updated spreadsheet (new titles, artists, prices) and the site can be regenerated in one step.
