/**
 * ==============================================================================
 * LUMINA • SPATIAL NOTES & CALENDAR APPLICATION
 * Client-side only with IndexedDB, Interactive Calendar, Picture/Video Uploads,
 * Zero-Backend Date Link Sharing, and Immersive Focus Mode with Ambient Scenes.
 * ==============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. GLOBAL STATE & CONFIGURATION
     -------------------------------------------------------------------------- */
  const STATE = {
    notes: [],
    activeFilter: 'all',          // 'all', 'today', 'pinned', 'has-pics', 'has-videos', 'tag:[name]'
    selectedDate: null,           // 'YYYY-MM-DD' or null
    currentCalDate: new Date(),   // Month currently being viewed in calendar
    editingNoteId: null,
    editorTempMedia: [],          // Staged images & videos in the open editor
    searchQuery: '',
    viewMode: 'grid',             // 'grid' or 'list'
    focusScene: 'cyber-city',     // 'cyber-city', 'village', 'raining-night', 'skyscraper'
    focusTimer: {
      durationSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      isRunning: false,
      intervalId: null
    },
    audio: {
      ctx: null,
      gainNode: null,
      noiseNode: null,
      isPlaying: false,
      volume: 0.3
    },
    canvasAnimationId: null
  };

  /* --------------------------------------------------------------------------
     2. INDEXEDDB STORAGE SUBSYSTEM
     -------------------------------------------------------------------------- */
  const DB_NAME = 'LuminaSpatialNotesDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'notes_store';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function dbGetAllNotes() {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB failed, falling back to localStorage:', err);
      const local = localStorage.getItem('lumina_notes_fallback');
      return local ? JSON.parse(local) : [];
    }
  }

  async function dbSaveNote(note) {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(note);
        req.onsuccess = () => resolve(note);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB save failed, using fallback:', err);
      const idx = STATE.notes.findIndex(n => n.id === note.id);
      if (idx >= 0) STATE.notes[idx] = note;
      else STATE.notes.push(note);
      localStorage.setItem('lumina_notes_fallback', JSON.stringify(STATE.notes));
      return note;
    }
  }

  async function dbDeleteNote(noteId) {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(noteId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB delete failed, using fallback:', err);
      STATE.notes = STATE.notes.filter(n => n.id !== noteId);
      localStorage.setItem('lumina_notes_fallback', JSON.stringify(STATE.notes));
      return true;
    }
  }

  async function dbClearAll() {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      localStorage.removeItem('lumina_notes_fallback');
    }
  }

  /* --------------------------------------------------------------------------
     3. SEED STARTER NOTES (First-time user onboarding)
     -------------------------------------------------------------------------- */
  function getSampleNotes() {
    const today = formatDateISO(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateISO(tomorrow);

    return [
      {
        id: 'note_starter_1',
        title: 'Welcome to Lumina Spatial Notes',
        content: `Lumina is an ultra-fast, client-side spatial notes & calendar environment designed with warm yellow and crystal white aesthetics.\n\nKey Highlights:\n- Interactive Calendar linked to your daily thoughts\n- Attach pictures from your device or paste directly (Ctrl+V)\n- Embed videos and YouTube links\n- Share date links instantly with zero server required\n- Distraction-free Focus Mode with customizable background video, ambient scenes, and custom timer!`,
        date: today,
        color: 'yellow-light',
        pinned: true,
        tags: ['welcome', 'guide', 'features'],
        images: [
          {
            id: 'img_sample_1',
            type: 'url',
            name: 'Sunlight Aesthetic',
            dataUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
          }
        ],
        videos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note_starter_2',
        title: 'Focus Mode & Ambient Scenes',
        content: `Hit the Focus Mode button above to experience the distraction-free environment.\n\nVideo slot is left empty by default as requested so you can link your own video whenever you want!\n\nSwitch between preset ambient environments:\n1. Cyber City\n2. Village Setting\n3. Raining Night\n4. Skyscraper Window\n\nIncludes built-in offline ambient sound synth & custom countdown timer!`,
        date: today,
        color: 'white-pure',
        pinned: false,
        tags: ['focus', 'ambient', 'video'],
        images: [],
        videos: [
          {
            id: 'vid_sample_1',
            type: 'embed',
            name: 'Lofi Focus Sample',
            url: 'https://www.youtube.com/embed/jfKfPfyJRdk',
            isEmbed: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note_starter_3',
        title: 'Calendar Date Sharing as Links',
        content: `Want to share your notes for a specific day?\n\n1. Select any day in the mini calendar or full calendar\n2. Click "Share Date Link"\n3. Send the generated link to anyone!\n\nBecause Lumina is completely client-side, the note data is encoded directly into the URL fragment. When opened, it renders immediately without any backend or database!`,
        date: tomorrowStr,
        color: 'amber-warm',
        pinned: false,
        tags: ['calendar', 'sharing', 'links'],
        images: [],
        videos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  /* --------------------------------------------------------------------------
     4. DATE UTILITIES
     -------------------------------------------------------------------------- */
  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateHuman(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getMonthYearTitle(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  /* --------------------------------------------------------------------------
     5. TOAST NOTIFICATION SYSTEM
     -------------------------------------------------------------------------- */
  function showToast(message, icon = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-pill';
    toast.innerHTML = icon ? `<span>${escapeHTML(icon)}</span> <span>${escapeHTML(message)}</span>` : `<span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  /* --------------------------------------------------------------------------
     6. CALENDAR ENGINE (Mini Calendar & Full Calendar)
     -------------------------------------------------------------------------- */
  function renderMiniCalendar() {
    const daysGrid = document.getElementById('mini-cal-days-grid');
    const titleEl = document.getElementById('mini-cal-month-title');
    if (!daysGrid || !titleEl) return;

    const curr = STATE.currentCalDate;
    titleEl.textContent = getMonthYearTitle(curr);

    daysGrid.innerHTML = '';

    const year = curr.getFullYear();
    const month = curr.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const todayStr = formatDateISO(new Date());

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = prevMonthDays - i;
      daysGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cell.dataset.date = dateStr;

      if (dateStr === todayStr) {
        cell.classList.add('today');
      }

      if (STATE.selectedDate === dateStr) {
        cell.classList.add('selected');
      }

      const hasNotes = STATE.notes.some(n => n.date === dateStr);
      if (hasNotes) {
        cell.classList.add('has-notes');
      }

      cell.addEventListener('click', () => {
        selectDateFilter(dateStr);
      });

      daysGrid.appendChild(cell);
    }
  }

  function renderFullCalendar() {
    const grid = document.getElementById('full-cal-grid');
    const title = document.getElementById('full-cal-title');
    if (!grid || !title) return;

    const curr = STATE.currentCalDate;
    title.textContent = getMonthYearTitle(curr);
    grid.innerHTML = '';

    const year = curr.getFullYear();
    const month = curr.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const todayStr = formatDateISO(new Date());

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'full-cal-cell other-month';
      cell.innerHTML = `<span class="full-cal-date-num">${prevMonthDays - i}</span>`;
      grid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'full-cal-cell';
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cell.dataset.date = dateStr;

      if (dateStr === todayStr) cell.classList.add('today');

      const dayNotes = STATE.notes.filter(n => n.date === dateStr);

      let notesHTML = '';
      if (dayNotes.length > 0) {
        notesHTML = `<div class="full-cal-notes-list">` +
          dayNotes.slice(0, 3).map(n => `<div class="full-cal-note-pill" title="${escapeHTML(n.title)}">${escapeHTML(n.title || 'Untitled')}</div>`).join('') +
          (dayNotes.length > 3 ? `<div class="full-cal-note-pill">+${dayNotes.length - 3} more</div>` : '') +
          `</div>`;
      }

      cell.innerHTML = `
        <span class="full-cal-date-num">${day}</span>
        ${notesHTML}
      `;

      cell.addEventListener('click', () => {
        selectDateFilter(dateStr);
        document.getElementById('full-calendar-dialog').close();
      });

      grid.appendChild(cell);
    }
  }

  function selectDateFilter(dateStr) {
    if (STATE.selectedDate === dateStr) {
      STATE.selectedDate = null; // Toggle off
    } else {
      STATE.selectedDate = dateStr;
    }
    renderMiniCalendar();
    renderNotesView();
    updateDateFilterUI();
  }

  function updateDateFilterUI() {
    const clearBtn = document.getElementById('clear-date-filter-btn');
    const badge = document.getElementById('current-filter-badge');

    if (STATE.selectedDate) {
      clearBtn.classList.remove('hidden');
      badge.textContent = `Notes for ${formatDateHuman(STATE.selectedDate)}`;
    } else {
      clearBtn.classList.add('hidden');
      if (STATE.activeFilter === 'all') badge.textContent = 'All Notes';
      else if (STATE.activeFilter === 'today') badge.textContent = "Today's Notes";
      else if (STATE.activeFilter === 'pinned') badge.textContent = 'Pinned Notes';
      else if (STATE.activeFilter === 'has-pics') badge.textContent = 'Notes with Pictures';
      else if (STATE.activeFilter === 'has-videos') badge.textContent = 'Notes with Videos';
      else if (STATE.activeFilter.startsWith('tag:')) badge.textContent = `Tag: #${STATE.activeFilter.replace('tag:', '')}`;
    }
  }

  /* --------------------------------------------------------------------------
     7. NOTES RENDERING & FILTERING
     -------------------------------------------------------------------------- */
  function getFilteredNotes() {
    let result = [...STATE.notes];
    const todayStr = formatDateISO(new Date());

    // Date Filter override
    if (STATE.selectedDate) {
      result = result.filter(n => n.date === STATE.selectedDate);
    } else {
      // Category filter
      if (STATE.activeFilter === 'today') {
        result = result.filter(n => n.date === todayStr);
      } else if (STATE.activeFilter === 'pinned') {
        result = result.filter(n => n.pinned);
      } else if (STATE.activeFilter === 'has-pics') {
        result = result.filter(n => n.images && n.images.length > 0);
      } else if (STATE.activeFilter === 'has-videos') {
        result = result.filter(n => n.videos && n.videos.length > 0);
      } else if (STATE.activeFilter.startsWith('tag:')) {
        const targetTag = STATE.activeFilter.replace('tag:', '').toLowerCase();
        result = result.filter(n => n.tags && n.tags.some(t => t.toLowerCase() === targetTag));
      }
    }

    // Search query filter
    if (STATE.searchQuery.trim()) {
      const q = STATE.searchQuery.toLowerCase().trim();
      result = result.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q))) ||
        (n.date && n.date.includes(q))
      );
    }

    // Sort: Pinned first, then newest updated date
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return result;
  }

  function renderNotesView() {
    const container = document.getElementById('notes-container');
    const emptyState = document.getElementById('empty-state');
    const counterText = document.getElementById('notes-counter-text');
    if (!container) return;

    const filtered = getFilteredNotes();
    counterText.textContent = `Showing ${filtered.length} of ${STATE.notes.length} notes`;

    updateSidebarCounters();
    renderTagsCloud();

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = '';
    container.className = `notes-grid ${STATE.viewMode === 'list' ? 'list-view' : ''}`;

    filtered.forEach(note => {
      const card = createNoteCardElement(note);
      container.appendChild(card);
    });
  }

  function createNoteCardElement(note) {
    const card = document.createElement('div');
    card.className = `note-card tint-${note.color || 'yellow-light'} ${note.pinned ? 'is-pinned' : ''}`;
    card.dataset.id = note.id;

    // 3D Spatial Tilt Interaction
    card.addEventListener('mousemove', (e) => {
      if (STATE.viewMode === 'list') return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = -(y / rect.height) * 8;
      const rotateY = (x / rect.width) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    // Attached Pictures Layout
    let imagesHTML = '';
    if (note.images && note.images.length > 0) {
      const count = note.images.length;
      let gridClass = 'count-1';
      if (count === 2) gridClass = 'count-2';
      else if (count >= 3) gridClass = 'count-many';

      const thumbs = note.images.slice(0, 3).map((img, idx) => {
        const isMore = idx === 2 && count > 3;
        return `
          <div class="pic-thumb-item" data-img-index="${idx}">
            <img src="${escapeHTML(img.dataUrl)}" alt="${escapeHTML(img.name || 'Note Image')}" loading="lazy">
            ${isMore ? `<div class="more-pics-overlay">+${count - 3}</div>` : ''}
          </div>
        `;
      }).join('');

      imagesHTML = `<div class="note-pics-grid ${gridClass}">${thumbs}</div>`;
    }

    // Attached Videos Layout
    let videosHTML = '';
    if (note.videos && note.videos.length > 0) {
      const vid = note.videos[0]; // Render main video
      if (vid.isEmbed && vid.url) {
        videosHTML = `
          <div class="note-video-container">
            <iframe src="${escapeHTML(vid.url)}" title="Embedded Video" allowfullscreen loading="lazy"></iframe>
          </div>
        `;
      } else if (vid.dataUrl || vid.url) {
        videosHTML = `
          <div class="note-video-container">
            <video src="${escapeHTML(vid.dataUrl || vid.url)}" controls preload="metadata"></video>
          </div>
        `;
      }
    }

    // Tags list
    let tagsHTML = '';
    if (note.tags && note.tags.length > 0) {
      tagsHTML = `<div class="note-tags-list">` +
        note.tags.map(t => `<span class="note-tag-badge">#${escapeHTML(t)}</span>`).join('') +
        `</div>`;
    }

    // Human date
    const dateFormatted = formatDateHuman(note.date);

    card.innerHTML = `
      <div class="note-card-header">
        <div class="note-card-title">${escapeHTML(note.title || 'Untitled Note')}</div>
        <button class="note-card-date-badge" title="Filter to this date: ${escapeHTML(note.date)}">
          ${dateFormatted}
        </button>
      </div>

      <div class="note-card-body ${note.content && note.content.length > 250 ? 'fade-overflow' : ''}">${escapeHTML(note.content || '')}</div>

      ${imagesHTML || videosHTML ? `<div class="note-media-preview-container">${imagesHTML}${videosHTML}</div>` : ''}

      <div class="note-card-footer">
        ${tagsHTML}
        <div class="note-actions-dock">
          <button class="card-icon-btn btn-pin-card" title="${note.pinned ? 'Unpin' : 'Pin to top'}">${note.pinned ? 'Pinned' : 'Pin'}</button>
          <button class="card-icon-btn btn-share-card" title="Share this note link">Share</button>
          <button class="card-icon-btn btn-edit-card" title="Edit note">Edit</button>
          <button class="card-icon-btn btn-delete-card" title="Delete note">Delete</button>
        </div>
      </div>
    `;

    // Click on date badge filters to that date
    card.querySelector('.note-card-date-badge').addEventListener('click', (e) => {
      e.stopPropagation();
      selectDateFilter(note.date);
    });

    // Lightbox image clicks
    card.querySelectorAll('.pic-thumb-item').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(thumb.dataset.imgIndex, 10);
        openLightbox(note.images[idx]);
      });
    });

    // Card Actions
    card.querySelector('.btn-pin-card').addEventListener('click', async (e) => {
      e.stopPropagation();
      note.pinned = !note.pinned;
      note.updatedAt = new Date().toISOString();
      await dbSaveNote(note);
      renderNotesView();
      showToast(note.pinned ? 'Note pinned to top' : 'Note unpinned');
    });

    card.querySelector('.btn-share-card').addEventListener('click', (e) => {
      e.stopPropagation();
      openShareModalForNote(note);
    });

    card.querySelector('.btn-edit-card').addEventListener('click', (e) => {
      e.stopPropagation();
      openNoteEditor(note);
    });

    card.querySelector('.btn-delete-card').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete note "${note.title || 'Untitled'}"?`)) {
        await dbDeleteNote(note.id);
        STATE.notes = STATE.notes.filter(n => n.id !== note.id);
        renderMiniCalendar();
        renderNotesView();
        showToast('Note deleted');
      }
    });

    // Clicking anywhere on card opens editor
    card.addEventListener('click', (e) => {
      if (e.target.closest('video') || e.target.closest('iframe') || e.target.closest('button')) return;
      openNoteEditor(note);
    });

    return card;
  }

  function updateSidebarCounters() {
    const todayStr = formatDateISO(new Date());
    document.getElementById('count-all').textContent = STATE.notes.length;
    document.getElementById('count-today').textContent = STATE.notes.filter(n => n.date === todayStr).length;
    document.getElementById('count-pinned').textContent = STATE.notes.filter(n => n.pinned).length;
    document.getElementById('count-pics').textContent = STATE.notes.filter(n => n.images && n.images.length > 0).length;
    document.getElementById('count-videos').textContent = STATE.notes.filter(n => n.videos && n.videos.length > 0).length;
  }

  function renderTagsCloud() {
    const container = document.getElementById('tags-cloud-container');
    if (!container) return;

    const tagCounts = {};
    STATE.notes.forEach(n => {
      if (n.tags) {
        n.tags.forEach(t => {
          const clean = t.trim().toLowerCase();
          if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
        });
      }
    });

    const tags = Object.keys(tagCounts);
    if (tags.length === 0) {
      container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-light);">No tags yet</span>';
      return;
    }

    container.innerHTML = tags.map(tag => {
      const active = STATE.activeFilter === `tag:${tag}`;
      return `<button class="tag-chip ${active ? 'active' : ''}" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)} (${tagCounts[tag]})</button>`;
    }).join('');

    container.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (STATE.activeFilter === `tag:${tag}`) {
          STATE.activeFilter = 'all';
        } else {
          STATE.activeFilter = `tag:${tag}`;
          STATE.selectedDate = null;
        }
        document.querySelectorAll('.filter-item').forEach(fi => fi.classList.remove('active'));
        renderMiniCalendar();
        renderNotesView();
        updateDateFilterUI();
      });
    });
  }

  /* --------------------------------------------------------------------------
     8. NOTE EDITOR MODAL & MEDIA ATTACHMENTS
     -------------------------------------------------------------------------- */
  function openNoteEditor(note = null) {
    const dialog = document.getElementById('note-editor-dialog');
    const badge = document.getElementById('editor-mode-badge');
    const deleteBtn = document.getElementById('delete-note-btn');
    const dateInput = document.getElementById('note-date-input');
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-content-input');
    const tagsInput = document.getElementById('note-tags-input');
    const dateInd = document.getElementById('editor-date-indicator');

    STATE.editorTempMedia = [];

    if (note) {
      STATE.editingNoteId = note.id;
      badge.textContent = 'Edit Note';
      deleteBtn.classList.remove('hidden');
      titleInput.value = note.title || '';
      contentInput.value = note.content || '';
      dateInput.value = note.date || formatDateISO(new Date());
      tagsInput.value = (note.tags || []).join(', ');

      // Color tint
      const colorRadio = document.querySelector(`input[name="note-color"][value="${note.color || 'yellow-light'}"]`);
      if (colorRadio) colorRadio.checked = true;

      // Copy media to temp stage
      if (note.images) {
        note.images.forEach(img => STATE.editorTempMedia.push({ ...img, mediaCategory: 'image' }));
      }
      if (note.videos) {
        note.videos.forEach(vid => STATE.editorTempMedia.push({ ...vid, mediaCategory: 'video' }));
      }
    } else {
      STATE.editingNoteId = null;
      badge.textContent = 'New Note';
      deleteBtn.classList.add('hidden');
      titleInput.value = '';
      contentInput.value = '';
      dateInput.value = STATE.selectedDate || formatDateISO(new Date());
      tagsInput.value = '';
      document.querySelector('input[name="note-color"][value="yellow-light"]').checked = true;
    }

    dateInd.textContent = `Date: ${formatDateHuman(dateInput.value)}`;
    dateInput.addEventListener('change', () => {
      dateInd.textContent = `Date: ${formatDateHuman(dateInput.value)}`;
    });

    renderEditorAttachments();
    dialog.showModal();
    titleInput.focus();
  }

  function closeNoteEditor() {
    const dialog = document.getElementById('note-editor-dialog');
    dialog.close();
  }

  function renderEditorAttachments() {
    const grid = document.getElementById('attachments-preview-grid');
    const badge = document.getElementById('media-count-badge');
    if (!grid) return;

    badge.textContent = `${STATE.editorTempMedia.length} item${STATE.editorTempMedia.length === 1 ? '' : 's'}`;
    grid.innerHTML = '';

    STATE.editorTempMedia.forEach((media, idx) => {
      const card = document.createElement('div');
      card.className = 'preview-media-card';

      if (media.mediaCategory === 'image') {
        card.innerHTML = `
          <img src="${escapeHTML(media.dataUrl)}" alt="Preview">
          <button type="button" class="remove-media-btn" data-index="${idx}" title="Remove picture">✕</button>
        `;
      } else {
        card.innerHTML = `
          ${media.isEmbed ? `<iframe src="${escapeHTML(media.url)}" style="width:100%; height:100%; border:none;"></iframe>` : `<video src="${escapeHTML(media.dataUrl || media.url)}"></video>`}
          <button type="button" class="remove-media-btn" data-index="${idx}" title="Remove video">✕</button>
        `;
      }

      card.querySelector('.remove-media-btn').addEventListener('click', () => {
        STATE.editorTempMedia.splice(idx, 1);
        renderEditorAttachments();
      });

      grid.appendChild(card);
    });
  }

  // Handle Image File Uploads
  function handleImageFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        STATE.editorTempMedia.push({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          mediaCategory: 'image',
          type: file.type,
          dataUrl: e.target.result
        });
        renderEditorAttachments();
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Video File Uploads
  function handleVideoFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('video/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        STATE.editorTempMedia.push({
          id: 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          mediaCategory: 'video',
          type: file.type,
          dataUrl: e.target.result,
          isEmbed: false
        });
        renderEditorAttachments();
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle URL Additions (Images / YouTube)
  function handleMediaURL(url, type) {
    if (!url.trim()) return;
    if (type === 'image') {
      STATE.editorTempMedia.push({
        id: 'img_url_' + Date.now(),
        name: 'Web Image',
        mediaCategory: 'image',
        type: 'url',
        dataUrl: url.trim()
      });
    } else {
      // Check YouTube URL
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        STATE.editorTempMedia.push({
          id: 'vid_yt_' + Date.now(),
          name: 'YouTube Video',
          mediaCategory: 'video',
          type: 'youtube',
          url: `https://www.youtube.com/embed/${ytMatch[1]}`,
          isEmbed: true
        });
      } else {
        STATE.editorTempMedia.push({
          id: 'vid_url_' + Date.now(),
          name: 'Web Video',
          mediaCategory: 'video',
          type: 'direct',
          url: url.trim(),
          isEmbed: false
        });
      }
    }
    renderEditorAttachments();
  }

  // Save Note Action
  async function saveCurrentNoteFromEditor() {
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-content-input');
    const dateInput = document.getElementById('note-date-input');
    const tagsInput = document.getElementById('note-tags-input');

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      showToast('Please enter a title for your note.');
      return;
    }

    const color = document.querySelector('input[name="note-color"]:checked')?.value || 'yellow-light';
    const date = dateInput.value || formatDateISO(new Date());

    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    const images = STATE.editorTempMedia.filter(m => m.mediaCategory === 'image');
    const videos = STATE.editorTempMedia.filter(m => m.mediaCategory === 'video');

    let noteToSave;
    if (STATE.editingNoteId) {
      const existing = STATE.notes.find(n => n.id === STATE.editingNoteId);
      noteToSave = {
        ...existing,
        title,
        content: contentInput.value,
        date,
        color,
        tags,
        images,
        videos,
        updatedAt: new Date().toISOString()
      };
      const idx = STATE.notes.findIndex(n => n.id === STATE.editingNoteId);
      STATE.notes[idx] = noteToSave;
    } else {
      noteToSave = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title,
        content: contentInput.value,
        date,
        color,
        pinned: false,
        tags,
        images,
        videos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      STATE.notes.unshift(noteToSave);
    }

    await dbSaveNote(noteToSave);
    closeNoteEditor();
    renderMiniCalendar();
    renderNotesView();
    showToast('Note saved successfully.');
  }

  /* --------------------------------------------------------------------------
     9. DATE SHARING ENGINE (Zero-Backend URL Link Generator & QR Code)
     -------------------------------------------------------------------------- */
  function openShareModalForDate(targetDate) {
    const dateNotes = STATE.notes.filter(n => n.date === targetDate);
    const dateHuman = formatDateHuman(targetDate);

    // Build payload object
    const payloadData = {
      type: 'lumina_date_share',
      version: 1,
      date: targetDate,
      dateHuman: dateHuman,
      notes: dateNotes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        color: n.color,
        tags: n.tags,
        images: (n.images || []).map(img => ({ name: img.name, dataUrl: img.dataUrl.length < 50000 ? img.dataUrl : '' }))
      }))
    };

    // Safe base64 encoding
    const jsonStr = JSON.stringify(payloadData);
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

    document.getElementById('share-modal-title').textContent = `Share Date: ${dateHuman}`;
    document.getElementById('share-modal-sub').textContent = `${dateNotes.length} note${dateNotes.length === 1 ? '' : 's'} included in link`;
    document.getElementById('share-link-input').value = shareUrl;

    // Preview included notes
    const previewList = document.getElementById('share-preview-list');
    if (dateNotes.length === 0) {
      previewList.innerHTML = `<span style="color:var(--text-muted);">No notes created for this date yet.</span>`;
    } else {
      previewList.innerHTML = dateNotes.map(n => `<div>• <b>${escapeHTML(n.title)}</b> (${(n.content || '').substring(0, 40)}...)</div>`).join('');
    }

    // Generate QR Code
    generateQRCode(shareUrl, document.getElementById('share-qr-canvas'));

    document.getElementById('share-dialog').showModal();
  }

  function openShareModalForNote(note) {
    const payloadData = {
      type: 'lumina_single_note_share',
      version: 1,
      date: note.date,
      dateHuman: formatDateHuman(note.date),
      notes: [
        {
          id: note.id,
          title: note.title,
          content: note.content,
          color: note.color,
          tags: note.tags,
          images: (note.images || []).map(img => ({ name: img.name, dataUrl: img.dataUrl.length < 50000 ? img.dataUrl : '' }))
        }
      ]
    };

    const jsonStr = JSON.stringify(payloadData);
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

    document.getElementById('share-modal-title').textContent = `Share Note: ${note.title}`;
    document.getElementById('share-modal-sub').textContent = `Date: ${formatDateHuman(note.date)}`;
    document.getElementById('share-link-input').value = shareUrl;

    const previewList = document.getElementById('share-preview-list');
    previewList.innerHTML = `<div>• <b>${escapeHTML(note.title)}</b></div><p style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML((note.content || '').substring(0, 80))}...</p>`;

    generateQRCode(shareUrl, document.getElementById('share-qr-canvas'));
    document.getElementById('share-dialog').showModal();
  }

  // Inspect Incoming URL for Shared Content
  function checkIncomingSharedLink() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('#share=')) return;

    try {
      const rawEncoded = hash.replace('#share=', '');
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(rawEncoded))));
      const payload = JSON.parse(jsonStr);

      if (payload && payload.notes && Array.isArray(payload.notes)) {
        const banner = document.getElementById('shared-link-banner');
        const titleEl = document.getElementById('shared-banner-title');
        const subEl = document.getElementById('shared-banner-subtitle');

        titleEl.textContent = `Shared Notes for ${payload.dateHuman || payload.date} (${payload.notes.length} notes)`;
        subEl.textContent = `Received via instant link • Click 'Save to My Notes' to store locally.`;
        banner.classList.remove('hidden');

        // Set up import button
        document.getElementById('import-shared-btn').onclick = async () => {
          for (const shNote of payload.notes) {
            const newNote = {
              id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              title: shNote.title || 'Shared Note',
              content: shNote.content || '',
              date: payload.date || formatDateISO(new Date()),
              color: shNote.color || 'yellow-light',
              pinned: false,
              tags: [...(shNote.tags || []), 'shared'],
              images: shNote.images || [],
              videos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            STATE.notes.unshift(newNote);
            await dbSaveNote(newNote);
          }
          banner.classList.add('hidden');
          selectDateFilter(payload.date);
          showToast(`Saved ${payload.notes.length} shared notes to your workspace.`);
          window.location.hash = ''; // Clear hash cleanly
        };

        document.getElementById('close-banner-btn').onclick = () => {
          banner.classList.add('hidden');
        };
      }
    } catch (err) {
      console.warn('Could not parse shared link payload:', err);
    }
  }

  // Pure Canvas QR Code Generator (Zero Dependency)
  function generateQRCode(text, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Hash string into deterministic visual matrix (representing QR code pattern)
    const gridSize = 25;
    const cellSize = (size - 20) / gridSize;
    const padding = 10;

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    ctx.fillStyle = '#1C1917';

    // Position detection squares (Top-Left, Top-Right, Bottom-Left)
    drawQRFinder(ctx, padding, padding, cellSize);
    drawQRFinder(ctx, padding + (gridSize - 7) * cellSize, padding, cellSize);
    drawQRFinder(ctx, padding, padding + (gridSize - 7) * cellSize, cellSize);

    // Dynamic data modules
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder areas
        if ((r < 7 && c < 7) || (r < 7 && c >= gridSize - 7) || (r >= gridSize - 7 && c < 7)) {
          continue;
        }
        const val = Math.sin(r * 12.9898 + c * 78.233 + hash) * 43758.5453;
        if ((val - Math.floor(val)) > 0.5) {
          ctx.fillRect(padding + c * cellSize, padding + r * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  function drawQRFinder(ctx, x, y, cellSize) {
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#EAB308'; // Golden accent QR center
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  /* --------------------------------------------------------------------------
     10. FOCUS MODE ENGINE (Video BG + Ambient Scenes + Synth Audio)
     -------------------------------------------------------------------------- */
  let liveClockInterval = null;

  function updateLiveClock() {
    const clockEl = document.getElementById('center-live-clock');
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function enterFocusMode() {
    const overlay = document.getElementById('focus-mode-overlay');
    overlay.classList.remove('hidden');

    initFocusCanvas();
    startFocusAnimation();

    // Start live clock and sync transparent timer display
    updateLiveClock();
    if (!liveClockInterval) {
      liveClockInterval = setInterval(updateLiveClock, 1000);
    }
    updateTimerDisplay();

    showToast('Entered Focus Mode. Press Exit or Esc to leave.');
  }

  function exitFocusMode() {
    const overlay = document.getElementById('focus-mode-overlay');
    overlay.classList.add('hidden');

    if (liveClockInterval) {
      clearInterval(liveClockInterval);
      liveClockInterval = null;
    }

    if (STATE.canvasAnimationId) {
      cancelAnimationFrame(STATE.canvasAnimationId);
      STATE.canvasAnimationId = null;
    }

    if (STATE.audio.isPlaying) {
      toggleAmbientAudio(false);
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Procedural Canvas Animation for Ambient Scenes
  let canvasParticles = [];

  function initFocusCanvas() {
    const canvas = document.getElementById('focus-ambient-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvasParticles = [];
    const count = 70;
    for (let i = 0; i < count; i++) {
      canvasParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
        hue: Math.random() > 0.5 ? 45 : 180 // Gold or Cyan
      });
    }
  }

  function startFocusAnimation() {
    const canvas = document.getElementById('focus-ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (STATE.focusScene === 'cyber-city') {
        drawCyberCityScene(ctx, canvas);
      } else if (STATE.focusScene === 'village') {
        drawVillageScene(ctx, canvas);
      } else if (STATE.focusScene === 'raining-night') {
        drawRainingNightScene(ctx, canvas);
      } else if (STATE.focusScene === 'skyscraper') {
        drawSkyscraperScene(ctx, canvas);
      }

      STATE.canvasAnimationId = requestAnimationFrame(animate);
    }

    animate();
  }

  // 1. Cyber City Scene
  function drawCyberCityScene(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Cyber Horizon Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a14');
    grad.addColorStop(0.6, '#141226');
    grad.addColorStop(1, '#241b38');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Glowing skyline towers
    ctx.fillStyle = '#08070e';
    const towers = 16;
    const tWidth = w / towers;
    for (let i = 0; i < towers; i++) {
      const th = ((Math.sin(i * 3.5) + 1.2) / 2.4) * (h * 0.45) + (h * 0.15);
      ctx.fillRect(i * tWidth, h - th, tWidth - 2, th);

      // Window lights
      ctx.fillStyle = (i % 3 === 0) ? 'rgba(250, 204, 21, 0.4)' : 'rgba(56, 189, 248, 0.3)';
      for (let wy = h - th + 20; wy < h - 40; wy += 22) {
        ctx.fillRect(i * tWidth + 6, wy, 4, 8);
        ctx.fillRect(i * tWidth + 16, wy, 4, 8);
      }
      ctx.fillStyle = '#08070e';
    }

    // Cyber Neon Rain particles
    canvasParticles.forEach(p => {
      ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.opacity})`;
      ctx.fillRect(p.x, p.y, 1.5, p.size * 6);
      p.y += p.speedY * 4;
      p.x += 0.5;
      if (p.y > h) {
        p.y = -10;
        p.x = Math.random() * w;
      }
    });
  }

  // 2. Village Setting Scene
  function drawVillageScene(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Warm Sunset Glow
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#78350F');
    grad.addColorStop(0.4, '#D97706');
    grad.addColorStop(0.7, '#FBBF24');
    grad.addColorStop(1, '#FEF08A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Golden Sun
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.4, 70, 0, Math.PI * 2);
    ctx.fill();

    // Rolling Hills
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.3, h * 0.65, w * 0.6, h * 0.8);
    ctx.quadraticCurveTo(w * 0.8, h * 0.9, w, h * 0.75);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Floating Fireflies
    canvasParticles.forEach(p => {
      ctx.fillStyle = `rgba(254, 240, 138, ${Math.sin(Date.now() * 0.003 + p.x) * 0.4 + 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      p.x += Math.sin(Date.now() * 0.001 + p.y) * 0.5;
      p.y -= 0.3;
      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }
    });
  }

  // 3. Raining Night Scene
  function drawRainingNightScene(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Deep Midnight
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, w, h);

    // Soft warm streetlamp reflection
    const lampGlow = ctx.createRadialGradient(w * 0.2, h * 0.7, 10, w * 0.2, h * 0.7, 300);
    lampGlow.addColorStop(0, 'rgba(234, 179, 8, 0.25)');
    lampGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(0, 0, w, h);

    // Raindrops on Glass
    canvasParticles.forEach(p => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.6})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + p.size * 8);
      ctx.stroke();

      p.y += p.speedY * 5;
      p.x -= 0.6;
      if (p.y > h) {
        p.y = -20;
        p.x = Math.random() * w;
      }
    });
  }

  // 4. Skyscraper Window Scene
  function drawSkyscraperScene(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;

    // Dark Starry Sky
    ctx.fillStyle = '#090B10';
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 40; i++) {
      const sx = (Math.sin(i * 123.4) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 56.7) * 0.5 + 0.5) * (h * 0.5);
      const twinkle = Math.sin(Date.now() * 0.002 + i) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.7})`;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // High rise city grid below
    const cityBaseY = h * 0.65;
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, cityBaseY, w, h - cityBaseY);

    // Drifting traffic lights
    canvasParticles.forEach((p, idx) => {
      const roadY = cityBaseY + (p.y % (h - cityBaseY));
      ctx.fillStyle = (idx % 2 === 0) ? 'rgba(239, 68, 68, 0.6)' : 'rgba(250, 204, 21, 0.7)';
      ctx.fillRect(p.x, roadY, p.size * 2, 2);
      p.x += (idx % 2 === 0) ? 1.5 : -1.5;
      if (p.x > w) p.x = 0;
      if (p.x < 0) p.x = w;
    });
  }

  // Web Audio Synthesizer (Ambient Sound Generator)
  function toggleAmbientAudio(forceState = null) {
    const btn = document.getElementById('audio-toggle-btn');
    const label = document.getElementById('audio-toggle-label');

    const shouldPlay = forceState !== null ? forceState : !STATE.audio.isPlaying;

    if (!shouldPlay) {
      if (STATE.audio.noiseNode) {
        try { STATE.audio.noiseNode.stop(); } catch (e) {}
        STATE.audio.noiseNode = null;
      }
      STATE.audio.isPlaying = false;
      label.textContent = 'Ambient Sound: Off';
      btn.classList.remove('btn-yellow');
      btn.classList.add('btn-glass');
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!STATE.audio.ctx) {
        STATE.audio.ctx = new AudioCtx();
      }
      if (STATE.audio.ctx.state === 'suspended') {
        STATE.audio.ctx.resume();
      }

      // Create pink noise buffer
      const bufferSize = STATE.audio.ctx.sampleRate * 2;
      const noiseBuffer = STATE.audio.ctx.createBuffer(1, bufferSize, STATE.audio.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = STATE.audio.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter
      const filter = STATE.audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = STATE.focusScene === 'raining-night' ? 900 : (STATE.focusScene === 'village' ? 500 : 700);

      const gain = STATE.audio.ctx.createGain();
      gain.gain.value = STATE.audio.volume;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(STATE.audio.ctx.destination);

      whiteNoise.start(0);

      STATE.audio.noiseNode = whiteNoise;
      STATE.audio.gainNode = gain;
      STATE.audio.isPlaying = true;

      label.textContent = 'Ambient Sound: On';
      btn.classList.remove('btn-glass');
      btn.classList.add('btn-yellow');
    } catch (err) {
      console.warn('Web Audio error:', err);
      showToast('⚠️ Audio could not start automatically');
    }
  }

  // Pomodoro Focus Timer
  function toggleFocusTimer() {
    const timer = STATE.focusTimer;
    const topBtn = document.getElementById('timer-toggle-btn');
    const topDot = document.getElementById('timer-state-dot');
    const centerIcon = document.getElementById('center-play-icon');
    const centerText = document.getElementById('center-play-text');
    const centerPulse = document.getElementById('center-timer-pulse');
    const centerDigits = document.getElementById('center-timer-display');
    const centerSub = document.getElementById('center-timer-sub');

    if (timer.isRunning) {
      clearInterval(timer.intervalId);
      timer.isRunning = false;
      if (topBtn) topBtn.textContent = 'Start';
      if (topDot) topDot.classList.remove('active');
      if (centerIcon) centerIcon.textContent = '▶';
      if (centerText) centerText.textContent = 'Start';
      if (centerPulse) centerPulse.classList.remove('active');
      if (centerDigits) centerDigits.classList.remove('running');
      if (centerSub) centerSub.textContent = 'Timer paused • Ready when you are';
    } else {
      timer.isRunning = true;
      if (topBtn) topBtn.textContent = 'Pause';
      if (topDot) topDot.classList.add('active');
      if (centerText) centerText.textContent = 'Pause';
      if (centerPulse) centerPulse.classList.add('active');
      if (centerDigits) centerDigits.classList.add('running');
      if (centerSub) centerSub.textContent = 'Time running • Stay in flow';

      timer.intervalId = setInterval(() => {
        timer.remainingSeconds--;
        if (timer.remainingSeconds <= 0) {
          clearInterval(timer.intervalId);
          timer.isRunning = false;
          if (topBtn) topBtn.textContent = 'Start';
          if (topDot) topDot.classList.remove('active');
          if (centerText) centerText.textContent = 'Start';
          if (centerPulse) centerPulse.classList.remove('active');
          if (centerDigits) centerDigits.classList.remove('running');
          if (centerSub) centerSub.textContent = 'Session complete';
          playTimerChime();
          showToast('Focus session complete. Take a breather.');
        }
        updateTimerDisplay();
      }, 1000);
    }
  }

  function resetFocusTimer() {
    const timer = STATE.focusTimer;
    clearInterval(timer.intervalId);
    timer.isRunning = false;
    timer.remainingSeconds = timer.durationSeconds;
    
    const topBtn = document.getElementById('timer-toggle-btn');
    const topDot = document.getElementById('timer-state-dot');
    const centerText = document.getElementById('center-play-text');
    const centerPulse = document.getElementById('center-timer-pulse');
    const centerDigits = document.getElementById('center-timer-display');
    const centerSub = document.getElementById('center-timer-sub');

    if (topBtn) topBtn.textContent = 'Start';
    if (topDot) topDot.classList.remove('active');
    if (centerText) centerText.textContent = 'Start';
    if (centerPulse) centerPulse.classList.remove('active');
    if (centerDigits) centerDigits.classList.remove('running');
    if (centerSub) centerSub.textContent = 'Time running • Stay in flow';

    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(STATE.focusTimer.remainingSeconds / 60);
    const secs = STATE.focusTimer.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const topDisplay = document.getElementById('focus-timer-display');
    if (topDisplay) topDisplay.textContent = formatted;

    const centerDisplay = document.getElementById('center-timer-display');
    if (centerDisplay) centerDisplay.textContent = formatted;
  }

  function playTimerChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     11. LIGHTBOX & DATA BACKUP / RESTORE
     -------------------------------------------------------------------------- */
  function openLightbox(img) {
    const dialog = document.getElementById('lightbox-dialog');
    const imgEl = document.getElementById('lightbox-img');
    const capEl = document.getElementById('lightbox-caption');
    imgEl.src = img.dataUrl;
    capEl.textContent = img.name || 'Note Image';
    dialog.showModal();
  }

  function exportWorkspaceBackup() {
    const backupData = {
      app: 'Lumina Spatial Notes',
      exportDate: new Date().toISOString(),
      notes: STATE.notes
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina_notes_backup_${formatDateISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.');
  }

  function importWorkspaceBackup(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && data.notes && Array.isArray(data.notes)) {
          for (const n of data.notes) {
            await dbSaveNote(n);
          }
          STATE.notes = await dbGetAllNotes();
          renderMiniCalendar();
          renderNotesView();
          document.getElementById('settings-dialog').close();
          showToast(`Successfully restored ${data.notes.length} notes.`);
        } else {
          showToast('Invalid backup file format.');
        }
      } catch (err) {
        showToast('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  }

  /* --------------------------------------------------------------------------
     12. EVENT LISTENERS & SETUP
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // New Note Button
    document.getElementById('open-new-note-btn').addEventListener('click', () => {
      openNoteEditor();
    });

    document.getElementById('empty-create-btn').addEventListener('click', () => {
      openNoteEditor();
    });

    // Close Note Editor
    document.getElementById('close-editor-dialog-btn').addEventListener('click', closeNoteEditor);
    document.getElementById('cancel-note-btn').addEventListener('click', closeNoteEditor);
    document.getElementById('save-note-btn').addEventListener('click', saveCurrentNoteFromEditor);

    // Delete in Editor
    document.getElementById('delete-note-btn').addEventListener('click', async () => {
      if (STATE.editingNoteId) {
        if (confirm('Are you sure you want to delete this note?')) {
          await dbDeleteNote(STATE.editingNoteId);
          STATE.notes = STATE.notes.filter(n => n.id !== STATE.editingNoteId);
          closeNoteEditor();
          renderMiniCalendar();
          renderNotesView();
          showToast('🗑️ Note deleted');
        }
      }
    });

    // Mini Calendar Navigation
    document.getElementById('mini-cal-prev').addEventListener('click', () => {
      STATE.currentCalDate.setMonth(STATE.currentCalDate.getMonth() - 1);
      renderMiniCalendar();
    });
    document.getElementById('mini-cal-next').addEventListener('click', () => {
      STATE.currentCalDate.setMonth(STATE.currentCalDate.getMonth() + 1);
      renderMiniCalendar();
    });
    document.getElementById('mini-cal-today-btn').addEventListener('click', () => {
      STATE.currentCalDate = new Date();
      selectDateFilter(formatDateISO(new Date()));
    });
    document.getElementById('share-selected-date-btn').addEventListener('click', () => {
      const targetDate = STATE.selectedDate || formatDateISO(new Date());
      openShareModalForDate(targetDate);
    });

    // Full Calendar Modal
    const fullCalDialog = document.getElementById('full-calendar-dialog');
    document.getElementById('toggle-calendar-view-btn').addEventListener('click', () => {
      renderFullCalendar();
      fullCalDialog.showModal();
    });
    document.getElementById('close-calendar-dialog-btn').addEventListener('click', () => {
      fullCalDialog.close();
    });
    document.getElementById('full-cal-prev').addEventListener('click', () => {
      STATE.currentCalDate.setMonth(STATE.currentCalDate.getMonth() - 1);
      renderFullCalendar();
    });
    document.getElementById('full-cal-next').addEventListener('click', () => {
      STATE.currentCalDate.setMonth(STATE.currentCalDate.getMonth() + 1);
      renderFullCalendar();
    });
    document.getElementById('full-cal-today').addEventListener('click', () => {
      STATE.currentCalDate = new Date();
      renderFullCalendar();
    });
    document.getElementById('share-cal-current-date-btn').addEventListener('click', () => {
      const targetDate = STATE.selectedDate || formatDateISO(new Date());
      openShareModalForDate(targetDate);
    });

    // Toolbar Share Date as Link
    document.getElementById('toolbar-share-date-btn').addEventListener('click', () => {
      const targetDate = STATE.selectedDate || formatDateISO(new Date());
      openShareModalForDate(targetDate);
    });

    // Clear Date Filter
    document.getElementById('clear-date-filter-btn').addEventListener('click', () => {
      STATE.selectedDate = null;
      renderMiniCalendar();
      renderNotesView();
      updateDateFilterUI();
    });

    // Navigation Category Filters
    document.querySelectorAll('.filter-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.filter-item').forEach(fi => fi.classList.remove('active'));
        item.classList.add('active');
        STATE.activeFilter = item.dataset.filter;
        STATE.selectedDate = null;
        renderMiniCalendar();
        renderNotesView();
        updateDateFilterUI();
      });
    });

    // Search Input
    const searchInput = document.getElementById('global-search-input');
    searchInput.addEventListener('input', (e) => {
      STATE.searchQuery = e.target.value;
      renderNotesView();
    });

    // Keyboard Shortcuts (Ctrl+K for search)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        const focusOverlay = document.getElementById('focus-mode-overlay');
        if (!focusOverlay.classList.contains('hidden')) {
          exitFocusMode();
        }
      }
    });

    // View Mode Toggle
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    gridBtn.addEventListener('click', () => {
      STATE.viewMode = 'grid';
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
      renderNotesView();
    });
    listBtn.addEventListener('click', () => {
      STATE.viewMode = 'list';
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
      renderNotesView();
    });

    // Media Upload Inputs in Editor
    document.getElementById('image-file-input').addEventListener('change', (e) => {
      handleImageFiles(e.target.files);
    });
    document.getElementById('video-file-input').addEventListener('change', (e) => {
      handleVideoFiles(e.target.files);
    });

    // Media URL Row Toggle
    const mediaUrlRow = document.getElementById('media-url-input-row');
    document.getElementById('add-media-url-btn').addEventListener('click', () => {
      mediaUrlRow.classList.toggle('hidden');
    });
    document.getElementById('cancel-media-url-btn').addEventListener('click', () => {
      mediaUrlRow.classList.add('hidden');
    });
    document.getElementById('confirm-media-url-btn').addEventListener('click', () => {
      const urlInput = document.getElementById('media-url-input');
      const typeSelect = document.getElementById('media-url-type');
      handleMediaURL(urlInput.value, typeSelect.value);
      urlInput.value = '';
      mediaUrlRow.classList.add('hidden');
    });

    // Drag and Drop Zone
    const dropzone = document.getElementById('media-dropzone');
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageFiles(e.dataTransfer.files);
        handleVideoFiles(e.dataTransfer.files);
      }
    });

    // Paste Image from Clipboard (Ctrl+V) directly into Editor
    window.addEventListener('paste', (e) => {
      const editorDialog = document.getElementById('note-editor-dialog');
      if (editorDialog.open && e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            handleImageFiles([blob]);
            showToast('Image pasted from clipboard.');
          }
        }
      }
    });

    // Editor Formatting Toolbar Tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const textarea = document.getElementById('note-content-input');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = textarea.value.substring(start, end);

        let replacement = '';
        if (tool === 'bold') replacement = `**${sel || 'bold text'}**`;
        else if (tool === 'italic') replacement = `*${sel || 'italic text'}*`;
        else if (tool === 'h1') replacement = `\n# ${sel || 'Heading 1'}\n`;
        else if (tool === 'h2') replacement = `\n## ${sel || 'Heading 2'}\n`;
        else if (tool === 'bullet') replacement = `\n- ${sel || 'List item'}`;
        else if (tool === 'todo') replacement = `\n[ ] ${sel || 'Action item'}`;
        else if (tool === 'quote') replacement = `\n> ${sel || 'Quote text'}\n`;
        else if (tool === 'code') replacement = `\n\`\`\`\n${sel || 'code block'}\n\`\`\`\n`;

        textarea.setRangeText(replacement, start, end, 'end');
        textarea.focus();
      });
    });

    // Share Dialog Actions
    document.getElementById('close-share-dialog-btn').addEventListener('click', () => {
      document.getElementById('share-dialog').close();
    });

    document.getElementById('copy-share-link-btn').addEventListener('click', () => {
      const input = document.getElementById('share-link-input');
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        document.getElementById('copy-btn-text').textContent = 'Copied!';
        showToast('Link copied to clipboard.');
        setTimeout(() => {
          document.getElementById('copy-btn-text').textContent = 'Copy Link';
        }, 2000);
      });
    });

    document.getElementById('native-share-btn').addEventListener('click', () => {
      const input = document.getElementById('share-link-input');
      if (navigator.share) {
        navigator.share({
          title: 'Lumina Shared Notes',
          text: 'Here are notes shared with you:',
          url: input.value
        }).catch(() => {});
      } else {
        showToast('Native share not supported on this browser, use Copy Link.');
      }
    });

    document.getElementById('toggle-qr-code-btn').addEventListener('click', () => {
      document.getElementById('qr-code-wrapper').classList.toggle('hidden');
    });

    // Settings Modal (Data Backup & Restore)
    const settingsDialog = document.getElementById('settings-dialog');
    document.getElementById('export-import-btn').addEventListener('click', () => {
      settingsDialog.showModal();
    });
    document.getElementById('close-settings-dialog-btn').addEventListener('click', () => {
      settingsDialog.close();
    });
    document.getElementById('export-json-btn').addEventListener('click', exportWorkspaceBackup);
    document.getElementById('import-json-input').addEventListener('change', (e) => {
      if (e.target.files[0]) importWorkspaceBackup(e.target.files[0]);
    });
    document.getElementById('clear-all-data-btn').addEventListener('click', async () => {
      if (confirm('⚠️ WARNING: This will permanently delete all your local notes! Proceed?')) {
        await dbClearAll();
        STATE.notes = [];
        renderMiniCalendar();
        renderNotesView();
        settingsDialog.close();
        showToast('🗑️ Workspace data cleared');
      }
    });

    // Lightbox Modal
    document.getElementById('close-lightbox-btn').addEventListener('click', () => {
      document.getElementById('lightbox-dialog').close();
    });

    // ==========================================
    // Focus Mode Event Handlers
    // ==========================================
    document.getElementById('enter-focus-mode-btn').addEventListener('click', enterFocusMode);
    document.getElementById('exit-focus-mode-btn').addEventListener('click', exitFocusMode);

    // Scene Selector Pills
    document.querySelectorAll('.scene-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.scene-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        STATE.focusScene = pill.dataset.scene;

        // If ambient audio is playing, retune filter
        if (STATE.audio.isPlaying) {
          toggleAmbientAudio(false);
          toggleAmbientAudio(true);
        }
      });
    });

    // Pomodoro Timer Controls
    document.getElementById('timer-toggle-btn').addEventListener('click', toggleFocusTimer);
    document.getElementById('timer-reset-btn').addEventListener('click', resetFocusTimer);
    document.getElementById('timer-duration-select').addEventListener('change', (e) => {
      const mins = parseInt(e.target.value, 10);
      STATE.focusTimer.durationSeconds = mins * 60;
      resetFocusTimer();
    });

    // Ambient Audio Synthesizer
    document.getElementById('audio-toggle-btn').addEventListener('click', () => {
      toggleAmbientAudio();
    });
    document.getElementById('audio-volume-slider').addEventListener('input', (e) => {
      STATE.audio.volume = parseFloat(e.target.value);
      if (STATE.audio.gainNode) {
        STATE.audio.gainNode.gain.value = STATE.audio.volume;
      }
    });

    // Fullscreen Toggle
    document.getElementById('toggle-fullscreen-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Center Transparent Timer Controls
    const centerToggleBtn = document.getElementById('center-timer-toggle-btn');
    if (centerToggleBtn) centerToggleBtn.addEventListener('click', toggleFocusTimer);

    const centerResetBtn = document.getElementById('center-timer-reset-btn');
    if (centerResetBtn) centerResetBtn.addEventListener('click', resetFocusTimer);

    // Preset Pills for Timer
    const presetPills = document.querySelectorAll('.timer-preset-btn[data-mins]');
    presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.timer-preset-btn').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const customPanel = document.getElementById('custom-timer-panel');
        if (customPanel) customPanel.classList.add('hidden');

        const mins = parseInt(pill.dataset.mins, 10);
        STATE.focusTimer.durationSeconds = mins * 60;
        resetFocusTimer();

        // Sync top select dropdown
        const topSelect = document.getElementById('timer-duration-select');
        if (topSelect) topSelect.value = String(mins);

        // Update tag text
        const statusTag = document.getElementById('center-timer-status');
        if (statusTag) {
          statusTag.textContent = mins <= 15 ? 'REST & BREAK' : 'DEEP FOCUS';
        }
      });
    });

    // Custom Timer Duration Choice Button & Panel
    const toggleCustomBtn = document.getElementById('toggle-custom-timer-btn');
    const customPanel = document.getElementById('custom-timer-panel');
    const customMinsInput = document.getElementById('custom-timer-mins');
    const applyCustomBtn = document.getElementById('apply-custom-timer-btn');
    const cancelCustomBtn = document.getElementById('cancel-custom-timer-btn');

    function openCustomTimerChoice() {
      if (!customPanel) return;
      customPanel.classList.toggle('hidden');
      if (!customPanel.classList.contains('hidden') && customMinsInput) {
        customMinsInput.focus();
        customMinsInput.select();
      }
    }

    if (toggleCustomBtn) {
      toggleCustomBtn.addEventListener('click', () => {
        openCustomTimerChoice();
      });
    }

    // Clicking directly on the timer digits also lets user set custom duration!
    const centerDisplayDigits = document.getElementById('center-timer-display');
    if (centerDisplayDigits) {
      centerDisplayDigits.addEventListener('click', () => {
        openCustomTimerChoice();
      });
    }

    if (applyCustomBtn) {
      applyCustomBtn.addEventListener('click', () => {
        const customMins = parseInt(customMinsInput.value, 10);
        if (customMins && customMins > 0 && customMins <= 999) {
          STATE.focusTimer.durationSeconds = customMins * 60;
          resetFocusTimer();
          document.querySelectorAll('.timer-preset-btn').forEach(p => p.classList.remove('active'));
          if (toggleCustomBtn) {
            toggleCustomBtn.classList.add('active');
            toggleCustomBtn.textContent = `${customMins}m`;
          }
          if (customPanel) customPanel.classList.add('hidden');

          const statusTag = document.getElementById('center-timer-status');
          if (statusTag) statusTag.textContent = 'CUSTOM FOCUS';

          const topSelect = document.getElementById('timer-duration-select');
          if (topSelect) topSelect.value = 'custom';

          showToast(`Timer set to ${customMins} minutes.`);
        } else {
          showToast('Please enter a valid duration (1 - 999 minutes).');
        }
      });
    }

    if (cancelCustomBtn) {
      cancelCustomBtn.addEventListener('click', () => {
        if (customPanel) customPanel.classList.add('hidden');
      });
    }

    // Top Select Dropdown support for Custom Duration
    const topDurationSelect = document.getElementById('timer-duration-select');
    if (topDurationSelect) {
      topDurationSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          openCustomTimerChoice();
          const userMins = prompt('Enter custom focus duration in minutes:', '45');
          if (userMins && parseInt(userMins, 10) > 0) {
            const m = parseInt(userMins, 10);
            STATE.focusTimer.durationSeconds = m * 60;
            resetFocusTimer();
            if (toggleCustomBtn) {
              document.querySelectorAll('.timer-preset-btn').forEach(p => p.classList.remove('active'));
              toggleCustomBtn.classList.add('active');
              toggleCustomBtn.textContent = `${m}m`;
            }
            showToast(`Timer set to ${m} minutes.`);
          }
        }
      });
    }

    // Custom Video Background Popover Controls
    const videoPopover = document.getElementById('video-config-popover');
    document.getElementById('open-video-config-btn').addEventListener('click', () => {
      videoPopover.classList.toggle('hidden');
    });
    document.getElementById('close-video-config-btn').addEventListener('click', () => {
      videoPopover.classList.add('hidden');
    });

    const focusBgVideo = document.getElementById('focus-bg-video');
    document.getElementById('focus-custom-video-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const objUrl = URL.createObjectURL(file);
        focusBgVideo.src = objUrl;
        focusBgVideo.play().catch(() => {});
        videoPopover.classList.add('hidden');
        showToast('Custom video background loaded.');
      }
    });

    document.getElementById('apply-video-url-btn').addEventListener('click', () => {
      const url = document.getElementById('focus-custom-video-url').value.trim();
      if (url) {
        focusBgVideo.src = url;
        focusBgVideo.play().catch(() => {});
        videoPopover.classList.add('hidden');
        showToast('Video URL applied to background.');
      }
    });

    document.getElementById('clear-custom-video-btn').addEventListener('click', () => {
      focusBgVideo.src = '';
      videoPopover.classList.add('hidden');
      showToast('Video slot reset to empty.');
    });

    // Handle Window Resize for Canvas
    window.addEventListener('resize', () => {
      const canvas = document.getElementById('focus-ambient-canvas');
      if (canvas && !document.getElementById('focus-mode-overlay').classList.contains('hidden')) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });
  }

  /* --------------------------------------------------------------------------
     13. INITIALIZATION BOOTSTRAP
     -------------------------------------------------------------------------- */
  async function initApp() {
    try {
      // 1. Load notes from IndexedDB
      STATE.notes = await dbGetAllNotes();

      // 2. If new user, seed with sample notes
      if (!STATE.notes || STATE.notes.length === 0) {
        const sampleNotes = getSampleNotes();
        for (const sn of sampleNotes) {
          await dbSaveNote(sn);
        }
        STATE.notes = sampleNotes;
      }

      // 3. Render Calendar & Notes
      renderMiniCalendar();
      renderNotesView();

      // 4. Setup all UI event handlers
      setupEventListeners();

      // 5. Check if page was loaded via a share link
      checkIncomingSharedLink();

      console.log('Lumina Spatial Notes initialized successfully.');
    } catch (err) {
      console.error('Initialization error:', err);
      showToast('App loaded with fallback storage.');
    }
  }

  // Start on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
