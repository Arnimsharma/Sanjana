const API_BASE = window.location.origin;
let currentUser = localStorage.getItem('user_id');

const State = {
    expenses: [],
    budget: 0,
    income: 0,
    editingId: null,
    alertShown: false,
    charts: { category: null, trend: null },
    prevValues: { balance: 0, total: 0, monthly: 0, prediction: 0 }
};

const DOM = {
    totalBalance: document.getElementById('total-balance'),
    totalExpenses: document.getElementById('total-expenses'),
    monthlyExpenses: document.getElementById('monthly-expenses-card'),
    expenseForm: document.getElementById('expense-form'),
    expenseList: document.getElementById('expense-list'),
    searchInput: document.getElementById('search-expenses'),
    categoryFilter: document.getElementById('category-filter'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),
    logoutBtn: document.getElementById('logout-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    inputs: {
        amount: document.getElementById('amount'),
        category: document.getElementById('category'),
        date: document.getElementById('date'),
        note: document.getElementById('note'),
        budget: document.getElementById('monthly-budget'),
        income: document.getElementById('monthly-income'),
        submitBtn: document.getElementById('submit-btn'),
        recipeSelect: document.getElementById('recipe-select'),
        recipeResult: document.getElementById('recipe-result'),
        recipeName: document.getElementById('recipe-name'),
        recipeIngredients: document.getElementById('recipe-ingredients'),
        recipeCost: document.getElementById('recipe-cost'),
        travelDestination: document.getElementById('travel-destination'),
        travelDays: document.getElementById('travel-days'),
        planTravelBtn: document.getElementById('plan-travel-btn'),
        travelResult: document.getElementById('travel-result'),
        travelTitle: document.getElementById('travel-title'),
        travelTransport: document.getElementById('travel-transport'),
        travelFood: document.getElementById('travel-food'),
        travelStay: document.getElementById('travel-stay'),
        travelTotal: document.getElementById('travel-total')
    },
    budgetProgress: document.getElementById('budget-progress'),
    savingsProgress: document.getElementById('savings-progress'),
    budgetStatus: document.getElementById('budget-status'),
    remainingBudget: document.getElementById('remaining-budget'),
    budgetCard: document.getElementById('budget-card'),
    prediction: document.getElementById('prediction-amount')
};

async function init() {
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }
    
    showLoading(true);
    await loadInitialData();
    initCharts();
    setupEventListeners();
    initTheme();
    initBackgroundSlideshow();
    initScrollAnimations();
    updateUI(true);
    showLoading(false);
}

async function loadInitialData() {
    try {
        // Load Expenses
        const expRes = await fetch(`${API_BASE}/expenses/${currentUser}`);
        State.expenses = await expRes.json();
        
        // Load Budget
        const budRes = await fetch(`${API_BASE}/budget/${currentUser}`);
        const budData = await budRes.json();
        State.budget = budData.budget;
        DOM.inputs.budget.value = State.budget;
        
        // Load Income (Mocked in localStorage for now, can be moved to backend too)
        State.income = parseFloat(localStorage.getItem(`income_${currentUser}`)) || 0;
        DOM.inputs.income.value = State.income;
        
    } catch (err) {
        showToast('Error loading data', 'error');
    }
}

function showLoading(show) {
    if (DOM.loadingOverlay) DOM.loadingOverlay.classList.toggle('hidden', !show);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    if (!DOM.toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        DOM.toastContainer = container;
    }
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (DOM.themeToggle) DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (DOM.themeToggle) {
        DOM.themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    showToast(`${isLight ? 'Light' : 'Dark'} mode enabled`, 'success');
}

function setupEventListeners() {
    DOM.expenseForm.addEventListener('submit', handleFormSubmit);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.themeToggle.addEventListener('click', toggleTheme);
    
    // Receipt Upload / OCR Integration
    const receiptInput = document.getElementById('receipt-upload');
    if (receiptInput) {
        receiptInput.addEventListener('change', handleReceiptUpload);
    }
    
    DOM.inputs.budget.addEventListener('change', async (e) => {
        const amount = parseFloat(e.target.value) || 0;
        await fetch(`${API_BASE}/set_budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser, budget: amount })
        });
        State.budget = amount;
        updateUI();
    });

    DOM.inputs.income.addEventListener('input', (e) => {
        State.income = parseFloat(e.target.value) || 0;
        localStorage.setItem(`income_${currentUser}`, State.income);
        updateUI();
    });

    DOM.inputs.recipeSelect.addEventListener('change', async (e) => {
        const recipeKey = e.target.value;
        if (!recipeKey) {
            DOM.inputs.recipeResult.style.display = 'none';
            return;
        }
        const res = await fetch(`${API_BASE}/recipe/${recipeKey}`);
        const recipe = await res.json();
        DOM.inputs.recipeName.textContent = recipe.name;
        DOM.inputs.recipeIngredients.innerHTML = recipe.ingredients.map(ing => `<li>• ${ing}</li>`).join('');
        DOM.inputs.recipeCost.textContent = `₹${recipe.cost}`;
        DOM.inputs.recipeResult.style.display = 'block';
    });

    DOM.inputs.planTravelBtn.addEventListener('click', async () => {
        const destination = DOM.inputs.travelDestination.value;
        const days = DOM.inputs.travelDays.value;
        if (!destination) return;
        
        const res = await fetch(`${API_BASE}/travel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination, days })
        });
        const data = await res.json();
        
        DOM.inputs.travelTitle.textContent = `Estimated Budget for ${data.destination} (${data.days} days)`;
        DOM.inputs.travelTransport.textContent = `₹${data.transport}`;
        DOM.inputs.travelFood.textContent = `₹${data.food}`;
        DOM.inputs.travelStay.textContent = `₹${data.stay}`;
        DOM.inputs.travelTotal.textContent = `₹${data.total}`;
        DOM.inputs.travelResult.style.display = 'block';
    });
}

async function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Scanning Receipt...';
    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/scan_receipt`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            // Autofill the form
            DOM.inputs.amount.value = data.amount;
            DOM.inputs.date.value = formatScanDate(data.date);
            DOM.inputs.note.value = data.description;
            showToast('Receipt scanned successfully');
        } else {
            showToast(data.error || 'OCR scan failed', 'error');
        }
    } catch (err) {
        showToast('Connection error during OCR', 'error');
    } finally {
        showLoading(false);
    }
}

function formatScanDate(dateStr) {
    // Basic date formatter for various patterns
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
        return d.toISOString().slice(0, 10);
    } catch (e) {
        return new Date().toISOString().slice(0, 10);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const expenseData = {
        user_id: currentUser,
        amount: parseFloat(DOM.inputs.amount.value),
        category: DOM.inputs.category.value,
        date: DOM.inputs.date.value,
        description: DOM.inputs.note.value
    };

    let url = `${API_BASE}/add_expense`;
    let method = 'POST';
    
    if (State.editingId) {
        url = `${API_BASE}/update_expense/${State.editingId}`;
        method = 'PUT';
    }

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
    });

    if (res.ok) {
        showToast(State.editingId ? 'Expense updated' : 'Expense added');
        DOM.expenseForm.reset();
        State.editingId = null;
        DOM.inputs.submitBtn.textContent = 'Add Expense';
        await loadInitialData();
        updateUI();
    }
}

async function handleLogout() {
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
    localStorage.clear();
    window.location.href = '/login';
}

function updateUI(skipAnimation = false) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = State.expenses
        .filter(e => e.date.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.amount, 0);
    
    const totalExpenses = State.expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = State.income - monthlyExpenses;
    const remaining = State.budget - monthlyExpenses;
    const budgetUsage = State.budget > 0 ? (monthlyExpenses / State.budget) * 100 : 0;
    
    DOM.totalBalance.textContent = `₹${balance.toFixed(2)}`;
    DOM.totalExpenses.textContent = `₹${totalExpenses.toFixed(2)}`;
    DOM.monthlyExpenses.textContent = `₹${monthlyExpenses.toFixed(2)}`;
    
    if (DOM.budgetProgress) {
        DOM.budgetProgress.style.width = `${Math.min(budgetUsage, 100)}%`;
        DOM.budgetProgress.style.background = budgetUsage > 90 ? 'var(--danger)' : (budgetUsage > 70 ? 'var(--warning)' : 'var(--success)');
    }
    
    if (DOM.budgetStatus) {
        DOM.budgetStatus.textContent = budgetUsage >= 100 ? '⚠️ Budget exceeded!' : (budgetUsage >= 90 ? '🚨 Almost at limit!' : '✅ Within budget');
        DOM.budgetStatus.style.color = budgetUsage > 90 ? 'var(--danger)' : (budgetUsage > 70 ? 'var(--warning)' : 'var(--success)');
    }
    
    if (DOM.remainingBudget) {
        DOM.remainingBudget.textContent = `Remaining: ₹${Math.max(0, remaining).toFixed(2)}`;
    }
    
    renderExpenseList();
    updateCharts();
}

function renderExpenseList() {
    if (!DOM.expenseList) return;
    DOM.expenseList.innerHTML = State.expenses.map(e => `
        <tr>
            <td>${e.date}</td>
            <td><span class="category-badge">${e.category}</span></td>
            <td>${e.description}</td>
            <td style="font-family: 'JetBrains Mono'">₹${e.amount.toFixed(2)}</td>
            <td>
                <button onclick="editExpense(${e.id})" class="btn-icon"><i class="fas fa-edit"></i></button>
                <button onclick="deleteExpense(${e.id})" class="btn-icon delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.editExpense = (id) => {
    const exp = State.expenses.find(e => e.id === id);
    if (!exp) return;
    DOM.inputs.amount.value = exp.amount;
    DOM.inputs.category.value = exp.category;
    DOM.inputs.date.value = exp.date;
    DOM.inputs.note.value = exp.description;
    State.editingId = id;
    DOM.inputs.submitBtn.textContent = 'Update Expense';
    DOM.expenseForm.scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    const res = await fetch(`${API_BASE}/delete_expense/${id}`, { method: 'DELETE' });
    if (res.ok) {
        showToast('Expense deleted');
        await loadInitialData();
        updateUI();
    }
};

function initCharts() {
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    const ctxTrend = document.getElementById('dailyTrendChart')?.getContext('2d');
    
    if (ctxCat) {
        State.charts.category = new Chart(ctxCat, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#8b949e'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8b949e' } } } }
        });
    }
    
    if (ctxTrend) {
        State.charts.trend = new Chart(ctxTrend, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Daily Spending', data: [], borderColor: '#58a6ff', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } } }
        });
    }
}

function updateCharts() {
    if (!State.charts.category) return;
    
    const categories = {};
    State.expenses.forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    
    State.charts.category.data.labels = Object.keys(categories);
    State.charts.category.data.datasets[0].data = Object.values(categories);
    State.charts.category.update();
    
    if (State.charts.trend) {
        const daily = {};
        State.expenses.slice(0, 7).reverse().forEach(e => {
            daily[e.date] = (daily[e.date] || 0) + e.amount;
        });
        State.charts.trend.data.labels = Object.keys(daily);
        State.charts.trend.data.datasets[0].data = Object.values(daily);
        State.charts.trend.update();
    }
}

function initBackgroundSlideshow() {
    const bg = document.getElementById('bg-slideshow');
    if (!bg) return;
    const images = [
        'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=2071',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=2011',
        'https://images.unsplash.com/photo-1611974714014-4986a236e78b?auto=format&fit=crop&q=80&w=2070'
    ];
    let idx = 0;
    const changeImg = () => {
        bg.style.backgroundImage = `url('${images[idx]}')`;
        idx = (idx + 1) % images.length;
    };
    changeImg();
    setInterval(changeImg, 10000);
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('section').forEach(s => observer.observe(s));
}

window.navigateToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('section-highlight');
        setTimeout(() => el.classList.remove('section-highlight'), 2000);
    }
};

document.addEventListener('DOMContentLoaded', init);
