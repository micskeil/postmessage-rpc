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

function truncateContent(content: string, maxLength = 150): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

function render(): void {
  if (!noteData) return;

  document.body.style.backgroundColor = noteData.color || '#FFFFB4';

  document.body.innerHTML = `
    <div class="card" onclick="handleCardClick(event)">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(noteData.title || 'Untitled')}</h3>
        <div class="card-actions">
          <button class="action-btn btn-edit" onclick="handleEdit(event)" title="Edit">
            ✏️
          </button>
          <button class="action-btn btn-delete" onclick="handleDelete(event)" title="Delete">
            🗑️
          </button>
        </div>
      </div>

      <div class="card-content">
        ${escapeHtml(truncateContent(noteData.content || ''))}
      </div>

      <div class="card-footer">
        <div class="timestamp">
          <div>Created: ${formatDate(noteData.createdAt)}</div>
          ${noteData.modifiedAt !== noteData.createdAt ?
            `<div>Modified: ${formatDate(noteData.modifiedAt)}</div>` : ''}
        </div>
        <div class="color-indicator" style="background-color: ${noteData.color}"></div>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface WindowWithHandlers extends Window {
  handleCardClick: (event: MouseEvent) => Promise<void>;
  handleEdit: (event: MouseEvent) => Promise<void>;
  handleDelete: (event: MouseEvent) => Promise<void>;
}

(window as WindowWithHandlers).handleCardClick = async function(event: MouseEvent): Promise<void> {
  // Only trigger edit if clicking on card body (not buttons)
  if ((event.target as Element).closest('.action-btn')) return;

  if (hooks && hooks.onEdit && noteData) {
    await hooks.onEdit(noteData.id);
  }
};

(window as WindowWithHandlers).handleEdit = async function(event: MouseEvent): Promise<void> {
  event.stopPropagation();

  if (hooks && hooks.onEdit && noteData) {
    await hooks.onEdit(noteData.id);
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
      hooks: ['onEdit', 'onDelete'],
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
