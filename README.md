# Car rental backend

Run commands from this directory. Use Node.js 24 (verified with 24.14.0).
The updated dependency tree requires Node.js 20.x or 22 and newer; the
`engines` field records this requirement. No runtime is installed by this project.

```sh
npm ci
npm test
npm start
```

`npm run dev` still starts the server through Nodemon. On Windows PowerShell,
use `npm.cmd` if the execution policy blocks `npm.ps1`.
Keep the existing `config/config.env` settings. Database connection, port,
API routes, response fields, JWT settings, and booking rules are unchanged.
The existing Swagger server URL is preserved.

For Yarn Classic users, `yarn install --frozen-lockfile` and `yarn test` are
also supported. Both lockfiles are updated; choose one package manager for
an installation. Prefer `npm ci` for reproducible npm installations.
