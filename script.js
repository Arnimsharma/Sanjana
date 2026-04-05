/**
 * ExpenseSense - Professional Financial Assistant
 * Core Logic & OCR Integration
 */

// --- State Management ---
const currentUser = localStorage.getItem('currentUser') || 'guest';
const State = {
    expenses: JSON.parse(localStorage.getItem(`expenses_${currentUser}`)) || [],
    budget: parseFloat(localStorage.getItem(`budget_${currentUser}`)) || 50000,
    income: parseFloat(localStorage.getItem(`income_${currentUser}`)) || 100000,
    editingId: null,
    charts: {
        category: null,
        trend: null
    },
    prevValues: {
        balance: 0,
        total: 0,
        monthly: 0,
        prediction: 0
    }
};

// --- DOM Selectors ---
const DOM = {
    form: document.getElementById('expense-form'),
    list: document.getElementById('expense-list'),
    totalBalance: document.getElementById('total-balance'),
    totalExpenses: document.getElementById('total-expenses'),
    monthlyExpenses: document.getElementById('monthly-expenses-card'),
    budgetProgress: document.getElementById('budget-progress'),
    savingsProgress: document.getElementById('savings-progress'),
    budgetStatus: document.getElementById('budget-status'),
    prediction: document.getElementById('prediction-amount'),
    suggestions: document.getElementById('smart-suggestions'),
    search: document.getElementById('search-input'),
    filter: document.getElementById('filter-category'),
    exportBtn: document.getElementById('export-csv'),
    receiptUpload: document.getElementById('receipt-upload'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),
    logoutBtn: document.getElementById('logout-btn'),
    inputs: {
        budget: document.getElementById('monthly-budget'),
        income: document.getElementById('monthly-income'),
        amount: document.getElementById('amount'),
        category: document.getElementById('category'),
        date: document.getElementById('date'),
        note: document.getElementById('note'),
        submitBtn: document.getElementById('submit-btn')
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        console.log('ExpenseSense: Waiting for login...');
        return;
    }

    console.log('ExpenseSense: Initializing application...');
    
    // Check if first time user
    if (State.expenses.length === 0 && !localStorage.getItem(`hasUsedApp_${currentUser}`)) {
        console.log('ExpenseSense: Adding sample data for first-time user');
        addSampleData();
        localStorage.setItem(`hasUsedApp_${currentUser}`, 'true');
    }

    // Set initial values
    DOM.inputs.budget.value = State.budget;
    DOM.inputs.income.value = State.income;
    DOM.inputs.date.valueAsDate = new Date();

    initCharts();
    setupEventListeners();
    updateUI(true);
});

function addSampleData() {
    const now = new Date();
    const formatDate = (daysAgo) => {
        const d = new Date();
        d.setDate(now.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    };

    State.expenses = [
        { id: '1', amount: 1200, category: 'Food', date: formatDate(0), note: 'Grocery shopping' },
        { id: '2', amount: 500, category: 'Travel', date: formatDate(1), note: 'Uber ride' },
        { id: '3', amount: 3000, category: 'Bills', date: formatDate(2), note: 'Electricity bill' },
        { id: '4', amount: 1500, category: 'Shopping', date: formatDate(3), note: 'New t-shirt' },
        { id: '5', amount: 800, category: 'Food', date: formatDate(4), note: 'Lunch with friends' }
    ];
}

// --- Core Functions ---

function setupEventListeners() {
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.search.addEventListener('input', renderExpenses);
    DOM.filter.addEventListener('change', renderExpenses);
    DOM.exportBtn.addEventListener('click', exportToCSV);
    DOM.receiptUpload.addEventListener('change', handleReceiptScan);
    
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }

    DOM.inputs.budget.addEventListener('input', (e) => {
        State.budget = parseFloat(e.target.value) || 0;
        localStorage.setItem(`budget_${currentUser}`, State.budget);
        updateUI();
    });

    DOM.inputs.income.addEventListener('input', (e) => {
        State.income = parseFloat(e.target.value) || 0;
        localStorage.setItem(`income_${currentUser}`, State.income);
        updateUI();
    });
}

function updateUI(isInitial = false) {
    const currentMonthExpenses = calculateMonthlyExpenses();
    const totalExpenses = calculateTotalExpenses();
    const balance = State.income - currentMonthExpenses;
    const budgetUsage = (currentMonthExpenses / State.budget) * 100;
    const savingsProgress = (balance / (State.income * 0.2)) * 100; // Target 20% savings

    // Animate stats
    animateValue(DOM.totalBalance, State.prevValues.balance || 0, balance);
    animateValue(DOM.totalExpenses, State.prevValues.total || 0, totalExpenses);
    animateValue(DOM.monthlyExpenses, State.prevValues.monthly || 0, currentMonthExpenses);
    
    // Correctly update previous values while preserving existing ones (like prediction)
    State.prevValues = { 
        ...State.prevValues,
        balance: balance, 
        total: totalExpenses, 
        monthly: currentMonthExpenses 
    };

    // Update Progress Bars
    if (DOM.budgetProgress) {
        DOM.budgetProgress.style.width = `${Math.min(budgetUsage, 100)}%`;
        DOM.budgetProgress.style.background = budgetUsage > 100 ? 'var(--danger)' : (budgetUsage > 80 ? 'var(--warning)' : 'var(--accent-color)');
    }
    
    if (DOM.budgetStatus) {
        DOM.budgetStatus.textContent = `${budgetUsage.toFixed(1)}% of budget`;
    }

    if (DOM.savingsProgress) {
        DOM.savingsProgress.style.width = `${Math.min(savingsProgress, 100)}%`;
    }
    
    updatePrediction();
    updateSuggestions(currentMonthExpenses);
    renderExpenses();
    updateCharts();

    // Persist all data
    localStorage.setItem(`expenses_${currentUser}`, JSON.stringify(State.expenses));
    localStorage.setItem(`budget_${currentUser}`, State.budget);
    localStorage.setItem(`income_${currentUser}`, State.income);
}

function handleFormSubmit(e) {
    e.preventDefault();
    console.log('ExpenseSense: Handling form submission...');
    
    const amountVal = DOM.inputs.amount.value;
    const categoryVal = DOM.inputs.category.value;
    const dateVal = DOM.inputs.date.value;
    const noteVal = DOM.inputs.note.value;

    if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    const amount = parseFloat(amountVal);
    const category = categoryVal || 'Others';
    const date = dateVal || new Date().toISOString().split('T')[0];
    const note = noteVal || 'No description';

    if (State.editingId) {
        const index = State.expenses.findIndex(exp => exp.id === State.editingId);
        if (index !== -1) {
            State.expenses[index] = { ...State.expenses[index], amount, category, date, note };
            showToast('Transaction updated', 'success');
        }
        State.editingId = null;
        DOM.inputs.submitBtn.textContent = 'Add Expense';
    } else {
        const newExpense = {
            id: Date.now().toString(),
            amount, category, date, note
        };
        State.expenses.push(newExpense);
        showToast('Transaction added', 'success');
    }

    DOM.form.reset();
    DOM.inputs.date.valueAsDate = new Date();
    updateUI();
}

// --- OCR Feature ---
async function handleReceiptScan(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof Tesseract === 'undefined') {
        showToast('OCR library not loaded. Check internet connection.', 'error');
        return;
    }

    DOM.loadingOverlay.classList.remove('hidden');
    
    try {
        const worker = await Tesseract.createWorker('eng');
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        console.log('OCR Result:', text);
        parseReceiptText(text);
        showToast('Receipt scanned successfully', 'success');
    } catch (error) {
        console.error('OCR Error:', error);
        showToast('Failed to scan receipt', 'error');
    } finally {
        DOM.loadingOverlay.classList.add('hidden');
        DOM.receiptUpload.value = ''; // Reset input
    }
}

function parseReceiptText(text) {
    // Basic extraction logic
    const lines = text.split('\n');
    
    // Extract amount (look for patterns like TOTAL: 123.45 or $123.45)
    const amountRegex = /(?:total|amount|sum|net|paid|rs\.?|₹)\s*(\d+[.,]\d{2})/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) {
        DOM.inputs.amount.value = amountMatch[1].replace(',', '.');
    }

    // Extract date (look for DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY)
    const dateRegex = /(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        try {
            // Try to parse the date string
            const dateStr = dateMatch[1].replace(/\//g, '-');
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                // Format for input[type="date"] (YYYY-MM-DD)
                DOM.inputs.date.value = d.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Date parsing failed:', e);
        }
    }

    // Keyword detection for category
    const keywords = {
        Food: ['restaurant', 'cafe', 'food', 'grocery', 'burger', 'pizza', 'kitchen', 'hotel', 'swiggy', 'zomato', 'canteen'],
        Travel: ['uber', 'ola', 'fuel', 'petrol', 'train', 'flight', 'bus', 'taxi', 'parking', 'garage', 'auto'],
        Shopping: ['amazon', 'walmart', 'store', 'mall', 'clothing', 'electronics', 'fashion', 'market', 'myntra', 'flipkart'],
        Bills: ['electric', 'water', 'internet', 'rent', 'mobile', 'insurance', 'recharge', 'wifi', 'gas']
    };

    const lowerText = text.toLowerCase();
    for (const [cat, words] of Object.entries(keywords)) {
        if (words.some(word => lowerText.includes(word))) {
            DOM.inputs.category.value = cat;
            break;
        }
    }
}

// --- Helper Functions ---

function calculateMonthlyExpenses() {
    const now = new Date();
    return State.expenses
        .filter(exp => {
            if (!exp.date) return false;
            const d = new Date(exp.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function calculateTotalExpenses() {
    return State.expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

function animateValue(obj, start, end) {
    if (!obj) return;
    
    // Ensure numeric inputs
    start = isNaN(parseFloat(start)) ? 0 : parseFloat(start);
    end = isNaN(parseFloat(end)) ? 0 : parseFloat(end);
    
    let startTimestamp = null;
    const duration = 800;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = progress * (end - start) + start;
        obj.innerHTML = formatCurrency(current);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(num);
}

function renderExpenses() {
    if (!DOM.list) return;
    
    const searchTerm = (DOM.search ? DOM.search.value : '').toLowerCase();
    const filterCat = DOM.filter ? DOM.filter.value : 'All';

    const filtered = State.expenses.filter(exp => {
        const note = (exp.note || '').toLowerCase();
        const cat = (exp.category || '').toLowerCase();
        const matchesSearch = note.includes(searchTerm) || cat.includes(searchTerm);
        const matchesCat = filterCat === 'All' || exp.category === filterCat;
        return matchesSearch && matchesCat;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        DOM.list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No transactions found</td></tr>';
        return;
    }

    DOM.list.innerHTML = filtered.map(exp => `
        <tr>
            <td>${exp.date ? new Date(exp.date).toLocaleDateString() : '---'}</td>
            <td><span class="category-badge">${exp.category || 'Others'}</span></td>
            <td>${exp.note || '---'}</td>
            <td style="font-family: 'JetBrains Mono'">₹${(exp.amount || 0).toFixed(2)}</td>
            <td>
                <button onclick="window.editExpense('${exp.id}')" class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="window.deleteExpense('${exp.id}')" class="btn-icon delete" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.editExpense = (id) => {
    console.log('ExpenseSense: Editing transaction', id);
    const exp = State.expenses.find(e => e.id === id);
    if (!exp) return;
    
    DOM.inputs.amount.value = exp.amount;
    DOM.inputs.category.value = exp.category;
    DOM.inputs.date.value = exp.date;
    DOM.inputs.note.value = exp.note;
    
    State.editingId = id;
    DOM.inputs.submitBtn.textContent = 'Update Transaction';
    
    // Smooth scroll to form
    const formSection = document.querySelector('.add-expense-card');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = (id) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
        State.expenses = State.expenses.filter(e => e.id !== id);
        showToast('Transaction deleted', 'success');
        updateUI();
    }
};

function updatePrediction() {
    if (!DOM.prediction) return;
    
    if (State.expenses.length === 0) {
        animateValue(DOM.prediction, State.prevValues.prediction || 0, 0);
        State.prevValues.prediction = 0;
        return;
    }

    const total = calculateTotalExpenses();
    const dates = State.expenses.map(e => new Date(e.date).getTime());
    const firstDate = new Date(Math.min(...dates));
    const days = Math.max((new Date() - firstDate) / (1000 * 60 * 60 * 24), 1);
    const prediction = (total / days) * 30;
    
    animateValue(DOM.prediction, State.prevValues.prediction || 0, prediction);
    State.prevValues.prediction = prediction;
}

function updateSuggestions(monthlyTotal) {
    if (!DOM.suggestions) return;
    
    const suggestions = [];
    const catTotals = {};
    State.expenses.forEach(e => catTotals[e.category] = (catTotals[e.category] || 0) + e.amount);

    if (monthlyTotal > State.budget * 0.9) {
        suggestions.push({ icon: 'fa-bolt', text: 'Critical: You have used 90% of your budget.' });
    }
    
    if (catTotals['Food'] > monthlyTotal * 0.4) {
        suggestions.push({ icon: 'fa-utensils', text: 'Food spending is high. Consider home-cooked meals.' });
    }
    
    if (State.expenses.length > 0 && monthlyTotal < State.budget * 0.5 && new Date().getDate() > 15) {
        suggestions.push({ icon: 'fa-thumbs-up', text: 'Great work! You are well within your budget.' });
    }

    DOM.suggestions.innerHTML = suggestions.length ? suggestions.map(s => `
        <div class="suggestion-item">
            <i class="fas ${s.icon}"></i>
            <p>${s.text}</p>
        </div>
    `).join('') : '<p class="empty-msg">Financial health looks good! Keep tracking.</p>';
}

// --- Charts ---
function initCharts() {
    const catEl = document.getElementById('categoryChart');
    const trendEl = document.getElementById('dailyTrendChart');
    
    if (!catEl || !trendEl || typeof Chart === 'undefined') {
        console.warn('ExpenseSense: Charts could not be initialized (Canvas missing or Chart.js not loaded)');
        return;
    }

    const ctxCat = catEl.getContext('2d');
    const ctxTrend = trendEl.getContext('2d');

    const chartConfig = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8b949e', font: { family: 'DM Sans' } } } }
    };

    try {
        State.charts.category = new Chart(ctxCat, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#8b949e'], borderColor: 'rgba(0,0,0,0)', borderWidth: 2 }] },
            options: { ...chartConfig, cutout: '70%' }
        });

        State.charts.trend = new Chart(ctxTrend, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Daily Spend', data: [], borderColor: '#58a6ff', tension: 0.4, fill: true, backgroundColor: 'rgba(88, 166, 255, 0.1)' }] },
            options: { ...chartConfig, scales: { x: { grid: { display: false }, ticks: { color: '#8b949e' } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e' } } } }
        });
    } catch (e) {
        console.error('ExpenseSense: Chart creation error', e);
    }
}

function updateCharts() {
    if (!State.charts.category || !State.charts.trend) return;

    const catData = {};
    State.expenses.forEach(e => catData[e.category] = (catData[e.category] || 0) + e.amount);
    
    State.charts.category.data.labels = Object.keys(catData);
    State.charts.category.data.datasets[0].data = Object.values(catData);
    State.charts.category.update();

    // Get last 7 distinct dates or just last 7 days
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const trendValues = last7Days.map(date => {
        return State.expenses
            .filter(e => e.date === date)
            .reduce((sum, e) => sum + e.amount, 0);
    });

    State.charts.trend.data.labels = last7Days.map(d => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}`;
    });
    State.charts.trend.data.datasets[0].data = trendValues;
    State.charts.trend.update();
}

// --- Background Slideshow ---
const BG_IMAGES = [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1920&q=80', // Finance/Coins
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80', // Charts/Analytics
    'https://images.unsplash.com/photo-1526303328184-bf7158220391?auto=format&fit=crop&w=1920&q=80', // Technology/Digital
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80', // Business/Work
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1920&q=80'  // Modern Office
];

function initBackgroundSlideshow() {
    const bgContainer = document.getElementById('bg-slideshow');
    if (!bgContainer) return;

    let currentIndex = 0;
    
    // Set initial image
    bgContainer.style.backgroundImage = `url('${BG_IMAGES[0]}')`;

    setInterval(() => {
        currentIndex = (currentIndex + 1) % BG_IMAGES.length;
        bgContainer.style.backgroundImage = `url('${BG_IMAGES[currentIndex]}')`;
    }, 10000); // Change every 10 seconds for a slow, subtle feel
}

// Initialize slideshow on load
document.addEventListener('DOMContentLoaded', initBackgroundSlideshow);

function exportToCSV() {
    const headers = ['Date', 'Category', 'Note', 'Amount'];
    const rows = State.expenses.map(e => [e.date, e.category, e.note, e.amount]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
