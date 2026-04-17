# Real-Time System Documentation

## Overview

This document describes the production-grade real-time system for the fast delivery application. The system uses Socket.IO for WebSocket connections, Redis for state management and pub/sub, and PostgreSQL (via Prisma) for persistent data.

## Architecture

### Components

1. **Socket.IO Gateway** (`src/realtime/realtime.gateway.ts`)
   - Handles all WebSocket connections
   - JWT authentication middleware
   - Event routing and validation

2. **Redis Service** (`src/redis/redis.service.ts`)
   - Manages Redis connections (client, subscriber, publisher)
   - Provides methods for state management
   - Supports pub/sub for horizontal scaling

3. **Driver Location Service** (`src/realtime/services/driver-location.service.ts`)
   - Tracks driver locations in Redis
   - Manages driver online/offline status
   - Provides nearest driver lookup

4. **Order Realtime Service** (`src/realtime/services/order-realtime.service.ts`)
   - Manages order socket rooms
   - Handles order status broadcasts
   - Verifies user access to orders

## Authentication

All socket connections **must** be authenticated using JWT tokens.

### Connection

Clients connect with JWT token in one of these ways:

1. **Via auth object** (recommended):
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

2. **Via Authorization header**:
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

### Unauthenticated Connections

Any connection without a valid JWT token is **immediately rejected** and disconnected.

## Roles

The system supports three roles:

- **CUSTOMER**: Can create orders, view own orders, receive driver location updates
- **DRIVER**: Can accept orders, send location updates, update order status
- **ADMIN**: Full system access

## Driver Real-Time Tracking

### Location Updates

Drivers send location updates every 5-10 seconds using the `driver_location_update` event.

**Event**: `driver_location_update`

**Payload**:
```typescript
{
  lat: number;      // Latitude (-90 to 90)
  lng: number;      // Longitude (-180 to 180)
  orderId?: string; // Optional: Order ID if updating location for a specific order
}
```

**Example**:
```javascript
socket.emit('driver_location_update', {
  lat: 40.7128,
  lng: -74.0060,
  orderId: 'order-uuid' // Optional
});
```

### Redis Storage

Driver locations are stored in Redis with the key format:
```
driver:location:{driverId}
```

**Data Structure**:
```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**TTL**: 5 minutes (automatically expires if no updates)

### Online Status

Driver online status is tracked separately:
```
driver:online:{driverId}
```

**TTL**: 1 minute (refreshed on each location update)

## Order Real-Time Lifecycle

### Order Statuses

1. `PENDING` - Order created, waiting for driver
2. `ACCEPTED` - Driver accepted the order
3. `ON_THE_WAY` - Driver is en route to delivery
4. `DELIVERED` - Order successfully delivered
5. `CANCELED` - Order canceled

### Socket Rooms

Each order has its own socket room:
```
order:{orderId}
```

**Access Control**:
- Only the **assigned driver** and **order customer** can join
- System automatically verifies access before allowing room join

### Joining Order Room

**Event**: `join_order_room`

**Payload**:
```typescript
{
  orderId: string;
}
```

**Example**:
```javascript
socket.emit('join_order_room', {
  orderId: 'order-uuid'
});
```

### Leaving Order Room

**Event**: `leave_order_room`

**Payload**:
```typescript
{
  orderId: string;
}
```

## Events

### From Driver

#### `driver_location_update`

Driver sends location update.

**Emitted by**: Driver client
**Received by**: Server
**Response**: `{ success: true }`

#### `driver_accept_order`

Driver accepts a pending order.

**Emitted by**: Driver client
**Received by**: Server
**Payload**:
```typescript
{
  orderId: string;
}
```

**Response**: `{ success: true, order: Order }`

**Side Effects**:
- Order status changes to `ACCEPTED`
- Driver automatically joins order room
- `order_status_update` event emitted to order room

### From Server

#### `order_status_update`

Order status has changed.

**Emitted by**: Server
**Received by**: All clients in order room
**Payload**:
```typescript
{
  orderId: string;
  status: OrderStatus;
  order?: Order; // Full order object
  timestamp: string;
}
```

#### `driver_location_broadcast`

Driver location update broadcast to customer.

**Emitted by**: Server
**Received by**: Customer in order room
**Payload**:
```typescript
{
  orderId: string;
  location: {
    lat: number;
    lng: number;
    driverId: string;
    updatedAt: string;
  };
  timestamp: string;
}
```

**Note**: Only sent when driver includes `orderId` in location update.

#### `order_created`

New order has been created.

**Emitted by**: Server
**Received by**: Customer (in user room)
**Payload**:
```typescript
{
  orderId: string;
  order: Order;
  timestamp: string;
}
```

#### `new_order_available`

New order available for drivers.

**Emitted by**: Server
**Received by**: All drivers (in 'drivers' room)
**Payload**:
```typescript
{
  orderId: string;
  order: {
    id: string;
    pickupLatitude: number;
    pickupLongitude: number;
    deliveryLatitude: number;
    deliveryLongitude: number;
    distance: number;
    fare: number;
    description?: string;
  };
  timestamp: string;
}
```

#### `order_room_closed`

Order room is being closed (order delivered or canceled).

**Emitted by**: Server
**Received by**: All clients in order room
**Payload**:
```typescript
{
  orderId: string;
  timestamp: string;
}
```

## Real-Time Flow

### 1. Customer Creates Order

1. Customer calls REST API: `POST /orders`
2. Server creates order in database
3. Server emits `order_created` to customer
4. Server emits `new_order_available` to all drivers

### 2. Driver Accepts Order

1. Driver emits `driver_accept_order` with orderId
2. Server validates driver access
3. Server updates order status to `ACCEPTED`
4. Driver automatically joins order room
5. Server emits `order_status_update` to order room

### 3. Driver Sends Location Updates

1. Driver emits `driver_location_update` every 5-10 seconds
2. Server validates coordinates
3. Server stores location in Redis
4. If `orderId` provided:
   - Server verifies driver has access
   - Server broadcasts `driver_location_broadcast` to order room
   - Customer receives location update

### 4. Order Delivered

1. Driver updates order status via REST API: `PATCH /orders/:id/status`
2. Server updates database
3. Server emits `order_status_update` to order room
4. Server closes order room
5. Server emits `order_room_closed` to all clients in room

## Redis Usage

### State Management

Redis stores:

1. **Driver Locations**
   - Key: `driver:location:{driverId}`
   - TTL: 5 minutes
   - Value: JSON with lat, lng, updatedAt

2. **Driver Online Status**
   - Key: `driver:online:{driverId}`
   - TTL: 1 minute
   - Value: "1"

### Pub/Sub

Redis Pub/Sub is used for:

- Socket.IO adapter (horizontal scaling)
- Cross-server communication

### TTL Strategy

- **Driver locations**: 5 minutes (assumes driver sends updates every 5-10 seconds)
- **Online status**: 1 minute (refreshed on each location update)

If a driver doesn't send updates, their status automatically expires.

## Scalability

### Horizontal Scaling

The system supports multiple Socket.IO servers:

1. **Redis Adapter**: Socket.IO uses Redis adapter for cross-server communication
2. **Stateless Servers**: No in-memory state in Node.js
3. **Redis State**: All state stored in Redis
4. **Load Balancer**: Use sticky sessions or round-robin

### Redis Configuration

For production, configure Redis:

```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## Security

### Authentication

- All socket connections require valid JWT token
- Unauthenticated connections are immediately rejected
- Token validated on every connection

### Authorization

- Order room access verified before join
- Driver order access verified before location broadcast
- Role-based access control enforced

### Validation

- All incoming payloads validated
- Coordinate ranges validated (-90 to 90 for lat, -180 to 180 for lng)
- Order IDs validated against database

### Misbehavior Handling

- Invalid payloads: Error response, connection remains
- Unauthorized access: Connection rejected
- Invalid tokens: Connection rejected

## Observability

### Logging

The system logs:

- Socket connections (user ID, role, socket ID)
- Disconnections (user ID, reason)
- Order state changes (order ID, old status, new status)
- Location updates (driver ID, coordinates)
- Errors (with stack traces)

### Metrics-Ready

The architecture supports metrics collection:

- Connection counts
- Event counts
- Error rates
- Latency measurements

## Client Implementation Examples

### JavaScript/TypeScript

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for order status updates
socket.on('order_status_update', (data) => {
  console.log('Order status updated:', data);
});

// Listen for driver location
socket.on('driver_location_broadcast', (data) => {
  console.log('Driver location:', data.location);
});

// Join order room
socket.emit('join_order_room', { orderId: 'order-uuid' });

// Driver: Send location update
socket.emit('driver_location_update', {
  lat: 40.7128,
  lng: -74.0060,
  orderId: 'order-uuid'
});

// Driver: Accept order
socket.emit('driver_accept_order', {
  orderId: 'order-uuid'
});
```

### React Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function useOrderTracking(orderId: string, token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [driverLocation, setDriverLocation] = useState<any>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_order_room', { orderId });
    });

    newSocket.on('order_status_update', (data) => {
      setOrderStatus(data.status);
    });

    newSocket.on('driver_location_broadcast', (data) => {
      setDriverLocation(data.location);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [orderId, token]);

  return { orderStatus, driverLocation };
}
```

## Testing

### Manual Testing

1. **Start Redis**:
```bash
redis-server
```

2. **Start Application**:
```bash
npm run start:dev
```

3. **Test Connection**:
```javascript
// Get JWT token from /auth/login
const token = 'your-jwt-token';

const socket = io('http://localhost:3000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('Connected!');
});
```

### Integration Testing

Use Socket.IO client libraries to test:

- Connection authentication
- Event emission and reception
- Room joining/leaving
- Error handling

## Production Checklist

- [ ] Redis configured with password
- [ ] Redis persistence enabled
- [ ] JWT_SECRET is strong and secure
- [ ] CORS configured for production domains
- [ ] Rate limiting implemented
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Load balancer configured with sticky sessions
- [ ] Redis cluster configured (if needed)
- [ ] Backup strategy for Redis data

## Troubleshooting

### Connection Rejected

- Check JWT token is valid and not expired
- Verify token is sent in auth object or Authorization header
- Check server logs for authentication errors

### Location Updates Not Received

- Verify driver is in order room
- Check driver has access to order
- Verify orderId is included in location update
- Check Redis connection

### Order Room Access Denied

- Verify user is customer or assigned driver
- Check order exists in database
- Verify JWT token contains correct user ID

### Redis Connection Issues

- Verify Redis is running
- Check REDIS_HOST and REDIS_PORT in .env
- Verify Redis password if configured
- Check network connectivity

