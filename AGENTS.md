# Backend — Local Guider

## Stack
- Node.js + Express 5
- Sequelize ORM + PostgreSQL (Neon)
- JWT (access + refresh)
- Firebase Admin SDK
- Cloudinary, Razorpay, Socket.IO, Redis

## Rules
- Never commit `.env` or `*firebase-adminsdk*.json`
- Use modular pattern: routes → controller → service → repository
- All routes must use `authenticate` middleware
- Role-based auth: `authorize("ADMIN")` etc. (roles: ADMIN, USER, GUIDER, PHOTOGRAPHER)
- Use `ApiResponse.success(res, message, data, status)` for responses
- Use `ApiError(statusCode, message)` for errors
- DB transactions for multi-table mutations
- Fire-and-forget for notifications, emails, wallet creation