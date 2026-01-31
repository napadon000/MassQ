# Massage Reservation System API

A RESTful API for managing massage shop reservations built with Node.js, Express, and MongoDB.

## Features

### User Management
- User registration with name, telephone, email, and password
- User authentication (login/logout)
- JWT-based authorization
- Role-based access control (user/admin)

### Massage Shop Management
- View all massage shops with details (name, address, telephone, open-close time)
- Admin can create, update, and delete massage shops
- Public access to view massage shop information

### Reservation Management
- Users can make up to 3 reservations
- Users can view their own reservations
- Users can edit their own reservations
- Users can delete their own reservations
- Admins can view, edit, and delete any reservation
- Reservations are linked to specific massage shops and dates

## Additional Features

### Reservation History
The system allows registered users to view their massage reservation history. The reservation history information includes:
- Reservation date and time
- Massage shop
- Status (Completed and Cancelled)

### Review + Sentiment Analysis
The system provides review functionality with sentiment analysis:
- Registered users can review their completed massage reservations that have not yet been reviewed
- The system provides the rating of the review using a sentiment analysis model via API
- Users can view ratings of massage shops

### Timeslot + Waitlist
The system provides comprehensive timeslot management:
- Users can view available timeslots including:
  - Number of capacity
  - Availability
  - Waitlist information for a massage shop by specifying the date
- Registered users can reserve by specifying the date and time
- Registered users can reserve fully booked slots by adding themselves to the waitlist
- The system automatically moves waitlisted users up in the queue when someone cancels

## System Requirements

1. Users must register by providing:
   - Name
   - Telephone number
   - Email
   - Password

2. After registration, users can log in using email and password

3. Authenticated users can:
   - Reserve up to 3 active queues by specifying date+time and preferred massage shop
   - View massage shop list with timeslot availability
   - View massage shop details including services offered and hourly timeslots
   - View their active reservations
   - View their complete reservation history (all statuses)
   - Join waitlist when preferred timeslot is full
   - Edit their own reservations
   - Delete their own reservations (except completed)

4. Admins can:
   - View any reservation
   - Edit any reservation
   - Delete any reservation
   - Manage massage shops (create, update, delete)

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current logged in user (Protected)

### Massage Shops
- `GET /api/v1/massageshops` - Get all massage shops (Public)
- `GET /api/v1/massageshops/:id` - Get single massage shop (Public)
- `POST /api/v1/massageshops` - Create massage shop (Admin only)
- `PUT /api/v1/massageshops/:id` - Update massage shop (Admin only)
- `DELETE /api/v1/massageshops/:id` - Delete massage shop (Admin only)

### Reservations
- `GET /api/v1/reservations` - Get active reservations (Protected)
- `GET /api/v1/reservations/history` - Get complete reservation history (Protected)
- `GET /api/v1/reservations/:id` - Get single reservation (Protected)
- `POST /api/v1/massageshops/:massageShopId/reservations` - Create reservation with timeslot (Protected)
- `PUT /api/v1/reservations/:id` - Update reservation (Protected)
- `DELETE /api/v1/reservations/:id` - Delete reservation (Protected)
- `GET /api/v1/massageshops/:massageShopId/reservations` - Get reservations for specific massage shop (Admin only)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `config/config.env` file with the following variables:
```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
```

4. Run the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Models

### User
- name (String, required)
- telephone (String, required)
- email (String, required, unique)
- password (String, required, min 6 characters)
- role (String, enum: ['user', 'admin'], default: 'user')

### MassageShop
- name (String, required, unique, max 50 characters)
- address (String, required)
- tel (String, required)
- openTime (String, required, format: HH:MM)
- closeTime (String, required, format: HH:MM)
- slotDuration (Number, required, enum: [30, 60, 90, 120], default: 60) - Duration in minutes
- timeslotCapacity (Number, required, min: 1)
- services (Array of objects):
  - name (String, required)
  - description (String, required)
  - price (Number, required, min: 0)

### Reservation
- reservationDate (Date, required - includes both date and time, must align with shop's slotDuration)
- user (ObjectId, ref: User, required)
- massageShop (ObjectId, ref: MassageShop, required)
- isWaitlist (Boolean, default: false)
- status (String, enum: ['Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'], default: 'Confirmed')
- createdAt (Date, default: Date.now)

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- cookie-parser for cookie handling

## License

ISC