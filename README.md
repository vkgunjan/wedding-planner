# Wedding Planner

A web app that the bride's and the groom's families use together to plan an Indian wedding and estimate its total cost. It covers the functions, venue, catering, decoration, clothes, jewellery, photography, cards, guest list and planning checklist, and works on phones and computers.

## What it does

- **Setup**: enter the names, the wedding date, the city (or destination), the expected number of guests on each side, and a cost level (Budget, Mid-range or Premium). Then tick the functions you will hold. The app creates every function with its usual expenses and starting prices, plus a checklist of about 70 tasks.
- **Home**: shows the days left, the estimated total (plus a buffer for surprises), the budget, the amount paid and the amount still to pay.
  - **Who pays** splits the total into Bride side, Groom side and Shared. It shows each family's total, including its share of the shared costs, against its own budget.
  - **Where the money goes** ranks the categories (jewellery, catering, clothes and so on). Tap a category to open its items.
  - The home screen also lists the functions with their dates and costs, upcoming payment dates, a guest summary and the next checklist tasks.
- **Functions**: Roka, Sagai/Ring ceremony, Tilak, Pre-wedding shoot, Satyanarayan katha, Matkor, Madwa, Haldi, Mehendi, Sangeet, Bhaat/Mayra, Bachelor party, Baraat and Sehrabandi, the Wedding (Dwar puja, Jaimala, Phere, Kohbar), Vidaai, Griha pravesh and Muh dikhai, Reception/Bahu bhoj, and Chauthari/Pag phera, plus any custom function.
  - Each function has a date, time, venue, host family, guest count, notes and its own list of expenses.
  - Functions held at both homes (Haldi, Matkor, Madwa, Satyanarayan katha, Bhaat) get two entries, one for the bride's home and one for the groom's home.
  - Until a real date is set, each function's date is suggested from the wedding date.
- **Budget**: every expense in one list. You can group it by category, function or who pays, and filter it by family, function, category or status. Each expense has:
  - quantity × rate. For per-plate items, the quantity can follow the function's guest count automatically.
  - the final price once booked, the amount paid so far, the next payment date and the status (Planning → Got quotes → Booked → Fully paid)
  - the vendor name and phone, and notes such as the package details
  - Gold jewellery is entered in grams and priced at the 22K gold rate in Settings, plus making charges and 3% GST. Change the rate and every jewellery item updates.
  - The "Not in your plan yet" chips add common whole-wedding costs: destination venue and rooms, cinematic film, wedding planner, insurance and others.
- **Guests**: the guest list for both sides.
  - Each entry is a person or a family, with the number of people, relation, phone, city, which functions they are invited to, whether the card was sent, their reply, and whether they need a room.
  - **Add many** lets you paste a list (`Name, Phone, People, City` on each line) or import a CSV saved from Excel.
  - **Headcount per function** compares the list with the expected numbers. Once the list is complete, tick "Use the guest list for plate counts", and catering follows the real list.
- **Checklist**: tasks from 12 months before to after the wedding, each with a "do by" date worked out from the wedding date. Filter by family and tick tasks off as they're done.
- **Export**: download an Excel file (Summary, Expenses, Functions, Guests and Checklist sheets) or print a budget report.

The starting prices are 2025–26 figures for Patna and other tier-2 cities, taken from vendor listings and wedding price guides (sources are listed in **Settings → About the prices**). They are only a starting point, so replace them with real quotes as you get them. Tilak, salami and household gifts are listed as voluntary gifts, because demanding dowry is illegal under the Dowry Prohibition Act, 1961.

## Where the data is saved

1. **In the browser** on each phone or computer, as soon as anything changes. It works offline too.
2. **In GitHub**, once a token is added in Settings. The data is saved to the private `vkgunjan/wedding` repository as `data/wedding.json`.
   - Every save is a commit, so the history shows who changed what and when.
   - The app syncs every minute. Each entry is merged separately, and the most recent change wins, so both families can edit at the same time.

## Setup

### 1. Create the GitHub token (once)

1. On GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it `wedding-planner` and set an expiry (for example, 1 year).
3. Under **Repository access**, choose *Only select repositories* → `wedding`.
4. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**.
5. Generate the token and copy it.

### 2. Connect the app

Open the app, go to **⚙ Settings → GitHub sync**, enter your name, paste the token and tap **Save sync settings**. The owner (`vkgunjan`), repository (`wedding`), branch (`main`) and folder (`data`) are already filled in. When the badge at the top turns green and says **Synced**, it's working.

### 3. Add the other family's phones

In **Settings → Share with family**, tap **Copy family setup link** and send it on WhatsApp. Opening the link on another phone connects it to the same plan in one tap. **The link contains the token, so share it only with family.** If a phone is lost, delete the token on GitHub and make a new one.

On a phone, open the app in Chrome, then tap ⋮ → **Add to Home screen**. It then opens like a normal app.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The page and its styles |
| `app.js` | All the app logic (no build step) |
| `catalog.js` | The functions, expense items, typical prices, gold rate and checklist used for new plans. Edit this file to change the starting prices. |
| `sw.js` | Offline support. Bump `CACHE` together with `APP_VERSION` in `app.js` when you change the app. |
| `manifest.webmanifest`, `icon.svg` | "Add to Home screen" |
