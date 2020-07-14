#!/usr/bin/env node
import { pgrita } from "./index";

const USAGE = `\
Usage:

    npx pgrita [--token <token>] [--project <project>] [--connection <database>]

<token>: your authentication token from pgRITA.com; alternatively supply via the PGRITA_TOKEN environmental variable.

<project>: the name of your project on pgRITA.com; alternatively supply via the PGRITA_PROJECT environmental variable.

<database>: connection string to your PostgreSQL database. If you have PostgreSQL installed locally using trust authentication, your database name may suffice. Otherwise a standard PostgreSQL connection URI (e.g. \`postgres://user:password@host:port/dbname\`) should be supplied. Alternatively supply via the DATABASE_URL environmental variable.
`;

const CLI_FLAGS: readonly string[] = [
  "--project",
  "--token",
  "--connection",
  "--gitBranch",
  "--gitHash",
];

async function main() {
  // Rudimentary CLI parser to avoid adding another dependency
  const args = process.argv.slice(2);
  let token: string | undefined = undefined;
  let project: string | undefined = undefined;
  let database: string | undefined = undefined;
  let gitBranch: string | undefined = undefined;
  let gitHash: string | undefined = undefined;
  let next: string | null = null;
  for (const arg of args) {
    if (CLI_FLAGS.includes(arg)) {
      next = arg;
    } else {
      if (next === "--project") {
        if (project !== undefined) {
          throw Object.assign(
            new Error("--project was specified multiple times"),
            { usage: true }
          );
        }
        project = arg;
      } else if (next === "--token") {
        if (token !== undefined) {
          throw Object.assign(
            new Error("--token was specified multiple times"),
            { usage: true }
          );
        }
        token = arg;
      } else if (next === "--connection") {
        if (database !== undefined) {
          throw Object.assign(
            new Error("--database was specified multiple times"),
            { usage: true }
          );
        }
        database = arg;
      } else if (next === "--gitBranch") {
        if (gitBranch !== undefined) {
          throw Object.assign(
            new Error("--gitBranch was specified multiple times"),
            { usage: true }
          );
        }
        gitBranch = arg;
      } else if (next === "--gitHash") {
        if (gitHash !== undefined) {
          throw Object.assign(
            new Error("--gitHash was specified multiple times"),
            { usage: true }
          );
        }
        gitHash = arg;
      } else {
        throw Object.assign(
          new Error(`Option '${arg}' is not a recognized command-line flag.`),
          { usage: true }
        );
      }
      next = null;
    }
  }
  if (token === undefined) {
    token = process.env.PGRITA_TOKEN;
  }
  if (project === undefined) {
    project = process.env.PGRITA_PROJECT;
  }
  if (database === undefined) {
    database = process.env.PGRITA_DATABASE_URL || process.env.DATABASE_URL;
  }
  if (!token) {
    throw Object.assign(
      new Error(
        "You must specify a token, either via --token or the PGRITA_TOKEN environmental variable."
      ),
      { usage: true }
    );
  }
  if (!project) {
    throw Object.assign(
      new Error(
        "You must specify a project, either via --project or the PGRITA_PROJECT environmental variable."
      ),
      { usage: true }
    );
  }
  if (!database) {
    throw Object.assign(
      new Error(
        "You must specify a database connection string, either via the CLI argument or the DATABASE_URL environmental variable."
      ),
      { usage: true }
    );
  }
  const { status, text } = await pgrita({
    connectionString: database,
    token,
    project,
    gitBranch,
    gitHash,
  });
  console.log(text);
  switch (status) {
    case "PASS": {
      return;
    }
    case "TIMEOUT": {
      process.exitCode = 4;
      return;
    }
    case "ERROR": {
      process.exitCode = 3;
      return;
    }
    case "FAIL": {
      process.exitCode = 2;
      return;
    }
    default: {
      process.exitCode = 10;
      return;
    }
  }
}

main().catch((e) => {
  if (e["usage"]) {
    console.error("ERROR: " + e.message);
    console.log(USAGE);
  } else if (e["code"] === "SELF_SIGNED_CERT_IN_CHAIN") {
    console.error(
      "ERROR: failed to establish an SSL connection to database due to a self-signed certificate in the certificate chain. You can use the `sslcert`, `sslkey` and `sslrootcert` query parameters to configure the connection string securely, or you could export the environmental variable `NODE_TLS_REJECT_UNAUTHORIZED=0` to disable SSL verification. Error message follows:"
    );
    console.error(e.message);
  } else {
    console.error("ERROR: " + e.message);
  }
  process.exit(1);
});
