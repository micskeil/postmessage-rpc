import { initInlinePlugin, initFullscreenPlugin } from '../src/main.ts';
import type { InlinePlugin, FullscreenPlugin } from '../src/types/index.ts';

// ==================== DATA LAYER ====================

const STORAGE_KEY = 'sticky-notes-board';
const COLORS = [
  '#FFE5B4', // Peach
  '#FFB4B4', // Pink
  '#B4D7FF', // Blue
  '#B4FFB4', // Green
  '#E5B4FF', // Purple
  '#FFFFB4', // Yellow
];

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  modifiedAt: number;
}

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function loadNotes(): Note[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    updateStats(notes.length);
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

function updateStats(count: number): void {
  const statsEl = document.getElementById('stats');
  if (statsEl) {
    statsEl.textContent = `${count} note${count !== 1 ? 's' : ''}`;
  }
}

// ==================== NOTE MANAGEMENT ====================

let notes: Note[] = [];
const notePlugins = new Map<string, InlinePlugin>(); // noteId -> plugin instance
let fullscreenPlugin: FullscreenPlugin | null = null;

async function initializeBoard(): Promise<void> {
  notes = loadNotes();

  const board = document.getElementById('board');
  if (!board) return;

  board.innerHTML = '';

  if (notes.length === 0) {
    // Create 3 sample notes
    notes = [
      {
        id: generateId(),
        title: 'Welcome!',
        content: 'This is a live demo of the Plugin Interface library. Each note is an isolated iframe plugin!',
        color: '#FFE5B4',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      {
        id: generateId(),
        title: 'Click to Edit',
        content: 'Double-click any note to open the fullscreen editor. Try editing this note!',
        color: '#B4D7FF',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      {
        id: generateId(),
        title: 'Secure Communication',
        content: 'Each note communicates with the parent page via postMessage. Safe and secure!',
        color: '#B4FFB4',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
    ];
    saveNotes(notes);
  }

  // Render all notes
  for (const note of notes) {
    await renderNote(note);
  }

  updateStats(notes.length);
}

async function renderNote(note: Note): Promise<void> {
  const board = document.getElementById('board');
  if (!board) return;

  // Create container
  const container = document.createElement('div');
  container.className = 'note-container';
  container.id = `note-${note.id}`;
  board.appendChild(container);

  try {
    // Initialize inline plugin
    const plugin = await initInlinePlugin(
      {
        data: note,
        settings: {
          editable: true,
        },
        hooks: {
          onEdit: async (noteId: string) => {
            await openEditor(noteId, true); // Default to splash
          },
          onEditWithSplash: async (noteId: string) => {
            await openEditor(noteId, true);
          },
          onEditNoSplash: async (noteId: string) => {
            await openEditor(noteId, false);
          },
          onDelete: async (noteId: string) => {
            await deleteNote(noteId);
          },
        },
      },
      {
        src: '/examples/plugins/note-card.html',
        container: container,
        timeout: 5000,
      }
    );

    notePlugins.set(note.id, plugin);
  } catch (error) {
    console.error('Error initializing note plugin:', error);
    container.innerHTML = `<div style="padding: 1rem; color: red;">Error loading note</div>`;
  }
}

async function openEditor(noteId: string, useSplash: boolean = true): Promise<void> {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  try {
    if (fullscreenPlugin) {
      fullscreenPlugin.destroy();
    }

    const settings: { colors: string[]; splashScreenUrl?: string } = {
      colors: COLORS,
    };

    // Only add splash screen URL if requested
    if (useSplash) {
      settings.splashScreenUrl = '/examples/plugins/editor-splash.html';
    }

    fullscreenPlugin = await initFullscreenPlugin(
      {
        data: note,
        settings: settings,
        hooks: {
          onSave: async (updatedNote: Note) => {
            await saveNote(updatedNote);
            fullscreenPlugin?.hide();
            setTimeout(() => {
              fullscreenPlugin?.destroy();
              fullscreenPlugin = null;
            }, 300);
          },
          onClose: async () => {
            fullscreenPlugin?.hide();
            setTimeout(() => {
              fullscreenPlugin?.destroy();
              fullscreenPlugin = null;
            }, 300);
          },
          onDelete: async (noteId: string) => {
            await deleteNote(noteId);
            fullscreenPlugin?.hide();
            setTimeout(() => {
              fullscreenPlugin?.destroy();
              fullscreenPlugin = null;
            }, 300);
          },
        },
      },
      {
        src: '/examples/plugins/note-editor.html',
        parentElem: document.body,
        timeout: 5000,
      }
    );

    if (useSplash) {
      // Show splash screen first
      await fullscreenPlugin.showSplashScreen();
      fullscreenPlugin.show();

      // Hide splash screen after a delay to show the loading animation
      setTimeout(() => {
        fullscreenPlugin?.hideSplashScreen();
      }, 1500);
    } else {
      // Just show the editor directly
      fullscreenPlugin.show();
    }
  } catch (error) {
    console.error('Error opening editor:', error);
    alert('Error opening editor: ' + (error as Error).message);
  }
}

async function saveNote(updatedNote: Note): Promise<void> {
  const index = notes.findIndex(n => n.id === updatedNote.id);
  if (index !== -1) {
    updatedNote.modifiedAt = Date.now();
    notes[index] = updatedNote;
    saveNotes(notes);

    // Update the inline plugin
    const plugin = notePlugins.get(updatedNote.id);
    if (plugin && plugin.methods.updateNote) {
      try {
        await plugin.methods.updateNote(updatedNote);
      } catch (error) {
        console.error('Error updating inline plugin:', error);
      }
    }
  }
}

async function deleteNote(noteId: string): Promise<void> {
  if (!confirm('Delete this note?')) return;

  // Remove from DOM and cleanup plugin
  const plugin = notePlugins.get(noteId);
  if (plugin) {
    plugin.destroy();
    notePlugins.delete(noteId);
  }

  const container = document.getElementById(`note-${noteId}`);
  if (container) {
    container.remove();
  }

  // Remove from data
  notes = notes.filter(n => n.id !== noteId);
  saveNotes(notes);

  // Show empty state if needed
  if (notes.length === 0) {
    const board = document.getElementById('board');
    if (board) {
      board.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div>No notes yet. Click "New Note" to get started!</div>
        </div>
      `;
    }
  }
}

// ==================== GLOBAL ACTIONS ====================

async function createNewNote(): Promise<void> {
  const newNote: Note = {
    id: generateId(),
    title: 'New Note',
    content: 'Start typing...',
    color: getDefaultColor(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };

  notes.push(newNote);
  saveNotes(notes);

  // Clear empty state if present
  const board = document.getElementById('board');
  if (board) {
    const emptyState = board.querySelector('.empty-state');
    if (emptyState) {
      board.innerHTML = '';
    }
  }

  await renderNote(newNote);

  // Open editor immediately for new note (with splash by default)
  setTimeout(() => openEditor(newNote.id, true), 100);
}

function clearAllNotes(): void {
  if (!confirm('Delete all notes? This cannot be undone.')) return;

  // Cleanup all plugins
  notePlugins.forEach(plugin => plugin.destroy());
  notePlugins.clear();

  if (fullscreenPlugin) {
    fullscreenPlugin.destroy();
    fullscreenPlugin = null;
  }

  // Clear data
  notes = [];
  saveNotes(notes);

  // Show empty state
  const board = document.getElementById('board');
  if (board) {
    board.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div>No notes yet. Click "New Note" to get started!</div>
      </div>
    `;
  }
}

// Export functions to global scope for onclick handlers
interface WindowWithFunctions extends Window {
  createNewNote: () => Promise<void>;
  clearAllNotes: () => void;
}

(window as WindowWithFunctions).createNewNote = createNewNote;
(window as WindowWithFunctions).clearAllNotes = clearAllNotes;

// ==================== INITIALIZATION ====================

initializeBoard().catch(error => {
  console.error('Error initializing board:', error);
  const board = document.getElementById('board');
  if (board) {
    board.innerHTML = `
      <div class="empty-state">
        <div style="color: #f5576c;">Error loading board: ${(error as Error).message}</div>
      </div>
    `;
  }
});
