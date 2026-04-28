# Fast Delivery Backend API

A comprehensive backend API for a fast delivery application built with NestJS, TypeScript, Prisma, and PostgreSQL.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Access Control** - Customer, Driver, and Admin roles
- 📦 **Order Management** - Complete order lifecycle management
- 🗺️ **Zone-Based Pricing** - Distance-based delivery zones with automatic fare calculation
- 📍 **Distance Calculation** - Haversine formula for accurate distance calculation
- ✅ **DTO Validation** - Request validation using class-validator
- 🛡️ **Error Handling** - Comprehensive error handling with custom filters

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (passport-jwt)
- **Validation**: class-validator, class-transformer

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data Transfer Objects
│   ├── strategies/      # JWT strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # Users module
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── orders/              # Orders module
│   ├── dto/             # Order DTOs
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── orders.module.ts
├── zones/               # Zones module
│   ├── zones.controller.ts
│   ├── zones.service.ts
│   └── zones.module.ts
├── prisma/              # Prisma configuration
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── guards/          # Auth and role guards
│   ├── filters/         # Exception filters
│   └── utils/           # Utility functions
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## Database Schema

### Models

- **User**: Customers, Drivers, and Admins
- **Driver**: Driver-specific information
- **Order**: Delivery orders with status tracking
- **Zone**: Delivery zones with distance ranges and pricing

### Order Status Flow

1. `PENDING` - Order created, waiting for driver
2. `ACCEPTED` - Driver accepted the order
3. `ON_THE_WAY` - Driver is en route to delivery
4. `DELIVERED` - Order successfully delivered
5. `CANCELED` - Order canceled

### Zones

- **Zone A**: 0-3 km → $5.00
- **Zone B**: 3-6 km → $10.00
- **Zone C**: 6-10 km → $15.00

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd back_end_meez
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory (or copy `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fast_delivery?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=3000
```

4. **Set up the database**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database with zones
npm run prisma:seed
```

5. **Start the development server**

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890",
  "role": "CUSTOMER"  // Optional: CUSTOMER, DRIVER, ADMIN
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "name": "John Doe",
    "role": "CUSTOMER"
  },
  "access_token": "jwt-token"
}
```

### Users

#### Get Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

#### Get All Users (Admin only)
```http
GET /users
Authorization: Bearer <admin-token>
```

#### Get User by ID (Admin only)
```http
GET /users/:id
Authorization: Bearer <admin-token>
```

### Orders

#### Create Order
```http
POST /orders
Authorization: Bearer <customer-token>
Content-Type: application/json

{
  "pickupLatitude": 40.7128,
  "pickupLongitude": -74.0060,
  "deliveryLatitude": 40.7589,
  "deliveryLongitude": -73.9851,
  "description": "Food delivery"  // Optional
}
```

**Response includes:**
- Calculated distance (km)
- Assigned zone
- Calculated fare

#### Get All Orders
```http
GET /orders
Authorization: Bearer <token>
```

Returns orders based on user role:
- **Customer**: Their own orders
- **Driver**: Orders assigned to them
- **Admin**: All orders

#### Get Available Orders (Driver only)
```http
GET /orders/available
Authorization: Bearer <driver-token>
```

Returns all pending orders available for drivers to accept.

#### Get Order by ID
```http
GET /orders/:id
Authorization: Bearer <token>
```

#### Accept Order (Driver only)
```http
POST /orders/:id/accept
Authorization: Bearer <driver-token>
```

#### Update Order Status
```http
PATCH /orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "ON_THE_WAY"  // ACCEPTED, ON_THE_WAY, DELIVERED, CANCELED
}
```

**Status Transition Rules:**
- Customers can only cancel `PENDING` orders
- Drivers can update status: `ACCEPTED` → `ON_THE_WAY` → `DELIVERED`
- Admins can update any status

### Zones

#### Get All Zones
```http
GET /zones
Authorization: Bearer <token>
```

#### Get Zone by ID
```http
GET /zones/:id
Authorization: Bearer <token>
```

## Business Logic

### Distance Calculation

The application uses the **Haversine formula** to calculate the distance between pickup and delivery locations:

```typescript
distance = calculateDistance(
  pickupLatitude,
  pickupLongitude,
  deliveryLatitude,
  deliveryLongitude
)
```

### Zone Assignment

Zones are automatically assigned based on calculated distance:
- Distance ≤ 3 km → Zone A
- 3 km < Distance ≤ 6 km → Zone B
- 6 km < Distance ≤ 10 km → Zone C
- Distance > 10 km → Error (out of service area)

### Fare Calculation

The fare is automatically calculated and stored when an order is created based on the assigned zone's price.

## Role-Based Access Control

### Customer
- Create orders
- View own orders
- Cancel pending orders
- View zones

### Driver
- View assigned orders
- View available orders
- Accept orders
- Update order status (ACCEPTED → ON_THE_WAY → DELIVERED)
- View zones

### Admin
- View all users
- View all orders
- Update any order status
- Full system access

## Error Handling

The API uses a global exception filter that returns consistent error responses:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/orders",
  "message": "Error message"
}
```

## Database Migration to PostgreSQL

To migrate from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

3. Run migrations:
```bash
npm run prisma:migrate
```

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run start:prod` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed the database
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run test` - Run tests
- `npm run lint` - Run linter

## Testing

Example API calls using curl:

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create Order (replace TOKEN with actual token)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLatitude":40.7128,"pickupLongitude":-74.0060,"deliveryLatitude":40.7589,"deliveryLongitude":-73.9851}'
```

## License

MIT

#   m e e z _ b a c k _ e n d 
 
 # back
# back
