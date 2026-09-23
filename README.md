# Angular to DB

Full-stack shift management application based on the Wawiwa Project 2 specification.

## Stack

- Angular client in `client/`
- Node.js and Express REST API in `server/`
- MongoDB Atlas through Mongoose

## Run locally

```powershell
cd client
npm install
npm start
```

In another terminal:

```powershell
cd server
npm install
Copy-Item .env.example .env
npm start
```

Set `MONGODB_URI` in `server/.env` with the connection string from MongoDB Atlas. Never commit that file.

## Delivery history

Each completed specification milestone will be recorded in a separate Git commit.
