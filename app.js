// InkPad — app.js
// Human-crafted Markdown Note Editor & Live Parser

(function () {
  'use strict';

  // --- Initial Sample Notes ---
  const DEFAULT_NOTES = [
    {
      id: 'note-1',
      title: 'Welcome to InkPad ✨',
      content: `# Welcome to InkPad ✨\n\nA distraction-free, responsive markdown workspace.\n\n### Key Features\n- **Real-time Live Preview** as you type\n- **Local persistence**: Automatically saved to your browser\n- **Keyboard shortcuts**: \`Ctrl+S\`, \`Ctrl+N\`, \`Ctrl+B\`, \`Ctrl+I\`\n- Export to **HTML** or **Plain Text**\n\n> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra\n\n\`\`\`javascript\n// Quick code snippet example\nfunction sayHello(name) {\n  console.log(\`Hello, \${name}!\`);\n}\nsayHello('Writer');\n\`\`\`\n\nFeel free to edit this or hit **+ New Note** to begin!`,
      createdAt: Date.now() - 3600000 * 24 * 2,
      modifiedAt: Date.now() - 3600000 * 4
    },
    {
      id: 'note-2',
      title: 'Weekend Project Checklist 🚀',
      content: `# Weekend Project Checklist 🚀\n\nIdeas to build or explore this weekend:\n\n1. Design intuitive dashboard UI with custom CSS variables\n2. Implement lightweight Markdown tokenizer\n3. Optimize mobile responsive drawer layout\n4. Add Web Audio sound effects for Pomodoro timer\n\n---\n\n*Remember to take breaks and drink water!*`,
      createdAt: Date.now() - 3600000 * 24,
      modifiedAt: Date.now() - 3600000 * 2
    },
    {
      id: 'note-3',
      title: 'Markdown Cheat Sheet 📝',
      content: `# Markdown Cheat Sheet 📝\n\nQuick syntax reference:\n\n## Headings\n# Heading 1\n## Heading 2\n### Heading 3\n\n## Emphasis\n*Italic text* or _italic_\n**Bold text** or __bold__\n\n## Lists\n- Bullet item A\n- Bullet item B\n\n1. Numbered item 1\n2. Numbered item 2\n\n## Links & Images\n[Visit GitHub](https://github.com)\n![Sample Image](https://via.placeholder.com/300x120)`,
      createdAt: Date.now() - 3600000 * 12,
      modifiedAt: Date.now() - 3600000
    }
  ];

  // --- State ---
  let notes = [];
  try {
    const raw = localStorage.getItem('inkpad_notes');
    notes = raw ? JSON.parse(raw) : DEFAULT_NOTES;
  } catch (e) {
    notes = DEFAULT_NOTES;
  }

  let activeNoteId = notes.length > 0 ? notes[0].id : null;
  let saveTimeout = null;

  // --- DOM Elements ---
  const themeToggle = document.getElementById('themeToggle');
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const sortSelect = document.getElementById('sortSelect');
  const notesList = document.getElementById('notesList');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');

  const mdEditor = document.getElementById('mdEditor');
  const noNotePlaceholder = document.getElementById('noNotePlaceholder');
  const previewContent = document.getElementById('previewContent');

  const wordCount = document.getElementById('wordCount');
  const charCount = document.getElementById('charCount');
  const readTime = document.getElementById('readTime');
  const saveStatus = document.getElementById('saveStatus');

  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const exportTxtBtn = document.getElementById('exportTxtBtn');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalCancel = document.getElementById('modalCancel');
  const modalConfirm = document.getElementById('modalConfirm');

  // --- Theme ---
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('inkpad_theme') || 'dark';
  root.setAttribute('data-theme', storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = root.getAttribute('data-theme') || 'dark';
      const nxt = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nxt);
      localStorage.setItem('inkpad_theme', nxt);
    });
  }

  // --- Handcrafted Lightweight Markdown Parser ---
  function parseMarkdown(md) {
    if (!md) return '<div class="preview-empty"><p>Start typing in the editor...</p></div>';

    let html = md;

    // Escape raw HTML entities to prevent basic injections
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks ```code```
    html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, function (_, lang, code) {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Horizontal Rule --- or ***
    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />');

    // Headings # through ######
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Blockquotes >
    html = html.replace(/^\> (.*$)/gim, '<blockquote><p>$1</p></blockquote>');

    // Images ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />');

    // Links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bold **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic *text* or _text_
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Split paragraphs and lists
    const lines = html.split('\n');
    let inUl = false;
    let inOl = false;
    let result = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Unordered list - or *
      if (/^\s*[\-\*]\s+(.*)/.test(line)) {
        if (!inUl) {
          result.push('<ul>');
          inUl = true;
        }
        result.push(line.replace(/^\s*[\-\*]\s+(.*)/, '<li>$1</li>'));
        continue;
      } else if (inUl) {
        result.push('</ul>');
        inUl = false;
      }

      // Ordered list 1.
      if (/^\s*\d+\.\s+(.*)/.test(line)) {
        if (!inOl) {
          result.push('<ol>');
          inOl = true;
        }
        result.push(line.replace(/^\s*\d+\.\s+(.*)/, '<li>$1</li>'));
        continue;
      } else if (inOl) {
        result.push('</ol>');
        inOl = false;
      }

      // Skip empty lines or wrap non-block elements in <p>
      if (line.trim() === '') {
        result.push('');
      } else if (
        !line.startsWith('<h') &&
        !line.startsWith('<pre') &&
        !line.startsWith('<blockquote') &&
        !line.startsWith('<hr')
      ) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push(line);
      }
    }

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  // --- Stats Calculation ---
  function updateStats(text) {
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);

    if (charCount) charCount.textContent = `${chars} chars`;
    if (wordCount) wordCount.textContent = `${words} words`;
    if (readTime) readTime.textContent = `~${minutes} min read`;
  }

  // --- Save Persistence ---
  function saveToLocalStorage() {
    localStorage.setItem('inkpad_notes', JSON.stringify(notes));
    if (saveStatus) saveStatus.textContent = 'All saved';
  }

  function triggerAutoSave() {
    if (saveStatus) saveStatus.textContent = 'Saving…';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToLocalStorage();
    }, 1200);
  }

  // --- Title Auto Extraction ---
  function extractTitle(content) {
    const firstLine = content.trim().split('\n')[0] || '';
    const clean = firstLine.replace(/^[#\s\-\*]+/, '').trim();
    return clean || 'Untitled Note';
  }

  // --- Render Notes Sidebar List ---
  function renderNotesList() {
    if (!notesList) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const sortBy = sortSelect ? sortSelect.value : 'modified';

    let filtered = notes.filter(n => {
      if (!query) return true;
      return n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query);
    });

    filtered.sort((a, b) => {
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      if (sortBy === 'alpha') return a.title.localeCompare(b.title);
      return b.modifiedAt - a.modifiedAt;
    });

    notesList.innerHTML = '';

    if (notes.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (noResults) noResults.style.display = 'none';
      selectNote(null);
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
    }

    if (filtered.length === 0) {
      if (noResults) noResults.style.display = 'flex';
      return;
    } else {
      if (noResults) noResults.style.display = 'none';
    }

    filtered.forEach(note => {
      const item = document.createElement('div');
      item.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
      item.dataset.id = note.id;

      const dateStr = new Date(note.modifiedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      const previewText = note.content
        .replace(/^[#\s\-\*]+/gm, '')
        .replace(/\n+/g, ' ')
        .slice(0, 80);

      item.innerHTML = `
        <div class="note-item-header">
          <span class="note-item-title">${escapeHtml(note.title)}</span>
          <span class="note-item-date">${dateStr}</span>
        </div>
        <p class="note-item-preview">${escapeHtml(previewText || 'Empty note')}</p>
      `;

      item.addEventListener('click', () => selectNote(note.id));
      notesList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Select Note ---
  function selectNote(id) {
    activeNoteId = id;
    const current = notes.find(n => n.id === id);

    if (!current) {
      if (mdEditor) mdEditor.style.display = 'none';
      if (noNotePlaceholder) noNotePlaceholder.style.display = 'flex';
      if (previewContent) previewContent.innerHTML = '<div class="preview-empty"><p>No note selected</p></div>';
      updateStats('');
      return;
    }

    if (mdEditor) {
      mdEditor.style.display = 'block';
      mdEditor.value = current.content;
    }
    if (noNotePlaceholder) noNotePlaceholder.style.display = 'none';

    if (previewContent) {
      previewContent.innerHTML = parseMarkdown(current.content);
    }

    updateStats(current.content);
    renderNotesList();
  }

  // --- Create Note ---
  function createNewNote() {
    const newNote = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      content: '# Untitled Note\n\nWrite something brilliant here…',
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    notes.unshift(newNote);
    saveToLocalStorage();
    selectNote(newNote.id);
    if (mdEditor) {
      mdEditor.focus();
      mdEditor.setSelectionRange(mdEditor.value.length, mdEditor.value.length);
    }
  }

  // --- Delete Note ---
  function deleteActiveNote() {
    if (!activeNoteId) return;
    notes = notes.filter(n => n.id !== activeNoteId);
    activeNoteId = notes.length > 0 ? notes[0].id : null;
    saveToLocalStorage();
    selectNote(activeNoteId);
    if (modalOverlay) modalOverlay.style.display = 'none';
  }

  // --- Editor Input Handler ---
  if (mdEditor) {
    mdEditor.addEventListener('input', () => {
      const active = notes.find(n => n.id === activeNoteId);
      if (!active) return;

      active.content = mdEditor.value;
      active.title = extractTitle(active.content);
      active.modifiedAt = Date.now();

      if (previewContent) {
        previewContent.innerHTML = parseMarkdown(active.content);
      }

      updateStats(active.content);
      triggerAutoSave();

      // Refresh list title without losing cursor
      const activeItemTitle = document.querySelector(`.note-item[data-id="${active.id}"] .note-item-title`);
      if (activeItemTitle) {
        activeItemTitle.textContent = active.title;
      }
    });

    // Tab key support in textarea
    mdEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = mdEditor.selectionStart;
        const end = mdEditor.selectionEnd;
        mdEditor.value = mdEditor.value.substring(0, start) + '  ' + mdEditor.value.substring(end);
        mdEditor.selectionStart = mdEditor.selectionEnd = start + 2;
        mdEditor.dispatchEvent(new Event('input'));
      }
    });
  }

  // --- Toolbar Insertion Actions ---
  function insertFormat(prefix, suffix = '') {
    if (!mdEditor || !activeNoteId) return;
    const start = mdEditor.selectionStart;
    const end = mdEditor.selectionEnd;
    const text = mdEditor.value;
    const selected = text.substring(start, end) || 'text';

    mdEditor.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    mdEditor.selectionStart = start + prefix.length;
    mdEditor.selectionEnd = start + prefix.length + selected.length;
    mdEditor.focus();
    mdEditor.dispatchEvent(new Event('input'));
  }

  document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'heading': insertFormat('## '); break;
        case 'bold': insertFormat('**', '**'); break;
        case 'italic': insertFormat('*', '*'); break;
        case 'link': insertFormat('[Link Title](', 'https://example.com)'); break;
        case 'image': insertFormat('![Alt description](', 'https://images.unsplash.com)'); break;
        case 'code': insertFormat('`', '`'); break;
        case 'codeblock': insertFormat('```javascript\n', '\n```'); break;
        case 'ul': insertFormat('- '); break;
        case 'ol': insertFormat('1. '); break;
        case 'blockquote': insertFormat('> '); break;
        case 'hr': insertFormat('\n---\n'); break;
      }
    });
  });

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToLocalStorage();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewNote();
      } else if (e.key.toLowerCase() === 'b' && document.activeElement === mdEditor) {
        e.preventDefault();
        insertFormat('**', '**');
      } else if (e.key.toLowerCase() === 'i' && document.activeElement === mdEditor) {
        e.preventDefault();
        insertFormat('*', '*');
      }
    }
  });

  // --- Search & Sorting ---
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearch) clearSearch.style.display = searchInput.value ? 'block' : 'none';
      renderNotesList();
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.style.display = 'none';
      renderNotesList();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', renderNotesList);
  }

  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', createNewNote);
  }

  // --- Export Actions ---
  if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', () => {
      const active = notes.find(n => n.id === activeNoteId);
      if (!active) return;
      const htmlBody = parseMarkdown(active.content);
      const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${active.title}</title><style>body{font-family:Inter,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222;}pre{background:#f4f4f4;padding:12px;border-radius:6px;}blockquote{border-left:4px solid #0078d4;margin:0;padding-left:16px;color:#555;}</style></head><body>${htmlBody}</body></html>`;
      downloadBlob(fullDoc, `${active.title.replace(/[^a-z0-9]/gi, '_')}.html`, 'text/html');
    });
  }

  if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', () => {
      const active = notes.find(n => n.id === activeNoteId);
      if (!active) return;
      downloadBlob(active.content, `${active.title.replace(/[^a-z0-9]/gi, '_')}.txt`, 'text/plain');
    });
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Delete Modal ---
  if (deleteNoteBtn) {
    deleteNoteBtn.addEventListener('click', () => {
      if (!activeNoteId) return;
      if (modalOverlay) modalOverlay.style.display = 'flex';
    });
  }

  if (modalCancel) {
    modalCancel.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.style.display = 'none';
    });
  }

  if (modalConfirm) {
    modalConfirm.addEventListener('click', deleteActiveNote);
  }

  // --- Startup ---
  renderNotesList();
  if (activeNoteId) {
    selectNote(activeNoteId);
  }
})();
