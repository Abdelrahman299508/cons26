"use strict";

const { createRepositories } = require("./persistence/repositories");
const { createApplication } = require("./application");
const { createServer } = require("./interface/server");

async function main() {
  const repositories = await createRepositories();
  const app = createApplication(repositories);
  const port = Number(process.env.PORT) || 3000;
  const server = createServer(app);
  server.listen(port, () => {
    console.log(`Task board at http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
