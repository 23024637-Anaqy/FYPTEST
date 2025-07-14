# 🏀 Complete Guide: Adding Products & Items to Lakers Inventory System

## 🚀 **QUICK START - Your System is Ready!**

✅ **Admin User:** `admin` / `admin123`  
✅ **Server Running:** `http://localhost:3000`  
✅ **Sample Data:** Products, locations, and stock added  
✅ **Web Interface:** Open in browser and login  

---

## 📱 **Method 1: Web Interface (Recommended for Users)**

### **🔑 Login:**
1. Open browser: `http://localhost:3000`
2. Username: `admin`
3. Password: `admin123`
4. Click "Login"

### **📦 Add New Products:**
1. Click **"Products"** in the left sidebar
2. Click **"Add New Product"** button (top right)
3. Fill in the form:
   - **Product Code:** Unique identifier (e.g., `PHONE001`)
   - **Product Name:** Display name (e.g., `iPhone 15 Pro`)
   - **Description:** Optional details
   - **Category:** (e.g., `Electronics`, `Furniture`, `Office Supplies`)
   - **Unit Price:** Cost per item
   - **Min Stock Level:** When to reorder (e.g., `5`)
   - **Max Stock Level:** Storage capacity (e.g., `100`)
4. Click **"Save Product"**

### **📍 Add New Locations:**
1. Click **"Locations"** in sidebar
2. Click **"Add New Location"** button
3. Fill form:
   - **Location Code:** Unique ID (e.g., `STORE002`)
   - **Location Name:** Display name (e.g., `Lakers Store Beverly Hills`)
   - **Description:** Optional details
4. Click **"Save Location"**

### **📈 Add Stock (Inbound):**
1. Click **"Inbound"** in sidebar
2. Select **Product** from dropdown
3. Select **Location** from dropdown
4. Enter **Quantity** to add
5. Add **Reference Number** (e.g., purchase order)
6. Add **Notes** (optional)
7. Click **"Add Stock"**

### **📋 View Current Inventory:**
- **Dashboard:** Overview of all stock levels
- **Stock Levels:** Detailed view by product/location
- **Transactions:** History of all movements
- **Reports:** Low stock alerts, transaction summaries

---

## 💻 **Method 2: API Endpoints (For Developers)**

### **Step 1: Get Authentication Token**
```powershell
# Login request
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token
```

### **Step 2: Create Product**
```powershell
$productBody = @{
    product_code = "PHONE001"
    product_name = "iPhone 15 Pro"
    description = "Latest iPhone model"
    category = "Electronics"
    unit_price = 1199.99
    min_stock_level = 5
    max_stock_level = 50
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/inventory/products" -Method Post -Body $productBody -Headers $headers
```

### **Step 3: Create Location**
```powershell
$locationBody = @{
    location_code = "STORE002"
    location_name = "Lakers Store Beverly Hills"
    description = "Premium retail location"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/inventory/locations" -Method Post -Body $locationBody -Headers $headers
```

### **Step 4: Add Stock**
```powershell
$stockBody = @{
    product_id = "PRODUCT_ID_FROM_STEP_2"
    location_id = "LOCATION_ID_FROM_STEP_3"
    quantity = 25
    reference_number = "PO-2024-001"
    notes = "Initial inventory"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/inventory/inbound" -Method Post -Body $stockBody -Headers $headers
```

---

## 📊 **Sample Data Already Included**

Your system comes pre-loaded with:

### **🛍️ Products:**
- **LAPTOP001** - Dell Latitude Laptop ($1,200)
- **MOUSE001** - Wireless Mouse ($25.99)
- **DESK001** - Office Desk ($450)
- **CHAIR001** - Ergonomic Chair ($300) *Purple Lakers style!*
- **PAPER001** - Copy Paper A4 ($12.50)

### **🏢 Locations:**
- **WH001** - Main Warehouse
- **WH002** - Secondary Warehouse
- **STORE001** - Lakers Store Downtown
- **SHIPPING** - Shipping Dock

### **📈 Stock Levels:**
- Laptops: 25 in warehouse, 5 in store
- Mice: 45 in warehouse, 15 in store
- Desks: 12 in warehouse
- Chairs: 18 in warehouse, 8 in store
- Paper: 150 reams in warehouse

---

## 🛠️ **Bulk Import Script**

To add lots of data at once:

```bash
# Run the sample data script
npm run add-sample-data
```

This script:
- Creates products with proper MongoDB schema
- Sets up warehouse and store locations
- Adds initial stock levels
- Creates transaction records
- Avoids duplicates

---

## 🎯 **Best Practices**

### **Product Codes:**
✅ **Good:** `LAPTOP001`, `CHAIR-ERG001`, `PAPER-A4001`  
❌ **Bad:** `Product 1`, `Chair/Desk`, `A@B#C`

### **Categories:**
- **Electronics:** Laptops, Phones, Tablets, Accessories
- **Furniture:** Desks, Chairs, Cabinets, Tables
- **Office Supplies:** Paper, Pens, Staplers, Binders
- **Sports Equipment:** Lakers gear, Basketballs, Merchandise
- **Cleaning:** Sanitizers, Paper towels, Supplies

### **Stock Levels:**
- **Min Level:** When system alerts you to reorder
- **Max Level:** Storage capacity limit
- **Safety Stock:** Keep some buffer above min level

---

## 🚨 **Common Issues & Solutions**

### **❌ "Product Code already exists"**
**Solution:** Each product needs a unique code. Check existing products first.

### **❌ "Location not found"**
**Solution:** Create the location before trying to add stock there.

### **❌ "Access denied"**
**Solution:** Make sure you're logged in as admin or supervisor.

### **❌ "Server connection error"**
**Solution:** Ensure server is running with `npm run start-mongo`

---

## 🏆 **Success! You're Ready to Manage Inventory**

### **🎮 Next Steps:**
1. **Explore the interface** - Click through all the sections
2. **Add your own products** - Start with items you actually need to track
3. **Set up your locations** - Match your real warehouse/store layout
4. **Train your team** - Show others how to use the system
5. **Monitor reports** - Check low stock alerts and transaction history

### **🏀 Lakers Championship Features:**
- **Purple & Gold UI** - Championship colors throughout
- **Mobile-Friendly** - Use on phones and tablets
- **Real-time Updates** - See changes immediately
- **Secure Access** - Role-based permissions
- **Comprehensive Reports** - Know your inventory inside out

---

## 📞 **Quick Reference Commands**

```bash
# Start the system
npm run start-mongo

# Fix admin password
npm run fix-admin-mongo

# Add sample data
npm run add-sample-data

# Test authentication
npm run test-mongo
```

**🌟 Your Lakers Inventory Management System is ready for championship-level performance!** 🏆

**Access at:** `http://localhost:3000`  
**Login:** `admin` / `admin123`

*Mamba Mentality in Inventory Management!* 🐍🏀
