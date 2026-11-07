# Task board

Small-team task and project management beta. There is no login. After a project exists, you pick which person you are acting as.

## Run

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB connection string. `MONGODB_DB` is `taskboard`.
3. Install and start:

```bash
npm install
npm start
```

4. Open http://localhost:3000.

`npm test` runs the domain and application tests. The domain tests do not use a database or a screen.

Do not commit `.env`. Only `src/persistence` reads it.

## Folders

The application is four layers. `src/main.js` connects MongoDB, passes the repositories into the application, and starts the server.

- `src/interface` draws the pages and receives the forms.
- `src/application` is the imperative code. A service loads the records, calls one domain rule, and saves only when that rule accepts the change. `src/application/changeStatus.js` is one example.
- `src/domain` holds the rules and the repository interfaces. It does not import MongoDB, the pages, or `.env`.
- `src/persistence` implements the repositories with MongoDB. A declarative query is the member task list in `src/persistence/repositories.js`: `find({ assigneeId }).sort({ dueDate: 1 })`.

## Design

- Single responsibility: each application file does one action, such as adding a task or changing a status.
- Repository interfaces: `src/domain/repositories.js` says what can be stored. The persistence classes implement those interfaces.
- Dependency direction: the interface calls the application, the application calls the domain, and persistence implements the domain interfaces. The domain does not depend on the database or the screens.
