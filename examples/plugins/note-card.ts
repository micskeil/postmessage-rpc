import { providePlugin } from '../../src/providePlugin.ts';
import type { ProvidedPlugin } from '../../src/types/index.ts';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  modifiedAt: number;
}

interface NoteHooks {
  onEdit: (noteId: string) => Promise<void>;
  onEditWithSplash: (noteId: string) => Promise<void>;
  onEditNoSplash: (noteId: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

let noteData: Note | null = null;
let hooks: NoteHooks | null = null;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function render(): void {
  if (!noteData) return;

  document.body.style.backgroundColor = noteData.color || '#FFFFB4';

  document.body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(noteData.title || 'Untitled')}</h3>
        <div class="card-actions">
          <button class="action-btn btn-delete" onclick="handleDelete(event)" title="Delete">
            🗑️
          </button>
        </div>
      </div>

      <div class="card-content">
        ${escapeHtml(noteData.content || 'No content yet...')}
      </div>

      <div class="card-footer">
        <div class="timestamp">
          ${formatDate(noteData.modifiedAt)}
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="edit-btn edit-with-splash" onclick="handleEditWithSplash(event)">
        <span class="btn-icon">🎬</span>
        <span class="btn-text">Edit with Splash</span>
      </button>
      <button class="edit-btn edit-no-splash" onclick="handleEditNoSplash(event)">
        <span class="btn-icon">⚡</span>
        <span class="btn-text">Edit Directly</span>
      </button>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface WindowWithHandlers extends Window {
  handleEditWithSplash: (event: MouseEvent) => Promise<void>;
  handleEditNoSplash: (event: MouseEvent) => Promise<void>;
  handleDelete: (event: MouseEvent) => Promise<void>;
}

(window as WindowWithHandlers).handleEditWithSplash = async function(event: MouseEvent): Promise<void> {
  event.stopPropagation();

  if (hooks && hooks.onEditWithSplash && noteData) {
    await hooks.onEditWithSplash(noteData.id);
  }
};

(window as WindowWithHandlers).handleEditNoSplash = async function(event: MouseEvent): Promise<void> {
  event.stopPropagation();

  if (hooks && hooks.onEditNoSplash && noteData) {
    await hooks.onEditNoSplash(noteData.id);
  }
};

(window as WindowWithHandlers).handleDelete = async function(event: MouseEvent): Promise<void> {
  event.stopPropagation();

  if (hooks && hooks.onDelete && noteData) {
    await hooks.onDelete(noteData.id);
  }
};

// Initialize plugin
(async () => {
  try {
    const result = await providePlugin({
      hooks: ['onEdit', 'onEditWithSplash', 'onEditNoSplash', 'onDelete'],
      methods: {
        // Method to update note data from parent
        updateNote: async (updatedNote: Note) => {
          noteData = updatedNote;
          render();
          return { success: true };
        },

        // Method to get current note data
        getNote: async () => {
          return noteData;
        },
      },
      validator: ({ data }) => {
        if (!data || !data.id) {
          throw new Error('Note data with id is required');
        }
      },
    }) as ProvidedPlugin<Note, Record<string, unknown>, NoteHooks>;

    noteData = result.data;
    hooks = result.hooks;

    render();
  } catch (error) {
    console.error('Error initializing note card plugin:', error);
    document.body.innerHTML = `
      <div style="padding: 1rem; color: red;">
        Error: ${(error as Error).message}
      </div>
    `;
  }
})();
