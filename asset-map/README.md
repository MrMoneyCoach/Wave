# HouseholdMap

A self-contained, browser-only visual household financial map. Inspired by
the "asset map" concept used by financial planners: a central household with
people, surrounded by their assets, liabilities, insurance coverage, and
cash flows.

## Features

- Visual SVG map: household at center, four category clusters around it,
  with connecting lines.
- Pan (drag) and zoom (wheel / buttons) on the map.
- Add/edit/delete: people, assets, liabilities, insurance policies, and
  cash flows (income & expenses).
- Stats bar: net worth, total assets, total liabilities, total coverage,
  monthly net cash flow.
- Views:
  - **Map** — interactive SVG household map.
  - **List** — grouped, scrollable list of every item.
  - **Reports** — financial health gauges, net-worth bars, asset and
    liability donut charts, insurance coverage bars.
  - **Cash Flow** — monthly income vs. expenses with per-item bars.
- Sample household for instant demo.
- Import / export JSON.
- Print / save to PDF.
- All data is stored locally in your browser (`localStorage`). Nothing is
  sent anywhere.

## Run

No build step. Open `index.html` directly, or serve the folder:

```sh
cd asset-map
python3 -m http.server 8000
# then visit http://127.0.0.1:8000/
```

## File layout

```
asset-map/
  index.html    # app shell
  styles.css    # design system + view styles
  app.js        # bootstrap, view switching
  state.js      # state, persistence, totals
  data.js       # taxonomies + sample household
  forms.js      # drawer forms
  map.js        # SVG household map renderer
  views.js      # list, reports, cash flow renderers
```
