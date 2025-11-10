# Pure Bookmark

A clean and minimal Chrome extension for managing bookmarks via Side Panel.

## Features

- 📌 Display all bookmarks in a persistent side panel
- 🔍 Fast search across bookmark titles and URLs
- 📁 Collapsible folder structure
- 🎯 Favicon display for each bookmark
- ⚡ Lightweight and fast

## Installation

1. Clone or download this repository
2. Add icons to the `icons/` folder (see `icons/README.md`)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top-right corner)
5. Click "Load unpacked"
6. Select the `pure-bookmark` folder

## Usage

1. Click the extension icon in Chrome toolbar
2. The side panel will open showing your bookmarks
3. Click any bookmark to open it in a new tab
4. Click folder names to expand/collapse them
5. Use the search box to filter bookmarks

## Requirements

- Chrome 114 or later (for Side Panel API support)

## Structure

```
pure-bookmark/
├── manifest.json       # Extension configuration
├── sidepanel.html      # Side panel UI structure
├── sidepanel.css       # Styles
├── sidepanel.js        # Core logic
└── icons/              # Extension icons
```

## Technical Details

- Uses Chrome Bookmarks API to read bookmark tree
- Side Panel API for persistent panel display
- Pure vanilla JavaScript (no frameworks)
- Recursive rendering for bookmark tree structure
- Real-time search filtering

## License

MIT
