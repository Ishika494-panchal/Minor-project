# Project Run Instructions & Fixes

## 1. Backend Setup [ ]
- [ ] Install MongoDB Community Edition (https://mongodb.com/try/download)
- [ ] Start MongoDB service: `mongod`
- [ ] `cd backend`
- [ ] copy .env.example .env
- [ ] Edit backend/.env with MONGODB_URI + JWT_SECRET
- [ ] `node seed.js` (test data)
- [ ] `npm run dev` (API port 3000)

## 2. Frontend [ ]
- [ ] `ng serve` (port 4200, opens browser)
- [ ] Landing: http://localhost:4200 ✓
- Test accounts: client/freelancer/admin@test.com / 123456

## 3. Socket.IO Removed [ ]
- REST-only messages now (no live chat, polling)

## Current Status: Backend seed fixed, frontend ready
