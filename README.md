# Inventory Management System

A mobile-friendly web-based inventory management system built with Node.js, Express, SQLite, and vanilla JavaScript. Features Lakers team colors (purple and gold) and role-based access control.

## Features

### Core Functionality
- **Inbound Stock Management** - Add products to inventory
- **Outbound Stock Management** - Remove products from inventory with stock validation
- **Stock Movement** - Move products between locations
- **Real-time Stock Levels** - View current inventory across all locations
- **Transaction History** - Complete audit trail of all inventory movements
- **Role-based Access Control** - Different permissions for Admin, Supervisor, and User roles

### Supervisor/Admin Features
- **Stock Take Management** - Create and manage stocktake sessions
- **Comprehensive Reports** - Inbound, Outbound, Stock Levels, Transaction Summary
- **User Activity Monitoring** - Track user actions and generate activity reports

### Technical Features
- **Mobile-First Design** - Responsive UI optimized for mobile devices
- **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- **SQL Injection Protection** - Parameterized queries throughout
- **Audit Logging** - Complete user activity logging
- **Rate Limiting** - Protection against brute force attacks

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with prepared statements
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: JWT, bcrypt, helmet, CORS
- **UI Framework**: Custom CSS with Lakers color scheme

## Installation

1. **Clone the repository**
   ```bash
   cd c:\Users\anaqy\Downloads\fyptestin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run init-db
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser to `http://localhost:3000`
   - Use the default credentials below

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Supervisor | supervisor | user123 |
| User | user1 | user123 |

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### Inventory Endpoints
- `GET /api/inventory/products` - Get all products
- `GET /api/inventory/locations` - Get all locations
- `GET /api/inventory/stock` - Get current stock levels
- `POST /api/inventory/inbound` - Add inbound stock
- `POST /api/inventory/outbound` - Remove outbound stock
- `POST /api/inventory/move` - Move stock between locations
- `GET /api/inventory/transactions` - Get transaction history

### Stocktake Endpoints (Supervisor/Admin only)
- `POST /api/stocktake/start` - Start new stocktake session
- `GET /api/stocktake/sessions` - Get stocktake sessions
- `GET /api/stocktake/sessions/:id/details` - Get stocktake details
- `PUT /api/stocktake/count` - Update counted quantities
- `POST /api/stocktake/complete` - Complete stocktake session

### Reports Endpoints (Supervisor/Admin only)
- `GET /api/reports/inbound` - Inbound transactions report
- `GET /api/reports/outbound` - Outbound transactions report
- `GET /api/reports/stock-levels` - Current stock levels report
- `GET /api/reports/transaction-summary` - Transaction summary report
- `GET /api/reports/user-activity` - User activity report (Admin only)
- `GET /api/reports/product-movement` - Product movement history

## Database Schema

### Core Tables
- **users** - User accounts and roles
- **products** - Product catalog
- **locations** - Storage locations
- **stock** - Current stock levels by product and location
- **transactions** - All inventory movements
- **audit_logs** - User activity audit trail

### Stocktake Tables
- **stocktake_sessions** - Stocktake session management
- **stocktake_details** - Individual item counts during stocktake

## Security Features

1. **Authentication & Authorization**
   - JWT token-based authentication
   - Role-based access control (Admin, Supervisor, User)
   - Secure password hashing with bcrypt

2. **Data Protection**
   - Parameterized SQL queries prevent injection attacks
   - Input validation and sanitization
   - CORS protection
   - Security headers with Helmet.js

3. **Audit & Monitoring**
   - Complete audit trail of all user actions
   - Transaction logging with user attribution
   - IP address and user agent tracking

4. **Rate Limiting**
   - Protection against brute force attacks
   - Configurable request limits per IP

## Mobile Optimization

- **Responsive Design** - Works seamlessly on phones, tablets, and desktops
- **Touch-Friendly Interface** - Large buttons and easy navigation
- **Progressive Web App Ready** - Can be installed on mobile devices
- **Offline Capability** - Basic functionality works without internet

## Color Scheme

The application uses the official Los Angeles Lakers color palette:
- **Primary Purple**: #552583
- **Gold/Yellow**: #FDB927
- **White**: #FFFFFF
- **Black**: #000000

## Development

### Project Structure
```
fyptestin/
├── config/          # Configuration files
├── database/        # Database schema and files
├── middleware/      # Express middleware
├── public/          # Frontend assets
├── routes/          # API route handlers
├── scripts/         # Utility scripts
├── server.js        # Main server file
└── package.json     # Dependencies and scripts
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `DATABASE_PATH` - SQLite database file path

### Adding New Features

1. **Backend**: Add routes in `/routes/` directory
2. **Frontend**: Update `/public/app.js` and `/public/index.html`
3. **Database**: Add migrations in `/database/schema.sql`
4. **Security**: Ensure proper authentication and validation

## Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-secure-secret-key
   PORT=80
   ```

2. **Security Considerations**
   - Use HTTPS in production
   - Set strong JWT secret
   - Configure proper CORS origins
   - Use environment variables for all secrets

3. **Database Backup**
   - Regular SQLite database backups
   - Transaction log archiving

### Docker Deployment (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure SQLite permissions are correct
   - Run database initialization: `npm run init-db`

2. **Authentication Issues**
   - Check JWT secret configuration
   - Verify user credentials in database

3. **Mobile Display Issues**
   - Ensure viewport meta tag is present
   - Check CSS media queries

### Performance Optimization

- Database indexing on frequently queried columns
- Pagination for large datasets
- Caching for static data
- Image optimization for mobile

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For technical support or feature requests, please create an issue in the repository.

---

**Note**: This system is designed for internal company use. Ensure proper security measures are in place before deploying to production environments.
