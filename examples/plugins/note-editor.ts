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

interface EditorSettings {
  colors: string[];
}

interface EditorHooks {
  onSave: (note: Note) => Promise<void>;
  onClose: () => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

let noteData: Note | null = null;
let settings: EditorSettings | null = null;
let hooks: EditorHooks | null = null;
let hasChanges = false;

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function updateCharCount(): void {
  const textarea = document.getElementById('content') as HTMLTextAreaElement | null;
  const charCount = document.getElementById('charCount');
  if (textarea && charCount) {
    charCount.textContent = `${textarea.value.length} characters`;
  }
}

function trackChanges(): void {
  hasChanges = true;
}

function render(): void {
  if (!noteData || !settings) return;

  const colors = settings.colors || ['#FFE5B4', '#FFB4B4', '#B4D7FF', '#B4FFB4', '#E5B4FF', '#FFFFB4'];

  document.body.innerHTML = `
    <div class="editor">
      <div class="editor-header">
        <h2 class="editor-title">Edit Note</h2>
        <button class="close-btn" onclick="handleClose()">✕</button>
      </div>

      <div class="editor-body">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            type="text"
            id="title"
            value="${escapeHtml(noteData.title || '')}"
            placeholder="Enter note title..."
            onchange="trackChanges()"
          />
        </div>

        <div class="form-group">
          <label for="content">Content</label>
          <textarea
            id="content"
            placeholder="Enter note content..."
            oninput="updateCharCount(); trackChanges();"
          >${escapeHtml(noteData.content || '')}</textarea>
          <div class="char-count" id="charCount">${noteData.content?.length || 0} characters</div>
        </div>

        <div class="form-group">
          <label>Color</label>
          <div class="color-picker">
            ${colors.map(color => `
              <div
                class="color-option ${color === noteData.color ? 'selected' : ''}"
                style="background-color: ${color}"
                onclick="selectColor('${color}')"
              ></div>
            `).join('')}
          </div>
        </div>

        <div class="metadata">
          <div>Created: ${formatDateTime(noteData.createdAt)}</div>
          <div>Modified: ${formatDateTime(noteData.modifiedAt)}</div>
        </div>
      </div>

      <div class="editor-footer">
        <button class="btn-danger" onclick="handleDelete()">
          🗑️ Delete
        </button>
        <div class="btn-group">
          <button class="btn-secondary" onclick="handleClose()">
            Cancel
          </button>
          <button class="btn-primary" onclick="handleSave()">
            💾 Save
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFormData(): Note | null {
  if (!noteData) return null;

  const titleInput = document.getElementById('title') as HTMLInputElement | null;
  const contentTextarea = document.getElementById('content') as HTMLTextAreaElement | null;
  const selectedColor = document.querySelector('.color-option.selected') as HTMLElement | null;

  const title = titleInput?.value || '';
  const content = contentTextarea?.value || '';
  const color = selectedColor ? selectedColor.style.backgroundColor : noteData.color;

  return {
    ...noteData,
    title: title.trim(),
    content: content,
    color: color,
  };
}

interface WindowWithEditorHandlers extends Window {
  selectColor: (color: string) => void;
  handleSave: () => Promise<void>;
  handleClose: () => Promise<void>;
  handleDelete: () => Promise<void>;
  trackChanges: () => void;
  updateCharCount: () => void;
}

(window as WindowWithEditorHandlers).selectColor = function(color: string): void {
  trackChanges();

  // Update selected state
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.remove('selected');
    if ((el as HTMLElement).style.backgroundColor === color) {
      el.classList.add('selected');
    }
  });
};

(window as WindowWithEditorHandlers).handleSave = async function(): Promise<void> {
  const updatedNote = getFormData();

  if (!updatedNote || !updatedNote.title) {
    alert('Please enter a title');
    return;
  }

  if (hooks && hooks.onSave) {
    await hooks.onSave(updatedNote);
  }
};

(window as WindowWithEditorHandlers).handleClose = async function(): Promise<void> {
  if (hasChanges) {
    const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
    if (!confirmed) return;
  }

  if (hooks && hooks.onClose) {
    await hooks.onClose();
  }
};

(window as WindowWithEditorHandlers).handleDelete = async function(): Promise<void> {
  const confirmed = confirm('Are you sure you want to delete this note? This cannot be undone.');
  if (!confirmed) return;

  if (hooks && hooks.onDelete && noteData) {
    await hooks.onDelete(noteData.id);
  }
};

(window as WindowWithEditorHandlers).trackChanges = trackChanges;
(window as WindowWithEditorHandlers).updateCharCount = updateCharCount;

// Handle Escape key
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    (window as WindowWithEditorHandlers).handleClose();
  }
});

// Initialize plugin
(async () => {
  try {
    const result = await providePlugin({
      parentCallbacks: ['onSave', 'onClose', 'onDelete'],
      methods: {
        // Method to get current editor state
        getData: async () => {
          return getFormData();
        },

        // Method to check if there are unsaved changes
        hasUnsavedChanges: async () => {
          return hasChanges;
        },
      },
      validator: ({ data, settings: pluginSettings }) => {
        if (!data || !data.id) {
          throw new Error('Note data with id is required');
        }
        if (!pluginSettings || !pluginSettings.colors) {
          throw new Error('Settings with colors array is required');
        }
      },
    }) as ProvidedPlugin<Note, EditorSettings, EditorHooks>;

    noteData = result.data;
    settings = result.settings;
    hooks = result.parentCallbacks;

    render();
  } catch (error) {
    console.error('Error initializing note editor plugin:', error);
    document.body.innerHTML = `
      <div style="color: white; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
        <div>Error: ${(error as Error).message}</div>
      </div>
    `;
  }
})();
