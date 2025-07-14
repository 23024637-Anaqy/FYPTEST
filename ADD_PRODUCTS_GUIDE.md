# 🏀 Lakers Inventory - Add Products & Items Guide

## 🚀 **Quick Start: Adding Products**

### **Step 1: Ensure System is Running**
```bash
# Fix admin credentials if needed
npm run fix-admin-mongo

# Start the MongoDB server
npm run start-mongo
```

### **Step 2: Add Sample Data (Recommended)**
```bash
# Add sample products, locations, and stock
npm run add-sample-data
```

### **Step 3: Access Web Interface**
- Open browser: `http://localhost:3000`
- Login: `admin` / `admin123`

## 📱 **Using the Web Interface (Easiest Method)**

### **Add Products:**
1. Click **"Products"** in sidebar (admin only)
2. Click **"Add New Product"** button
3. Fill form with:
   - **Product Code:** (unique, e.g., "LAPTOP001")
   - **Product Name:** (e.g., "Dell Laptop")
   - **Description:** (optional details)
   - **Category:** (e.g., "Electronics")
   - **Unit Price:** (cost per item)
   - **Min Stock Level:** (minimum stock warning)
   - **Max Stock Level:** (maximum stock capacity)
4. Click **"Save Product"**

### **Add Locations:**
1. Click **"Locations"** in sidebar (admin only)
2. Click **"Add New Location"** button
3. Fill form with:
   - **Location Code:** (unique, e.g., "WH001")
   - **Location Name:** (e.g., "Main Warehouse")
   - **Type:** (warehouse/retail/shipping)
   - **Description:** (optional details)

### **Add Stock (Inbound Transaction):**
1. Click **"Inbound"** in sidebar
2. Select **Product** from dropdown
3. Select **Location** from dropdown
4. Enter **Quantity**
5. Add **Reference Number** (e.g., "PO-2024001")
6. Add **Notes** (optional)
7. Click **"Add Stock"**

## 🛠️ **Using API Endpoints (For Developers)**

### **Step 1: Login and Get Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### **Step 2: Create Product**
```bash
curl -X POST http://localhost:3000/api/inventory/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "LAPTOP001",
    "name": "Dell Laptop Computer",
    "description": "High-performance business laptop",
    "category": "Electronics",
    "unit": "piece",
    "min_level": 5,
    "max_level": 50
  }'
```

### **Step 3: Create Location**
```bash
curl -X POST http://localhost:3000/api/inventory/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "WH001",
    "name": "Main Warehouse",
    "type": "warehouse",
    "description": "Primary storage facility"
  }'
```

### **Step 4: Add Stock**
```bash
curl -X POST http://localhost:3000/api/inventory/inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "product_id": "PRODUCT_ID_FROM_STEP_2",
    "location_id": "LOCATION_ID_FROM_STEP_3", 
    "quantity": 25,
    "reference_number": "PO-2024001",
    "notes": "Initial stock delivery"
  }'
```

## 📦 **Product Categories (Examples)**

- **Electronics:** Laptops, Phones, Tablets
- **Furniture:** Desks, Chairs, Cabinets
- **Office Supplies:** Paper, Pens, Staplers
- **IT Equipment:** Servers, Routers, Cables
- **Sports Equipment:** Lakers gear, Basketballs
- **Cleaning Supplies:** Sanitizers, Paper towels

## 📍 **Location Types**

- **Warehouse:** Main storage areas
- **Retail:** Store fronts, showrooms
- **Shipping:** Dock areas, staging zones
- **Office:** Administrative locations

## 🎯 **Best Practices**

### **Product Codes:**
- Use consistent naming: `CATEGORY-XXX` (e.g., `LAPTOP-001`)
- Keep codes short but descriptive
- Avoid special characters except hyphens

### **Stock Levels:**
- Set **Min Level** to trigger reorder alerts
- Set **Max Level** based on storage capacity
- Monitor levels regularly via dashboard

### **Location Organization:**
- Create logical location hierarchy
- Use descriptive names
- Group similar item types together

## 🚨 **Common Issues & Solutions**

### **"Product already exists" Error:**
- Product codes must be unique
- Check existing products first
- Use different code or update existing

### **"Location not found" Error:**
- Create location first before adding stock
- Check location code spelling
- Ensure location is active

### **"Invalid token" Error:**
- Login again to get fresh token
- Check token expiration (24 hours)
- Ensure proper Authorization header format

## 🎉 **Sample Data Included**

When you run `npm run add-sample-data`, you get:

### **Products:**
- Dell Latitude Laptop (LAPTOP001)
- Wireless Mouse (MOUSE001)
- Office Desk (DESK001)
- Ergonomic Chair (CHAIR001)
- Copy Paper A4 (PAPER001)

### **Locations:**
- Main Warehouse (WH001)
- Secondary Warehouse (WH002)
- Lakers Store Downtown (STORE001)
- Shipping Dock (SHIPPING)

### **Initial Stock:**
- Laptops: 25 in warehouse, 5 in store
- Mice: 45 in warehouse, 15 in store
- Desks: 12 in warehouse
- Chairs: 18 in warehouse, 8 in store
- Paper: 150 reams in warehouse

## 🏆 **Ready to Go!**

Your Lakers Inventory Management System is now stocked and ready for championship-level inventory management! 

**Login at:** `http://localhost:3000`
**Username:** `admin`
**Password:** `admin123`

*Mamba Mentality in Inventory Management!* 🏀
