# Quick Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Or manually create `.env` with:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fast_delivery?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   JWT_EXPIRES_IN="24h"
   PORT=3000
   ```

3. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

4. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```
   
   When prompted for a migration name, you can use: `init`

5. **Seed the database**
   ```bash
   npm run prisma:seed
   ```
   
   This will create:
   - Zone A (0-3 km, $5.00)
   - Zone B (3-6 km, $10.00)
   - Zone C (6-10 km, $15.00)
   - Admin user (email: admin@example.com, password: admin123)

6. **Start the development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

## Testing the API

### 1. Register a new customer
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123",
    "name": "John Doe",
    "phone": "+1234567890"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response.

### 3. Create an order
```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLatitude": 40.7128,
    "pickupLongitude": -74.0060,
    "deliveryLatitude": 40.7589,
    "deliveryLongitude": -73.9851,
    "description": "Food delivery"
  }'
```

### 4. View your orders
```bash
curl -X GET http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Default Admin Credentials

- Email: `admin@example.com`
- Password: `admin123`

## Database Management

- **View database**: `npm run prisma:studio`
- **Reset database**: Reset or recreate the PostgreSQL database, then run `npm run prisma:migrate` again
- **Re-seed**: `npm run prisma:seed`

## Notes

- Ensure PostgreSQL is running before starting the backend
- Update `DATABASE_URL` in `.env` based on your PostgreSQL username/password/host/port/database

