const STORAGE_KEY = 'daymark-tasks-v1';

const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const summary = document.querySelector('#task-summary');
const todayLabel = document.querySelector('#today-label');
const clearCompletedButton = document.querySelector('#clear-completed');
const editDialog = document.querySelector('#edit-dialog');
const editForm = document.querySelector('#edit-form');
const editInput = document.querySelector('#edit-input');
const cancelEditButton = document.querySelector('#cancel-edit');

let tasks = loadTasks();
let currentFilter = 'all';
let editingTaskId = null;

todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric'
}).format(new Date());

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(task => task && typeof task.id === 'string' && typeof task.text === 'string')
      .map(task => ({ id: task.id, text: task.text.slice(0, 160), completed: Boolean(task.completed) }));
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // The list remains usable for this session if browser storage is unavailable.
  }
}

function makeIcon(name) {
  const paths = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>'
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name];
  return svg;
}

function render() {
  const visibleTasks = tasks.filter(task => {
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });
  taskList.replaceChildren();

  for (const task of visibleTasks) {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' completed' : ''}`;

    const check = document.createElement('button');
    check.className = 'check-button';
    check.type = 'button';
    check.setAttribute('aria-label', task.completed ? `Mark “${task.text}” as pending` : `Mark “${task.text}” as completed`);
    check.setAttribute('aria-pressed', String(task.completed));
    const checkmark = document.createElement('span');
    checkmark.textContent = task.completed ? '✓' : '';
    check.append(checkmark);
    check.addEventListener('click', () => toggleTask(task.id));

    const text = document.createElement('p');
    text.className = 'task-text';
    text.textContent = task.text;

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.setAttribute('aria-label', 'Task actions');

    const editButton = document.createElement('button');
    editButton.className = 'icon-button';
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Edit “${task.text}”`);
    editButton.title = 'Edit task';
    editButton.append(makeIcon('edit'));
    editButton.addEventListener('click', () => openEditor(task));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon-button delete';
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Delete “${task.text}”`);
    deleteButton.title = 'Delete task';
    deleteButton.append(makeIcon('delete'));
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    item.append(check, text, actions);
    taskList.append(item);
  }

  emptyState.classList.toggle('visible', visibleTasks.length === 0);
  const pendingCount = tasks.filter(task => !task.completed).length;
  const completedCount = tasks.length - pendingCount;
  if (tasks.length === 0) summary.textContent = 'A fresh start is waiting.';
  else if (pendingCount === 0) summary.textContent = 'Everything is done. Nice work!';
  else summary.textContent = `${pendingCount} task${pendingCount === 1 ? '' : 's'} to go${completedCount ? ` · ${completedCount} done` : ''}.`;
  clearCompletedButton.hidden = completedCount === 0;
}

function addTask(text) {
  tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text, completed: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  render();
}

function openEditor(task) {
  editingTaskId = task.id;
  editInput.value = task.text;
  editDialog.showModal();
  editInput.focus();
  editInput.select();
}

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  addTask(text);
  taskInput.value = '';
  taskInput.focus();
});

editForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = editInput.value.trim();
  if (!text || !editingTaskId) return;
  tasks = tasks.map(task => task.id === editingTaskId ? { ...task, text } : task);
  saveTasks();
  render();
  editingTaskId = null;
  editDialog.close();
});

cancelEditButton.addEventListener('click', () => editDialog.close());
editDialog.addEventListener('close', () => { editingTaskId = null; });

document.querySelectorAll('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(filterButton => {
      const active = filterButton === button;
      filterButton.classList.toggle('active', active);
      filterButton.setAttribute('aria-pressed', String(active));
    });
    render();
  });
});

clearCompletedButton.addEventListener('click', () => {
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  render();
});

render();
