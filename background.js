// Enable side panel toggle on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen to bookmark changes and notify side panel
chrome.bookmarks.onCreated.addListener(() => {
  notifySidePanel();
});

chrome.bookmarks.onRemoved.addListener(() => {
  notifySidePanel();
});

chrome.bookmarks.onChanged.addListener(() => {
  notifySidePanel();
});

chrome.bookmarks.onMoved.addListener(() => {
  notifySidePanel();
});

function notifySidePanel() {
  chrome.runtime.sendMessage({ type: 'BOOKMARK_CHANGED' }).catch(() => {
    // Side panel might not be open, ignore error
  });
}
