// GitHub Pages Demo JavaScript - Lakers Inventory Management System
class InventoryDemo {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.demoData = this.initializeDemoData();
        this.init();
    }

    initializeDemoData() {
        return {
            users: [
                { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Demo Admin' },
                { id: 2, username: 'demo', password: 'demo', role: 'user', name: 'Demo User' },
                { id: 3, username: 'supervisor', password: 'super123', role: 'supervisor', name: 'Demo Supervisor' }
            ],
            products: [
                { id: 1, code: 'LAPTOP001', name: 'Laptop Computer', category: 'Electronics', min_level: 5, max_level: 50 },
                { id: 2, code: 'MOUSE001', name: 'Wireless Mouse', category: 'Electronics', min_level: 10, max_level: 100 },
                { id: 3, code: 'DESK001', name: 'Office Desk', category: 'Furniture', min_level: 3, max_level: 20 },
                { id: 4, code: 'CHAIR001', name: 'Office Chair', category: 'Furniture', min_level: 5, max_level: 30 },
                { id: 5, code: 'PAPER001', name: 'Copy Paper', category: 'Supplies', min_level: 20, max_level: 200 }
            ],
            locations: [
                { id: 1, code: 'WH001', name: 'Main Warehouse', type: 'warehouse' },
                { id: 2, code: 'WH002', name: 'Secondary Warehouse', type: 'warehouse' },
                { id: 3, code: 'RETAIL', name: 'Retail Store', type: 'retail' },
                { id: 4, code: 'SHIPPING', name: 'Shipping Dock', type: 'shipping' },
                { id: 5, code: 'RECEIVING', name: 'Receiving Dock', type: 'receiving' }
            ],
            stock: [
                { product_id: 1, location_id: 1, quantity: 25 },
                { product_id: 2, location_id: 1, quantity: 3 },
                { product_id: 3, location_id: 3, quantity: 0 },
                { product_id: 4, location_id: 1, quantity: 15 },
                { product_id: 5, location_id: 1, quantity: 150 },
                { product_id: 1, location_id: 2, quantity: 10 },
                { product_id: 2, location_id: 3, quantity: 45 },
                { product_id: 4, location_id: 3, quantity: 8 }
            ],
            transactions: [
                {
                    id: 1,
                    type: 'INBOUND',
                    product_id: 1,
                    location_id: 1,
                    quantity: 5,
                    reference_number: 'PO-2024001',
                    notes: 'Quarterly laptop refresh',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    created_by: 1
                },
                {
                    id: 2,
                    type: 'OUTBOUND',
                    product_id: 2,
                    location_id: 3,
                    quantity: 3,
                    reference_number: 'SO-2024001',
                    notes: 'Customer order fulfillment',
                    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    created_by: 2
                },
                {
                    id: 3,
                    type: 'MOVE',
                    product_id: 4,
                    location_id: 1,
                    to_location_id: 3,
                    quantity: 2,
                    reference_number: 'MV-2024001',
                    notes: 'Store restocking',
                    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                    created_by: 1
                }
            ]
        };
    }

    init() {
        this.bindEvents();
        this.showLoading();
        
        // Simulate loading time
        setTimeout(() => {
            this.hideLoading();
            this.showLogin();
        }, 1500);
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Menu toggle for mobile
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleMobile());
        
        // Forms
        this.bindFormEvents();
        
        // Demo notice close
        window.closeDemoNotice = () => this.closeDemoNotice();
        window.closeDemoModal = () => this.closeDemoModal();
    }

    bindFormEvents() {
        // Inbound form
        const inboundForm = document.getElementById('inboundForm');
        if (inboundForm) {
            inboundForm.addEventListener('submit', (e) => this.handleInbound(e));
        }
        
        // Refresh buttons
        const refreshStock = document.getElementById('refreshStock');
        if (refreshStock) {
            refreshStock.addEventListener('click', () => this.refreshStockDisplay());
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'grid';
        this.updateUserInfo();
        this.updateDashboard();
        this.showSection('dashboard');
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Demo authentication
        const user = this.demoData.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = user;
            this.showMessage('Login successful! Welcome to the demo.', 'success');
            
            // Apply role-based styling
            if (user.role === 'supervisor' || user.role === 'admin') {
                document.body.classList.add('supervisor');
            }
            
            setTimeout(() => this.showApp(), 500);
        } else {
            this.showError('Invalid credentials. Use admin/admin123 or demo/demo');
        }
    }

    handleLogout() {
        this.currentUser = null;
        document.body.classList.remove('supervisor');
        this.showMessage('Logged out successfully', 'success');
        setTimeout(() => this.showLogin(), 500);
    }

    handleNavigation(e) {
        e.preventDefault();
        const section = e.target.closest('.nav-link').dataset.section;
        this.showSection(section);
        
        // Close mobile menu
        document.getElementById('sidebar').classList.remove('active');
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        document.getElementById(sectionName).classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        this.currentSection = sectionName;
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'stock':
                this.updateStockDisplay();
                break;
            case 'transactions':
                this.updateTransactionDisplay();
                break;
        }
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (this.currentUser) {
            userInfo.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
        }
    }

    updateDashboard() {
        // Update dashboard statistics
        document.getElementById('totalProducts').textContent = this.demoData.products.length;
        document.getElementById('totalLocations').textContent = this.demoData.locations.length;
        
        // Calculate low stock items
        const lowStockCount = this.demoData.stock.filter(stock => {
            const product = this.demoData.products.find(p => p.id === stock.product_id);
            return product && stock.quantity < product.min_level;
        }).length;
        document.getElementById('lowStockItems').textContent = lowStockCount;
        
        // Today's transactions (demo: show all)
        document.getElementById('todayTransactions').textContent = this.demoData.transactions.length;
    }

    updateStockDisplay() {
        const tbody = document.querySelector('#stockTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.demoData.stock.forEach(stock => {
            const product = this.demoData.products.find(p => p.id === stock.product_id);
            const location = this.demoData.locations.find(l => l.id === stock.location_id);
            
            if (!product || !location) return;
            
            let status = 'Normal';
            let statusClass = 'status-normal';
            
            if (stock.quantity === 0) {
                status = 'Out of Stock';
                statusClass = 'status-outbound';
            } else if (stock.quantity < product.min_level) {
                status = 'Low Stock';
                statusClass = 'status-adjustment';
            }
            
            const row = `
                <tr>
                    <td>${product.code}</td>
                    <td>${product.name}</td>
                    <td>${location.name}</td>
                    <td>${stock.quantity}</td>
                    <td>${product.min_level}</td>
                    <td>${product.max_level}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    updateTransactionDisplay() {
        // Would implement transaction history display here
        console.log('Updating transaction display');
    }

    handleInbound(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const transaction = {
            id: this.demoData.transactions.length + 1,
            type: 'INBOUND',
            product_id: parseInt(formData.get('product_id')),
            location_id: parseInt(formData.get('location_id')),
            quantity: parseInt(formData.get('quantity')),
            reference_number: formData.get('reference_number'),
            notes: formData.get('notes'),
            created_at: new Date().toISOString(),
            created_by: this.currentUser.id
        };
        
        // Add to demo data
        this.demoData.transactions.push(transaction);
        
        // Update stock levels
        const existingStock = this.demoData.stock.find(s => 
            s.product_id === transaction.product_id && s.location_id === transaction.location_id
        );
        
        if (existingStock) {
            existingStock.quantity += transaction.quantity;
        } else {
            this.demoData.stock.push({
                product_id: transaction.product_id,
                location_id: transaction.location_id,
                quantity: transaction.quantity
            });
        }
        
        this.showMessage('Inbound transaction recorded successfully! (Demo only)', 'success');
        
        // Reset form
        e.target.reset();
        
        // Update dashboard if visible
        if (this.currentSection === 'dashboard') {
            this.updateDashboard();
        }
    }

    refreshStockDisplay() {
        this.showMessage('Stock levels refreshed! (Demo data)', 'success');
        this.updateStockDisplay();
    }

    toggleMobile() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    }

    closeDemoNotice() {
        document.getElementById('demoNotice').style.display = 'none';
        
        // Adjust main app padding
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.style.paddingTop = '0';
        }
    }

    closeDemoModal() {
        document.getElementById('demoModal').style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        container.appendChild(messageEl);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 4000);
    }

    // Utility methods for demo functionality
    getProductName(productId) {
        const product = this.demoData.products.find(p => p.id === productId);
        return product ? product.name : 'Unknown Product';
    }

    getLocationName(locationId) {
        const location = this.demoData.locations.find(l => l.id === locationId);
        return location ? location.name : 'Unknown Location';
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            return 'Less than an hour ago';
        } else if (diffInHours === 1) {
            return '1 hour ago';
        } else {
            return `${diffInHours} hours ago`;
        }
    }
}

// Additional demo features and mock API responses
class DemoAPI {
    static async mockDelay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async simulateNetworkCall(operation, data = null) {
        await this.mockDelay();
        
        // Simulate different response types
        const responses = {
            login: { success: true, token: 'demo-jwt-token-' + Date.now() },
            inbound: { success: true, message: 'Inbound transaction recorded' },
            outbound: { success: true, message: 'Outbound transaction recorded' },
            move: { success: true, message: 'Stock move completed' },
            stocktake: { success: true, message: 'Stocktake session created' },
            reports: { success: true, data: [] }
        };
        
        return responses[operation] || { success: true, message: 'Operation completed' };
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryDemo = new InventoryDemo();
    
    // Add some demo interactivity
    console.log('🎭 Lakers Inventory Management System - Demo Version');
    console.log('🏀 This is a static demo showcasing the full system features');
    console.log('📱 Fully responsive design with Lakers team colors');
    console.log('🔐 Demo accounts: admin/admin123, demo/demo');
});

// Expose demo functions globally for HTML onclick handlers
window.DemoAPI = DemoAPI;

// Service Worker registration for offline capability (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
