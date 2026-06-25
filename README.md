# AI Transportation — AtkinsRéalis Branded Redesign

Desktop-first 16:9 redesign of the 25-slide source presentation using the official AtkinsRéalis color and typography guidance.

## Deliverables

- `AI-Transportation-AtkinsRealis-Editable.html` — editable Frontend Slides deck
- `AI in Transportation Planning and Engineering - AtkinsRealis Branded Editable.pptx` — editable PowerPoint
- `assets/illustrations/` — organized illustration assets
- `assets/atkinsrealis-logo-dark.png` and `assets/atkinsrealis-logo-light.png` — presentation-ready brand marks
- `source/source-deck.json` — extracted source content and speaker notes

## HTML editing

Open the HTML file in a browser.

- Arrow keys, Space, Page Up, and Page Down navigate.
- Press `E`, or hover the upper-left corner and click **Edit**.
- **Pages** opens the slide sidebar.
- Click text in edit mode to change it.
- **Unlock layout** converts the current slide's locked content slots into movable objects.
- **Save** or `Ctrl+S` stores edits locally.
- **Export HTML** downloads a standalone edited copy.

The deck is explicitly configured as desktop-only: `data-mobile-adaptation="desktop-default"`.

When content exceeds the visible body area, the HTML body panel scrolls while the slide title stays fixed. Mouse-wheel navigation advances slides only after the active content panel reaches its top or bottom.

## Rebuild

The HTML contains the embedded source data used by the PowerPoint exporter.

```powershell
$env:NODE_PATH='C:\Users\xings\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules;C:\Users\xings\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'
node scripts\build-html.js
node scripts\export-pptx.js
```

The scripts preserve the original 25-slide order, visible source text, and speaker notes. The PowerPoint uses Arial as the official AtkinsRéalis system-font fallback because Gamechanger and Bienvenue are not installed in this workspace.
