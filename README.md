# Angular to DB

Full-stack shift management application built for the Wawiwa Project 2 specification. The application lets workers create an account, sign in, manage their profile, create and edit shifts, filter their schedule and recover a forgotten password. Administrators can review team shifts, inspect worker profiles, update or delete workers, promote workers to administrators and view team statistics.

## Learning project

This is an educational project created to practice full-stack web development. It demonstrates how an Angular frontend communicates with a Node.js REST API, how authentication protects user data and how application records are stored in MongoDB Atlas. It is intended for study and portfolio development, not as a production-ready system.

The project also exercises common team application concepts: role-based access, form validation, CRUD operations, responsive interfaces, password security and separated frontend/backend responsibilities.

## Technology

- Angular 19 with standalone components
- Angular Reactive Forms and `HttpClient`
- TypeScript and SCSS for the client interface
- Node.js with Express for the REST API
- MongoDB Atlas as the cloud database
- Mongoose for schemas and database operations
- JWT authentication with 60-minute sessions
- Bcryptjs password hashing
- Git and GitHub for version control and milestone history

## Project structure

```text
Angular-to-db/
|-- client/
|   |-- src/app/           Angular component, forms and application views
|   |-- src/styles.scss    Global visual styles
|   |-- angular.json       Angular build and budget configuration
|   `-- package.json       Frontend dependencies and scripts
|-- server/
|   |-- src/index.js       Express server, routes and Mongoose models
|   |-- .env.example       Environment variable template
|   `-- package.json       Backend dependencies and scripts
|-- .gitignore              Excludes dependencies, builds and secrets
|-- README.md               Project documentation
`-- package-lock.json       Root dependency lock file
```

### Frontend responsibilities

The Angular application renders the registration, login, password recovery, worker dashboard, shift management and administrator screens. It validates user input, stores the login token locally and calls the REST API through `HttpClient`.

### Backend responsibilities

The Express server exposes authentication, profile, shift and administrator endpoints. It validates requests, hashes passwords, verifies JWT tokens, enforces worker/admin permissions and reads or writes records in MongoDB Atlas.

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
