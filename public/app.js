// API Base URL
const API_BASE = '/api';

// Debug: Check if updated version is loaded
console.log('Lakers Inventory App - Data Transform Fix v2.0 loaded at:', new Date().toISOString());

// Global state
let currentUser = null;
let isLoading = false;
let currentPage = 1;
let currentTransactionPage = 1;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loading = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const userInfo = document.getElementById('userInfo');
const messageContainer = document.getElementById('messageContainer');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    hideLoading();
    checkAuthentication();
    initializeEventListeners();
});

// Authentication functions
async function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            showMainApp();
        } else {
            localStorage.removeItem('auth_token');
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLogin();
    }
}

async function login(username, password) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('auth_token', data.token);
            currentUser = data.user;
            showMainApp();
            showMessage('Login successful!', 'success');
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    } finally {
        hideLoading();
    }
}

async function logout() {
    try {
        const token = localStorage.getItem('auth_token');
        if (token) {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('auth_token');
    currentUser = null;
    showLogin();
    showMessage('Logged out successfully', 'info');
}

// UI Display functions
function showLogin() {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    updateUserInfo();
    updateRoleBasedUI();
    loadDashboardData();
    loadProducts();
    loadLocations();
}

function showLoading() {
    isLoading = true;
    loading.style.display = 'flex';
}

function hideLoading() {
    isLoading = false;
    loading.style.display = 'none';
}

function updateUserInfo() {
    if (currentUser) {
        userInfo.textContent = `${currentUser.full_name} (${currentUser.role})`;
    }
}

function updateRoleBasedUI() {
    document.body.className = `user-role-${currentUser.role}`;
}

// Event Listeners
function initializeEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await login(username, password);
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Menu toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.currentTarget.dataset.section;
            navigateToSection(section);
        });
    });

    // Transaction forms
    document.getElementById('inboundForm').addEventListener('submit', handleInboundSubmit);
    document.getElementById('outboundForm').addEventListener('submit', handleOutboundSubmit);
    document.getElementById('moveForm').addEventListener('submit', handleMoveSubmit);

    // Stock availability checking
    document.getElementById('outboundProduct').addEventListener('change', checkOutboundStock);
    document.getElementById('outboundLocation').addEventListener('change', checkOutboundStock);
    document.getElementById('moveProduct').addEventListener('change', checkMoveStock);
    document.getElementById('fromLocation').addEventListener('change', checkMoveStock);

    // Filters and refreshing
    document.getElementById('refreshStock').addEventListener('click', loadStockLevels);
    document.getElementById('filterTransactions').addEventListener('click', loadTransactions);
    document.getElementById('stockLocationFilter').addEventListener('change', loadStockLevels);

    // Reports
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    document.getElementById('generateReport').addEventListener('click', generateReport);

    // Modal
    document.getElementById('confirmCancel').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('show');
    });

    // Product Management
    document.getElementById('addProductBtn').addEventListener('click', () => {
        document.getElementById('addProductForm').style.display = 'block';
        document.getElementById('productCode').focus();
    });
    document.getElementById('cancelProductBtn').addEventListener('click', () => {
        document.getElementById('addProductForm').style.display = 'none';
        document.getElementById('productForm').reset();
    });
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Location Management
    document.getElementById('addLocationBtn').addEventListener('click', () => {
        document.getElementById('addLocationForm').style.display = 'block';
        document.getElementById('locationCode').focus();
    });
    document.getElementById('cancelLocationBtn').addEventListener('click', () => {
        document.getElementById('addLocationForm').style.display = 'none';
        document.getElementById('locationForm').reset();
    });
    document.getElementById('locationForm').addEventListener('submit', handleLocationSubmit);

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Navigation
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Close sidebar on mobile
    sidebar.classList.remove('open');

    // Load section-specific data
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'stock':
            loadStockLevels();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'stocktake':
            loadStocktakeData();
            break;
        case 'reports':
            // Reports are loaded on demand
            break;
        case 'products':
            loadProductsData();
            break;
        case 'locations':
            loadLocationsData();
            break;
    }
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Request error:', error);
        throw error;
    }
}

// Data Loading Functions
async function loadProducts() {
    try {
        const products = await apiRequest('/inventory/products');
        updateProductSelects(products);
    } catch (error) {
        showError('Failed to load products');
    }
}

async function loadLocations() {
    try {
        const data = await apiRequest('/inventory/locations');
        updateLocationSelects(data);
    } catch (error) {
        showError('Failed to load locations');
    }
}

async function loadDashboardData() {
    try {
        // Load multiple data sources for dashboard
        const [products, locations, stockData, transactionsData] = await Promise.all([
            apiRequest('/inventory/products'),
            apiRequest('/inventory/locations'),
            apiRequest('/inventory/stock'),
            apiRequest('/inventory/transactions?limit=5')
        ]);

        updateDashboardStats(products, locations, stockData, transactionsData);
        updateRecentTransactions(transactionsData.transactions);
    } catch (error) {
        showError('Failed to load dashboard data');
    }
}

async function loadStockLevels() {
    try {
        const locationFilter = document.getElementById('stockLocationFilter').value;
        let endpoint = '/inventory/stock';
        if (locationFilter) {
            endpoint += `?location_id=${locationFilter}`;
        }

        const data = await apiRequest(endpoint);
        
        // Debug: Log the raw data from API
        console.log('Raw stock data from API:', data);
        
        // Transform the data to match the expected format
        const transformedData = data.map(item => ({
            product_code: item.product_id?.product_code || 'N/A',
            product_name: item.product_id?.product_name || 'N/A',
            location_name: item.location_id?.location_name || 'N/A',
            current_quantity: item.current_quantity || 0,
            min_stock_level: item.product_id?.min_stock_level || 0,
            max_stock_level: item.product_id?.max_stock_level || 0
        }));
        
        // Debug: Log the transformed data
        console.log('Transformed stock data:', transformedData);
        
        updateStockTable(transformedData);
    } catch (error) {
        showError('Failed to load stock levels');
    }
}

async function loadTransactions() {
    try {
        const typeFilter = document.getElementById('transactionTypeFilter').value;
        const startDate = document.getElementById('transactionStartDate').value;
        const endDate = document.getElementById('transactionEndDate').value;

        let endpoint = `/inventory/transactions?limit=20&offset=${(currentTransactionPage - 1) * 20}`;
        if (typeFilter) endpoint += `&type=${typeFilter}`;
        if (startDate) endpoint += `&start_date=${startDate}`;
        if (endDate) endpoint += `&end_date=${endDate}`;

        const data = await apiRequest(endpoint);
        
        // Transform the transaction data to match the expected format
        const transformedTransactions = data.transactions.map(transaction => ({
            transaction_date: transaction.createdAt,
            transaction_type: transaction.transaction_type,
            product_name: transaction.product_id?.product_name || 'N/A',
            quantity: transaction.quantity,
            from_location_name: transaction.from_location_id?.location_name || null,
            to_location_name: transaction.to_location_id?.location_name || null,
            user_name: transaction.user_id?.full_name || transaction.user_id?.username || 'N/A',
            reference_number: transaction.reference_number
        }));
        
        // Create pagination object from backend response
        const pagination = {
            pages: Math.ceil(data.total / data.limit),
            currentPage: Math.floor(data.offset / data.limit) + 1,
            total: data.total
        };
        
        updateTransactionTable(transformedTransactions);
        updateTransactionPagination(pagination);
    } catch (error) {
        showError('Failed to load transactions');
    }
}

// Update UI Functions
function updateProductSelects(products) {
    const selects = ['inboundProduct', 'outboundProduct', 'moveProduct'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Product</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.product_code} - ${product.product_name}`;
            select.appendChild(option);
        });
    });
}

function updateLocationSelects(locations) {
    const selects = ['inboundLocation', 'outboundLocation', 'fromLocation', 'toLocation', 'stockLocationFilter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        if (selectId === 'stockLocationFilter') {
            select.innerHTML = '<option value="">All Locations</option>';
        } else {
            select.innerHTML = '<option value="">Select Location</option>';
        }
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.location_code} - ${location.location_name}`;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateDashboardStats(products, locations, stockData, transactionsData) {
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalLocations').textContent = locations.length;
    
    const lowStockCount = stockData.filter(item => 
        item.current_quantity <= item.min_stock_level
    ).length;
    document.getElementById('lowStockItems').textContent = lowStockCount;
    
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactionsData.transactions.filter(t => 
        t.transaction_date.startsWith(today)
    ).length;
    document.getElementById('todayTransactions').textContent = todayTransactions;
}

function updateRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-center">No recent transactions</p>';
        return;
    }

    container.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-details">
                <div class="transaction-type status-${transaction.transaction_type}">
                    ${transaction.transaction_type.toUpperCase()}
                </div>
                <div class="transaction-info">
                    ${transaction.product_name} - Qty: ${transaction.quantity}
                    ${transaction.from_location_name ? `From: ${transaction.from_location_name}` : ''}
                    ${transaction.to_location_name ? `To: ${transaction.to_location_name}` : ''}
                </div>
            </div>
            <div class="transaction-time">
                ${formatDateTime(transaction.transaction_date)}
            </div>
        </div>
    `).join('');
}

function updateStockTable(stockData) {
    const container = document.getElementById('stockTable');
    
    if (stockData.length === 0) {
        container.innerHTML = '<p class="text-center p-4">No stock data available</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Location</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Max Level</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${stockData.map(item => {
                    let status = 'Normal';
                    let statusClass = 'status-normal';
                    
                    if (item.current_quantity === 0) {
                        status = 'Out of Stock';
                        statusClass = 'status-outbound';
                    } else if (item.current_quantity <= item.min_stock_level) {
                        status = 'Low Stock';
                        statusClass = 'status-adjustment';
                    }
                    
                    return `
                        <tr>
                            <td>${item.product_code}</td>
                            <td>${item.product_name}</td>
                            <td>${item.location_name}</td>
                            <td>${item.current_quantity}</td>
                            <td>${item.min_stock_level}</td>
                            <td>${item.max_stock_level}</td>
                            <td><span class="status-badge ${statusClass}">${status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function updateTransactionTable(transactions) {
    const container = document.getElementById('transactionTable');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-center p-4">No transactions found</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>From</th>
                    <th>To</th>
                    <th>User</th>
                    <th>Reference</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(transaction => `
                    <tr>
                        <td>${formatDateTime(transaction.transaction_date)}</td>
                        <td><span class="status-badge status-${transaction.transaction_type}">${transaction.transaction_type.toUpperCase()}</span></td>
                        <td>${transaction.product_name}</td>
                        <td>${transaction.quantity}</td>
                        <td>${transaction.from_location_name || '-'}</td>
                        <td>${transaction.to_location_name || '-'}</td>
                        <td>${transaction.user_name}</td>
                        <td>${transaction.reference_number || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function updateTransactionPagination(pagination) {
    const container = document.getElementById('transactionPagination');
    
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    const buttons = [];
    
    // Previous button
    buttons.push(`
        <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="changePage(${pagination.page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `);
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
        buttons.push(`
            <button ${i === pagination.page ? 'class="active"' : ''} onclick="changePage(${i})">
                ${i}
            </button>
        `);
    }
    
    // Next button
    buttons.push(`
        <button ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="changePage(${pagination.page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `);
    
    container.innerHTML = buttons.join('');
}

// Form Handlers
async function handleInboundSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.quantity = parseInt(data.quantity);

    try {
        await apiRequest('/inventory/inbound', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showMessage('Inbound transaction completed successfully!', 'success');
        e.target.reset();
        
        // Refresh dashboard and stock data
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboardData();
        }
    } catch (error) {
        showError(error.message);
    }
}

async function handleOutboundSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.quantity = parseInt(data.quantity);

    try {
        await apiRequest('/inventory/outbound', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showMessage('Outbound transaction completed successfully!', 'success');
        e.target.reset();
        document.getElementById('availableStock').style.display = 'none';
        
        // Refresh dashboard and stock data
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboardData();
        }
    } catch (error) {
        showError(error.message);
    }
}

async function handleMoveSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.quantity = parseInt(data.quantity);

    try {
        await apiRequest('/inventory/move', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showMessage('Move transaction completed successfully!', 'success');
        e.target.reset();
        document.getElementById('moveAvailableStock').style.display = 'none';
        
        // Refresh dashboard and stock data
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboardData();
        }
    } catch (error) {
        showError(error.message);
    }
}

// Stock Checking
async function checkOutboundStock() {
    const productId = document.getElementById('outboundProduct').value;
    const locationId = document.getElementById('outboundLocation').value;
    
    if (productId && locationId) {
        try {
            const data = await apiRequest(`/inventory/stock?product_id=${productId}&location_id=${locationId}`);
            const stockInfo = document.getElementById('availableStock');
            const quantitySpan = document.getElementById('availableQuantity');
            
            if (data.length > 0) {
                quantitySpan.textContent = data[0].current_quantity;
                stockInfo.style.display = 'block';
            } else {
                quantitySpan.textContent = '0';
                stockInfo.style.display = 'block';
            }
        } catch (error) {
            console.error('Error checking stock:', error);
        }
    } else {
        document.getElementById('availableStock').style.display = 'none';
    }
}

async function checkMoveStock() {
    const productId = document.getElementById('moveProduct').value;
    const fromLocationId = document.getElementById('fromLocation').value;
    
    if (productId && fromLocationId) {
        try {
            const data = await apiRequest(`/inventory/stock?product_id=${productId}&location_id=${fromLocationId}`);
            const stockInfo = document.getElementById('moveAvailableStock');
            const quantitySpan = document.getElementById('moveAvailableQuantity');
            
            if (data.length > 0) {
                quantitySpan.textContent = data[0].current_quantity;
                stockInfo.style.display = 'block';
            } else {
                quantitySpan.textContent = '0';
                stockInfo.style.display = 'block';
            }
        } catch (error) {
            console.error('Error checking stock:', error);
        }
    } else {
        document.getElementById('moveAvailableStock').style.display = 'none';
    }
}

// Reports
async function generateReport() {
    const reportType = document.querySelector('.tab-btn.active').dataset.report;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    try {
        showLoading();
        
        let endpoint = `/reports/${reportType}`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        const data = await apiRequest(endpoint);
        displayReport(reportType, data);
        
    } catch (error) {
        showError(`Failed to generate ${reportType} report`);
    } finally {
        hideLoading();
    }
}

function displayReport(reportType, data) {
    const container = document.getElementById('reportContent');
    
    switch (reportType) {
        case 'inbound':
        case 'outbound':
            displayTransactionReport(container, data, reportType);
            break;
        case 'stock-levels':
            displayStockLevelsReport(container, data);
            break;
        case 'transactions':
            displayTransactionSummaryReport(container, data);
            break;
    }
}

function displayTransactionReport(container, data, type) {
    const summary = data.summary;
    const transactions = data.transactions;
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>${type.toUpperCase()} Report Summary</h4>
            <div class="dashboard-cards">
                <div class="card">
                    <div class="card-content">
                        <h3>${summary.total_transactions}</h3>
                        <p>Total Transactions</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-content">
                        <h3>${summary.total_quantity}</h3>
                        <p>Total Quantity</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="report-details">
            <h4>Transaction Details</h4>
            ${transactions.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Location</th>
                            <th>Reference</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => `
                            <tr>
                                <td>${formatDate(t.transaction_date)}</td>
                                <td>${t.product_name}</td>
                                <td>${t.quantity}</td>
                                <td>${t.location_name}</td>
                                <td>${t.reference_number || '-'}</td>
                                <td>${t.user_name}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="text-center">No transactions found for the selected period.</p>'}
        </div>
    `;
}

function displayStockLevelsReport(container, data) {
    const summary = data.summary;
    const stockLevels = data.stock_levels;
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>Stock Levels Report Summary</h4>
            <div class="dashboard-cards">
                <div class="card">
                    <div class="card-content">
                        <h3>${summary.total_items}</h3>
                        <p>Total Items</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-content">
                        <h3>$${summary.total_value.toFixed(2)}</h3>
                        <p>Total Value</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-content">
                        <h3>${summary.low_stock_items}</h3>
                        <p>Low Stock Items</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-content">
                        <h3>${summary.out_of_stock_items}</h3>
                        <p>Out of Stock</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="report-details">
            <h4>Stock Level Details</h4>
            ${stockLevels.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Location</th>
                            <th>Current Stock</th>
                            <th>Min Level</th>
                            <th>Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stockLevels.map(item => {
                            let status = 'Normal';
                            let statusClass = 'status-normal';
                            
                            if (item.current_quantity === 0) {
                                status = 'Out of Stock';
                                statusClass = 'status-outbound';
                            } else if (item.current_quantity <= item.min_stock_level) {
                                status = 'Low Stock';
                                statusClass = 'status-adjustment';
                            }
                            
                            return `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.location_name}</td>
                                    <td>${item.current_quantity}</td>
                                    <td>${item.min_stock_level}</td>
                                    <td>$${(item.stock_value || 0).toFixed(2)}</td>
                                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : '<p class="text-center">No stock data found.</p>'}
        </div>
    `;
}

function displayTransactionSummaryReport(container, data) {
    container.innerHTML = `
        <div class="report-details">
            <h4>Transaction Summary</h4>
            ${data.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Transaction Type</th>
                            <th>Count</th>
                            <th>Total Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.period}</td>
                                <td><span class="status-badge status-${item.transaction_type}">${item.transaction_type.toUpperCase()}</span></td>
                                <td>${item.transaction_count}</td>
                                <td>${item.total_quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="text-center">No transaction data found for the selected period.</p>'}
        </div>
    `;
}

// Stocktake functions (simplified version for basic users)
async function loadStocktakeData() {
    if (currentUser.role === 'user') {
        document.getElementById('stocktakeContainer').innerHTML = 
            '<p class="text-center">Stocktake functionality is available to supervisors and administrators only.</p>';
        return;
    }

    try {
        const sessions = await apiRequest('/stocktake/sessions');
        displayStocktakeSessions(sessions);
    } catch (error) {
        showError('Failed to load stocktake data');
    }
}

function displayStocktakeSessions(sessions) {
    const container = document.getElementById('stocktakeContainer');
    
    container.innerHTML = `
        <div class="stocktake-controls">
            <button class="btn btn-primary" onclick="startNewStocktake()">
                <i class="fas fa-plus"></i>
                Start New Stocktake
            </button>
        </div>
        <div class="stocktake-sessions">
            <h3>Active Stocktake Sessions</h3>
            ${sessions.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>Started By</th>
                            <th>Start Date</th>
                            <th>Items</th>
                            <th>Progress</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => `
                            <tr>
                                <td>${session.location_name}</td>
                                <td>${session.started_by_name}</td>
                                <td>${formatDateTime(session.start_date)}</td>
                                <td>${session.total_items}</td>
                                <td>${session.counted_items}/${session.total_items}</td>
                                <td>
                                    <button class="btn btn-secondary" onclick="viewStocktake('${session.session_id}')">
                                        <i class="fas fa-eye"></i>
                                        View
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="text-center">No active stocktake sessions</p>'}
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${getMessageIcon(type)}"></i>
        <span>${message}</span>
    `;

    messageContainer.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function showError(message) {
    showMessage(message, 'error');
    
    // Also show in login screen if visible
    if (loginScreen.style.display !== 'none') {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

function changePage(page) {
    currentTransactionPage = page;
    loadTransactions();
}

// Placeholder functions for stocktake (would need full implementation)
function startNewStocktake() {
    showMessage('Stocktake functionality coming soon!', 'info');
}

function viewStocktake(sessionId) {
    showMessage('Stocktake view functionality coming soon!', 'info');
}

// Product Management Functions
async function loadProductsData() {
    try {
        const products = await apiRequest('/inventory/products');
        displayProductsTable(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products');
    }
}

function displayProductsTable(products) {
    const container = document.getElementById('productsTable');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-data">No products found. Add your first product above!</div>';
        return;
    }

    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Min Level</th>
                    <th>Max Level</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr>
                        <td>${product.product_code}</td>
                        <td>${product.product_name}</td>
                        <td>${product.category || '-'}</td>
                        <td>$${(product.unit_price || 0).toFixed(2)}</td>
                        <td>${product.min_stock_level || 0}</td>
                        <td>${product.max_stock_level || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="editProduct('${product._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading();
        const formData = new FormData(e.target);
        const productData = Object.fromEntries(formData);
        
        // Convert numeric fields
        if (productData.unit_price) productData.unit_price = parseFloat(productData.unit_price);
        if (productData.min_stock_level) productData.min_stock_level = parseInt(productData.min_stock_level);
        if (productData.max_stock_level) productData.max_stock_level = parseInt(productData.max_stock_level);
        
        const result = await apiRequest('/inventory/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        // Backend returns the created product directly on success
        showMessage('Product added successfully!', 'success');
        document.getElementById('addProductForm').style.display = 'none';
        document.getElementById('productForm').reset();
        loadProductsData();
        loadProducts(); // Refresh dropdowns
    } catch (error) {
        console.error('Error adding product:', error);
        showError(error.message || 'Failed to add product');
    } finally {
        hideLoading();
    }
}

function editProduct(productId) {
    showMessage('Edit product functionality coming soon!', 'info');
}

function deleteProduct(productId) {
    showMessage('Delete product functionality coming soon!', 'info');
}

// Location Management Functions
async function loadLocationsData() {
    try {
        const locations = await apiRequest('/inventory/locations');
        displayLocationsTable(locations);
    } catch (error) {
        console.error('Error loading locations:', error);
        showError('Failed to load locations');
    }
}

function displayLocationsTable(locations) {
    const container = document.getElementById('locationsTable');
    
    if (!locations || locations.length === 0) {
        container.innerHTML = '<div class="no-data">No locations found. Add your first location above!</div>';
        return;
    }

    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${locations.map(location => `
                    <tr>
                        <td>${location.location_code}</td>
                        <td>${location.location_name}</td>
                        <td>${location.description || '-'}</td>
                        <td>
                            <span class="status ${location.is_active ? 'active' : 'inactive'}">
                                ${location.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="editLocation('${location._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteLocation('${location._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

async function handleLocationSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading();
        const formData = new FormData(e.target);
        const locationData = Object.fromEntries(formData);
        
        const result = await apiRequest('/inventory/locations', {
            method: 'POST',
            body: JSON.stringify(locationData)
        });
        
        // Backend returns the created location directly on success
        showMessage('Location added successfully!', 'success');
        document.getElementById('addLocationForm').style.display = 'none';
        document.getElementById('locationForm').reset();
        loadLocationsData();
        loadLocations(); // Refresh dropdowns
    } catch (error) {
        console.error('Error adding location:', error);
        showError(error.message || 'Failed to add location');
    } finally {
        hideLoading();
    }
}

function editLocation(locationId) {
    showMessage('Edit location functionality coming soon!', 'info');
}

function deleteLocation(locationId) {
    showMessage('Delete location functionality coming soon!', 'info');
}

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred');
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('An unexpected error occurred');
});
