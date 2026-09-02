# Corporate Bank Balance Monitor Demo

This demo uses the same interface as the normal PWA, including mobile bottom navigation, overview, charts, balances, actions, and admin pages.

It is sample-data only:

- No Gmail connection
- No production SQLite database
- No real PDF parsing
- Manual entry and admin actions update only in-memory demo data while the page is open

## Local Run

```powershell
python -m http.server 8510
```

Open http://localhost:8510/

Login with any username and password.

Use the `Desktop` / `Mobile` toggle in the top bar to preview both layouts from the same dashboard link.

## Deploy Demo Live With GitHub Pages

This demo can be hosted with GitHub Pages because it is a static HTML/CSS/JS dashboard.

1. Push these files to a public GitHub repository.
2. Open the repository **Settings** page.
3. Go to **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Select branch **main** and folder **/ (root)**.
6. Save.

After deployment, GitHub Pages gives a live URL like:

```text
https://shanakarajapakshe.github.io/cbb-monitor-demo/
```

Important: deploy only this `demo_dashboard` folder for public demo sharing. Do not expose `.env`, `data/`, `storage/`, or real bank/PDF files in a public repository.
