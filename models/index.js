const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password_hash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'supervisor', 'user']
    },
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Product Schema
const productSchema = new mongoose.Schema({
    product_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    product_name: {
        type: String,
        required: true
    },
    description: String,
    category: String,
    unit_price: {
        type: Number,
        default: 0
    },
    min_stock_level: {
        type: Number,
        default: 0
    },
    max_stock_level: {
        type: Number,
        default: 1000
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Location Schema
const locationSchema = new mongoose.Schema({
    location_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    location_name: {
        type: String,
        required: true
    },
    description: String,
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Stock Schema
const stockSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    current_quantity: {
        type: Number,
        required: true,
        default: 0
    },
    reserved_quantity: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Ensure unique combination of product and location
stockSchema.index({ product_id: 1, location_id: 1 }, { unique: true });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    transaction_id: {
        type: String,
        required: true,
        unique: true
    },
    transaction_type: {
        type: String,
        required: true,
        enum: ['inbound', 'outbound', 'move', 'stocktake', 'adjustment']
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    from_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    to_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    quantity: {
        type: Number,
        required: true
    },
    reference_number: String,
    notes: String,
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transaction_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    table_name: String,
    record_id: String,
    old_values: String,
    new_values: String,
    ip_address: String,
    user_agent: String
}, {
    timestamps: true
});

// Stocktake Session Schema
const stocktakeSessionSchema = new mongoose.Schema({
    session_id: {
        type: String,
        required: true,
        unique: true
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    started_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    end_date: Date,
    notes: String
}, {
    timestamps: true
});

// Stocktake Detail Schema
const stocktakeDetailSchema = new mongoose.Schema({
    session_id: {
        type: String,
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    expected_quantity: {
        type: Number,
        required: true
    },
    counted_quantity: Number,
    variance: Number,
    notes: String,
    counted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    counted_at: Date
}, {
    timestamps: true
});

// Create Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Location = mongoose.model('Location', locationSchema);
const Stock = mongoose.model('Stock', stockSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const StocktakeSession = mongoose.model('StocktakeSession', stocktakeSessionSchema);
const StocktakeDetail = mongoose.model('StocktakeDetail', stocktakeDetailSchema);

module.exports = {
    User,
    Product,
    Location,
    Stock,
    Transaction,
    AuditLog,
    StocktakeSession,
    StocktakeDetail
};
