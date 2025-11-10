// State
let draggedNode = null;
let draggedParentId = null;
const expandedFolders = new Set();
let lastScrollPosition = 0;

// Listen for bookmark changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'BOOKMARK_CHANGED') {
    reloadBookmarks();
  }
});

// Get bookmarks and render
chrome.bookmarks.getTree((bookmarkTree) => {
  const rootNode = bookmarkTree[0];
  const container = document.getElementById('bookmarkTree');

  // Render root children
  if (rootNode.children) {
    rootNode.children.forEach(child => {
      if (child.children) {
        child.children.forEach(node => renderNode(node, container, 0, child.id));
      }
    });
  }
});

// Recursively render bookmark nodes
function renderNode(node, parentElement, depth, parentId = null) {
  if (!node.title && !node.url) return;

  if (node.children) {
    renderFolder(node, parentElement, depth, parentId);
  } else {
    renderBookmark(node, parentElement, depth, parentId);
  }
}

// Render a folder
function renderFolder(node, parentElement, depth, parentId) {
  const folderContainer = document.createElement('div');
  folderContainer.className = 'folder-container';
  folderContainer.dataset.title = node.title.toLowerCase();
  folderContainer.dataset.bookmarkId = node.id;
  folderContainer.dataset.parentId = parentId;

  const folderItem = document.createElement('div');
  folderItem.className = 'folder-item';
  folderItem.style.paddingLeft = `${depth * 16 + 16}px`;
  folderItem.draggable = true;
  folderItem.dataset.bookmarkId = node.id;
  folderItem.dataset.parentId = parentId;

  // Chevron
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'chevron');
  chevron.setAttribute('width', '20');
  chevron.setAttribute('height', '20');
  chevron.setAttribute('viewBox', '0 0 20 20');
  chevron.innerHTML = '<path d="M7 5l5 5-5 5" stroke="#666" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';

  // Folder icon
  const folderIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  folderIcon.setAttribute('class', 'folder-icon');
  folderIcon.setAttribute('width', '20');
  folderIcon.setAttribute('height', '20');
  folderIcon.setAttribute('viewBox', '0 0 20 20');
  folderIcon.innerHTML = '<path d="M2 4a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" fill="#FFA500"/>';

  const folderName = document.createElement('span');
  folderName.className = 'folder-name';
  folderName.textContent = node.title;

  folderItem.appendChild(chevron);
  folderItem.appendChild(folderIcon);
  folderItem.appendChild(folderName);

  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'folder-children';

  // Render children
  if (node.children) {
    node.children.forEach(child => renderNode(child, childrenContainer, depth + 1, node.id));
  }

  // Restore expanded state
  if (expandedFolders.has(node.id)) {
    chevron.classList.add('expanded');
    childrenContainer.classList.add('expanded');
  }

  // Toggle folder
  folderItem.addEventListener('click', (e) => {
    if (e.target === folderItem || e.target === chevron || e.target === folderIcon || e.target === folderName) {
      const isExpanding = !chevron.classList.contains('expanded');
      chevron.classList.toggle('expanded');
      childrenContainer.classList.toggle('expanded');

      // Update state
      if (isExpanding) {
        expandedFolders.add(node.id);
      } else {
        expandedFolders.delete(node.id);
      }
    }
  });

  // Drag events
  setupDragEvents(folderItem, node, parentId, true);

  // Right-click menu
  folderItem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, node, folderContainer);
  });

  folderContainer.appendChild(folderItem);
  folderContainer.appendChild(childrenContainer);
  parentElement.appendChild(folderContainer);
}

// Render a bookmark
function renderBookmark(node, parentElement, depth, parentId) {
  const bookmarkItem = document.createElement('div');
  bookmarkItem.className = 'bookmark-item';
  bookmarkItem.style.paddingLeft = `${depth * 16 + 16}px`;
  bookmarkItem.dataset.title = node.title.toLowerCase();
  bookmarkItem.dataset.url = node.url.toLowerCase();
  bookmarkItem.dataset.bookmarkId = node.id;
  bookmarkItem.dataset.parentId = parentId;
  bookmarkItem.draggable = true;

  // Favicon - use Google's favicon service (works reliably)
  const favicon = document.createElement('img');
  favicon.className = 'bookmark-icon';

  try {
    const url = new URL(node.url);
    favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
  } catch (e) {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4z" fill="%23999"/></svg>';
  }

  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4z" fill="%23999"/></svg>';
  };

  const bookmarkName = document.createElement('span');
  bookmarkName.className = 'bookmark-name';
  bookmarkName.textContent = node.title;

  bookmarkItem.appendChild(favicon);
  bookmarkItem.appendChild(bookmarkName);

  // Open bookmark on click
  bookmarkItem.addEventListener('click', () => {
    chrome.tabs.create({ url: node.url });
  });

  // Drag events
  setupDragEvents(bookmarkItem, node, parentId, false);

  // Right-click menu
  bookmarkItem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, node, bookmarkItem);
  });

  parentElement.appendChild(bookmarkItem);
}

// Setup drag and drop
function setupDragEvents(element, node, nodeParentId, isFolder) {
  // Drag start
  element.addEventListener('dragstart', (e) => {
    draggedNode = node;
    draggedParentId = nodeParentId;
    element.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });

  element.addEventListener('dragend', () => {
    element.style.opacity = '1';
    // Remove all drop indicators
    document.querySelectorAll('.drop-before, .drop-into').forEach(el => {
      el.classList.remove('drop-before', 'drop-into');
    });
    // Delay clearing to ensure drop event completes first
    setTimeout(() => {
      draggedNode = null;
      draggedParentId = null;
    }, 50);
  });

  // Drag over - determine drop action
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedNode || draggedNode.id === node.id) return;

    e.dataTransfer.dropEffect = 'move';

    // Remove previous indicators
    document.querySelectorAll('.drop-before, .drop-into').forEach(el => {
      el.classList.remove('drop-before', 'drop-into');
    });

    if (isFolder) {
      // Check if mouse is in bottom half (move into folder)
      const rect = element.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const threshold = rect.height * 0.6;

      if (mouseY > threshold) {
        // Move into folder
        element.classList.add('drop-into');
      } else {
        // Insert before folder
        element.classList.add('drop-before');
      }
    } else {
      // Bookmark - only insert before
      element.classList.add('drop-before');
    }
  });

  element.addEventListener('dragleave', (e) => {
    // Only remove if leaving the element completely
    if (!element.contains(e.relatedTarget)) {
      element.classList.remove('drop-before', 'drop-into');
    }
  });

  // Drop - execute move
  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Save references immediately (dragend might clear them)
    const movedNode = draggedNode;
    const movedParentId = draggedParentId;

    if (!movedNode || movedNode.id === node.id) {
      element.classList.remove('drop-before', 'drop-into');
      return;
    }

    const dropInto = element.classList.contains('drop-into');
    element.classList.remove('drop-before', 'drop-into');

    console.log('Drop:', {
      draggedNode: movedNode.id,
      draggedParentId: movedParentId,
      targetNode: node.id,
      targetParentId: nodeParentId,
      dropInto,
      isFolder
    });

    if (dropInto && isFolder) {
      // Move into folder
      chrome.bookmarks.move(movedNode.id, { parentId: node.id }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Move into folder failed:', chrome.runtime.lastError);
        } else {
          console.log('Move into folder success:', result);
          reloadBookmarks();
        }
      });
    } else {
      // Insert before this node - need to get target's current position
      chrome.bookmarks.get(node.id, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Get node failed:', chrome.runtime.lastError);
          return;
        }

        if (results && results[0]) {
          const targetNode = results[0];
          console.log('Target node info:', targetNode);

          // Calculate correct index
          let targetIndex = targetNode.index;

          // If moving within same parent and dragged item is before target,
          // don't adjust index (move will remove item first, shifting indices)
          if (movedParentId === nodeParentId) {
            chrome.bookmarks.get(movedNode.id, (draggedResults) => {
              if (draggedResults && draggedResults[0]) {
                const draggedIndex = draggedResults[0].index;
                // If dragged item is before target in same parent, target index stays same
                // If dragged item is after target, we want the current target index
                if (draggedIndex < targetIndex) {
                  targetIndex = targetIndex - 1;
                }
              }

              console.log('Moving to:', { parentId: nodeParentId, index: targetIndex });
              chrome.bookmarks.move(movedNode.id, {
                parentId: nodeParentId,
                index: targetIndex
              }, (result) => {
                if (chrome.runtime.lastError) {
                  console.error('Move before failed:', chrome.runtime.lastError);
                } else {
                  console.log('Move before success:', result);
                  reloadBookmarks();
                }
              });
            });
          } else {
            // Moving to different parent, use target index directly
            console.log('Moving to different parent:', { parentId: nodeParentId, index: targetIndex });
            chrome.bookmarks.move(movedNode.id, {
              parentId: nodeParentId,
              index: targetIndex
            }, (result) => {
              if (chrome.runtime.lastError) {
                console.error('Move before (different parent) failed:', chrome.runtime.lastError);
              } else {
                console.log('Move before (different parent) success:', result);
                reloadBookmarks();
              }
            });
          }
        }
      });
    }
  });
}

// Context menu
function showContextMenu(e, node, element) {
  // Remove existing menu
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  const renameOption = document.createElement('div');
  renameOption.className = 'context-menu-item';
  renameOption.textContent = 'Rename';
  renameOption.onclick = () => {
    menu.remove();
    showRenameDialog(e.clientX, e.clientY, node);
  };

  const deleteOption = document.createElement('div');
  deleteOption.className = 'context-menu-item';
  deleteOption.textContent = 'Delete';
  deleteOption.onclick = () => {
    menu.remove();
    showConfirmDialog(e.clientX, e.clientY, node);
  };

  menu.appendChild(renameOption);
  menu.appendChild(deleteOption);
  document.body.appendChild(menu);

  // Close menu on click outside
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

// Show rename dialog
function showRenameDialog(x, y, node) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  // Position near click
  dialog.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
  dialog.style.top = `${Math.min(y, window.innerHeight - 200)}px`;

  const title = document.createElement('div');
  title.className = 'dialog-title';
  title.textContent = 'Rename';

  const input = document.createElement('input');
  input.className = 'dialog-input';
  input.type = 'text';
  input.value = node.title;
  input.placeholder = 'Enter name';

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'dialog-btn dialog-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement('button');
  saveBtn.className = 'dialog-btn dialog-btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== node.title) {
      chrome.bookmarks.update(node.id, { title: newTitle }, () => {
        reloadBookmarks();
        overlay.remove();
      });
    } else {
      overlay.remove();
    }
  };

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  dialog.appendChild(title);
  dialog.appendChild(input);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus input and select all
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);

  // Enter to save, Escape to cancel
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    } else if (e.key === 'Escape') {
      overlay.remove();
    }
  });

  // Click overlay to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// Show confirm dialog
function showConfirmDialog(x, y, node) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  // Position near click
  dialog.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
  dialog.style.top = `${Math.min(y, window.innerHeight - 200)}px`;

  const title = document.createElement('div');
  title.className = 'dialog-title';
  title.textContent = 'Delete';

  const message = document.createElement('div');
  message.className = 'dialog-message';
  message.textContent = `Delete "${node.title}"?`;
  if (node.children && node.children.length > 0) {
    const warning = document.createElement('div');
    warning.className = 'dialog-warning';
    warning.textContent = `This will also delete ${node.children.length} item(s) inside.`;
    message.appendChild(warning);
  }

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'dialog-btn dialog-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => overlay.remove();

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'dialog-btn dialog-btn-danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => {
    if (node.children) {
      chrome.bookmarks.removeTree(node.id, () => {
        reloadBookmarks();
        overlay.remove();
      });
    } else {
      chrome.bookmarks.remove(node.id, () => {
        reloadBookmarks();
        overlay.remove();
      });
    }
  };

  actions.appendChild(cancelBtn);
  actions.appendChild(deleteBtn);

  dialog.appendChild(title);
  dialog.appendChild(message);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus delete button
  setTimeout(() => deleteBtn.focus(), 0);

  // Escape to cancel
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Click overlay to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// Reload bookmarks
function reloadBookmarks() {
  const container = document.getElementById('bookmarkTree');

  // Save scroll position
  lastScrollPosition = container.scrollTop;

  container.innerHTML = '';

  chrome.bookmarks.getTree((bookmarkTree) => {
    const rootNode = bookmarkTree[0];
    if (rootNode.children) {
      rootNode.children.forEach(child => {
        if (child.children) {
          child.children.forEach(node => renderNode(node, container, 0, child.id));
        }
      });
    }

    // Restore scroll position after render
    requestAnimationFrame(() => {
      container.scrollTop = lastScrollPosition;
    });
  });
}

// Search functionality
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const bookmarkItems = document.querySelectorAll('.bookmark-item');
  const folderContainers = document.querySelectorAll('.folder-container');

  if (!query) {
    bookmarkItems.forEach(item => item.classList.remove('hidden'));
    folderContainers.forEach(container => {
      container.classList.remove('hidden');
      const chevron = container.querySelector('.chevron');
      const children = container.querySelector('.folder-children');
      const folderId = container.dataset.bookmarkId;

      // Restore to saved state
      if (expandedFolders.has(folderId)) {
        chevron.classList.add('expanded');
        children.classList.add('expanded');
      } else {
        chevron.classList.remove('expanded');
        children.classList.remove('expanded');
      }
    });
    return;
  }

  bookmarkItems.forEach(item => {
    const title = item.dataset.title;
    const url = item.dataset.url;
    if (title.includes(query) || url.includes(query)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });

  folderContainers.forEach(container => {
    const visibleChildren = container.querySelectorAll('.bookmark-item:not(.hidden), .folder-container:not(.hidden)');
    if (visibleChildren.length > 0) {
      container.classList.remove('hidden');
      const chevron = container.querySelector('.chevron');
      const children = container.querySelector('.folder-children');
      chevron.classList.add('expanded');
      children.classList.add('expanded');
    } else {
      container.classList.add('hidden');
    }
  });
});
