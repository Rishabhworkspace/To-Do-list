// DOM Elements
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const taskPriority = document.getElementById('task-priority');
const taskDueDate = document.getElementById('task-due-date');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const sortBy = document.getElementById('sort-by');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const themeToggle = document.getElementById('theme-toggle-icon');
const totalTasksEl = document.getElementById('total-tasks');
const pendingTasksEl = document.getElementById('pending-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const editModal = document.getElementById('edit-modal');
const closeModal = document.querySelector('.close-modal');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskInput = document.getElementById('edit-task-input');
const editTaskCategory = document.getElementById('edit-task-category');
const editTaskPriority = document.getElementById('edit-task-priority');
const editTaskDueDate = document.getElementById('edit-task-due-date');

// Task data
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentTaskId = null;
let draggedTask = null;

// Initialize the app
function init() {
    // Set today as the minimum date for due dates
    const today = new Date().toISOString().split('T')[0];
    taskDueDate.min = today;
    editTaskDueDate.min = today;

    // Load saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.classList.replace('fa-moon', 'fa-sun');
    }

    // Render tasks
    renderTasks();
    updateTaskStats();

    // Event listeners
    taskForm.addEventListener('submit', addTask);
    taskList.addEventListener('click', handleTaskActions);
    searchInput.addEventListener('input', filterTasks);
    filterCategory.addEventListener('change', filterTasks);
    filterPriority.addEventListener('change', filterTasks);
    sortBy.addEventListener('change', filterTasks);
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    themeToggle.addEventListener('click', toggleTheme);
    editTaskForm.addEventListener('submit', saveEditTask);
    closeModal.addEventListener('click', () => editModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Setup drag and drop
    setupDragAndDrop();
}

// Add a new task
function addTask(e) {
    e.preventDefault();
    
    const taskText = taskInput.value.trim();
    if (!taskText) return;
    
    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        category: taskCategory.value,
        priority: taskPriority.value,
        dueDate: taskDueDate.value || null,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    updateTaskStats();
    
    // Reset form
    taskForm.reset();
    taskInput.focus();
}

// Render tasks to the DOM
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        filteredTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }
}

// Create a task element
function createTaskElement(task) {
    const template = document.getElementById('task-template');
    const taskElement = document.importNode(template.content, true).querySelector('.task-item');
    
    // Set task ID
    taskElement.dataset.id = task.id;
    
    // Set task content
    const checkbox = taskElement.querySelector('.task-checkbox');
    const taskText = taskElement.querySelector('.task-text');
    const categoryEl = taskElement.querySelector('.task-category');
    const priorityEl = taskElement.querySelector('.task-priority');
    const dueDateEl = taskElement.querySelector('.task-due-date');
    
    checkbox.checked = task.completed;
    taskText.textContent = task.text;
    categoryEl.textContent = `${getCategoryIcon(task.category)} ${capitalizeFirstLetter(task.category)}`;
    priorityEl.textContent = `${getPriorityIcon(task.priority)} ${capitalizeFirstLetter(task.priority)}`;
    priorityEl.classList.add(task.priority);
    
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dueDateEl.textContent = `${getCalendarIcon()} ${formattedDate}`;
        
        // Check if task is overdue
        if (new Date() > dueDate && !task.completed) {
            dueDateEl.classList.add('overdue');
        }
    } else {
        dueDateEl.style.display = 'none';
    }
    
    // Mark completed tasks
    if (task.completed) {
        taskElement.classList.add('task-completed');
    }
    
    return taskElement;
}

// Handle task actions (complete, edit, delete)
function handleTaskActions(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    const taskId = taskItem.dataset.id;
    const task = tasks.find(t => t.id === taskId);
    
    if (e.target.classList.contains('task-checkbox')) {
        // Toggle task completion
        task.completed = e.target.checked;
        if (task.completed) {
            taskItem.classList.add('task-completed');
        } else {
            taskItem.classList.remove('task-completed');
        }
        saveTasks();
        updateTaskStats();
    } else if (e.target.closest('.edit-task-btn')) {
        // Edit task
        openEditModal(task);
    } else if (e.target.closest('.delete-task-btn')) {
        // Delete task with animation
        taskItem.style.animation = 'fadeOut 0.3s';
        taskItem.addEventListener('animationend', () => {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
            updateTaskStats();
        });
    }
}

// Open edit modal
function openEditModal(task) {
    currentTaskId = task.id;
    editTaskInput.value = task.text;
    editTaskCategory.value = task.category;
    editTaskPriority.value = task.priority;
    editTaskDueDate.value = task.dueDate || '';
    
    editModal.style.display = 'block';
    editTaskInput.focus();
}

// Save edited task
function saveEditTask(e) {
    e.preventDefault();
    
    const taskIndex = tasks.findIndex(t => t.id === currentTaskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].text = editTaskInput.value.trim();
        tasks[taskIndex].category = editTaskCategory.value;
        tasks[taskIndex].priority = editTaskPriority.value;
        tasks[taskIndex].dueDate = editTaskDueDate.value || null;
        
        saveTasks();
        renderTasks();
        editModal.style.display = 'none';
    }
}

// Filter tasks based on search and filters
function getFilteredTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = filterCategory.value;
    const priorityFilter = filterPriority.value;
    const sortOption = sortBy.value;
    
    let filtered = [...tasks];
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(task => 
            task.text.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(task => task.category === categoryFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
        filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    // Apply sorting
    switch (sortOption) {
        case 'date-added':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'due-date':
            filtered.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'alphabetical':
            filtered.sort((a, b) => a.text.localeCompare(b.text));
            break;
    }
    
    return filtered;
}

// Filter tasks and re-render
function filterTasks() {
    renderTasks();
}

// Clear completed tasks
function clearCompletedTasks() {
    const completedCount = tasks.filter(task => task.completed).length;
    
    if (completedCount === 0) return;
    
    if (confirm(`Are you sure you want to remove ${completedCount} completed task(s)?`)) {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        updateTaskStats();
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    
    if (document.body.classList.contains('dark-theme')) {
        themeToggle.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Update task statistics
function updateTaskStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    totalTasksEl.textContent = totalTasks;
    completedTasksEl.textContent = completedTasks;
    pendingTasksEl.textContent = pendingTasks;
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    taskList.addEventListener('dragstart', e => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        draggedTask = taskItem;
        setTimeout(() => {
            taskItem.classList.add('dragging');
        }, 0);
    });
    
    taskList.addEventListener('dragend', e => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        taskItem.classList.remove('dragging');
        draggedTask = null;
        
        // Update tasks array order based on DOM order
        const newTasksOrder = [];
        document.querySelectorAll('.task-item').forEach(item => {
            const taskId = item.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            if (task) newTasksOrder.push(task);
        });
        
        tasks = newTasksOrder;
        saveTasks();
    });
    
    taskList.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedTask) return;
        
        const taskItems = [...document.querySelectorAll('.task-item:not(.dragging)')];
        const nextTask = taskItems.find(item => {
            const rect = item.getBoundingClientRect();
            return e.clientY < rect.top + rect.height / 2;
        });
        
        taskList.querySelectorAll('.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });
        
        if (nextTask) {
            nextTask.classList.add('drag-over');
            taskList.insertBefore(draggedTask, nextTask);
        } else if (taskItems.length > 0) {
            taskItems[taskItems.length - 1].classList.add('drag-over');
            taskList.appendChild(draggedTask);
        }
    });
    
    taskList.addEventListener('dragleave', e => {
        if (!e.target.closest('.task-item')) return;
        e.target.closest('.task-item').classList.remove('drag-over');
    });
    
    taskList.addEventListener('drop', e => {
        e.preventDefault();
        taskList.querySelectorAll('.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });
    });
}

// Helper functions
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getCategoryIcon(category) {
    const icons = {
        personal: '👤',
        work: '💼',
        shopping: '🛒',
        health: '❤️',
        other: '📌'
    };
    return icons[category] || '📌';
}

function getPriorityIcon(priority) {
    const icons = {
        high: '🔴',
        medium: '🟠',
        low: '🟢'
    };
    return icons[priority] || '⚪';
}

function getCalendarIcon() {
    return '📅';
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);