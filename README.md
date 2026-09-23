# Angular to DB

Full-stack shift management application built for the Wawiwa Project 2 specification. The application lets workers create an account, sign in, manage their profile, create and edit shifts, filter their schedule and recover a forgotten password. Administrators can review team shifts, inspect worker profiles, update or delete workers, promote workers to administrators and view team statistics.

## Technology

- Angular client in `client/`
- Node.js and Express REST API in `server/`
- MongoDB Atlas with Mongoose
- JWT authentication with 60-minute sessions
- Bcrypt password hashing

## Project structure

```text
client/   Angular application and responsive UI
server/   Express API, authentication and MongoDB models
```

## Local setup

Install and start the API:

```powershell
cd server
npm install
Copy-Item .env.example .env
npm start
```

Set the MongoDB Atlas connection string in `server/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=use-a-long-random-secret
CLIENT_ORIGIN=http://localhost:4200
```

Never commit `server/.env`. It is ignored by Git.

In a second terminal, start Angular:

```powershell
cd client
npm install
npm start
```

Open `http://localhost:4200` in the browser. The API runs at `http://localhost:3000`.

## First administrator role

New registrations are created with the `worker` role. The first administrator must be introduced manually in MongoDB Atlas because a regular worker must never be allowed to promote itself.

In Atlas, open the project database, select the `users` collection, find the account that should become the first administrator and change its field to:

```json
{
	"role": "admin"
}
```

Log out and sign in again after changing the role so a new JWT session is created. From then on, an administrator can promote workers using the application. Never share or commit the database username, password or connection string.

## Main API areas

- `/api/auth`: registration, login and password recovery
- `/api/me`: authenticated profile access and updates
- `/api/shifts`: authenticated worker shift management
- `/api/admin`: administrator summaries, shifts, workers and role management

## Delivery history

Each completed project milestone is recorded in a separate Git commit and pushed to the repository.
