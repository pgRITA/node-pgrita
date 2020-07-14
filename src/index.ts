import { Pool } from "pg";
import { INTROSPECTION_QUERY } from "./introspectionQuery";
import { gzipSync } from "zlib";
import fetch from "node-fetch";
import FormData from "form-data";
import { exec } from "child_process";

const PGRITA_BASE_URL = process.env.PGRITA_BASE_URL || "https://pgrita.com";

interface pgRITAOptions {
  connectionString?: string;
  pgPool?: Pool;
  project: string;
  token?: string;
  gitBranch?: string;
  gitHash?: string;
}

async function upload(
  introspection: any,
  token: string,
  project: string,
  { gitBranch, gitHash }: { gitBranch: string | null; gitHash: string | null }
): Promise<{
  status: string;
  text: string;
}> {
  const json = JSON.stringify(introspection);
  const compressed = gzipSync(json, { level: 9 });

  const form = new FormData();
  form.append("data", compressed, {
    contentType: "application/gzip",
    filename: "pgrita_introspection.json",
  });

  const response = await fetch(
    `${PGRITA_BASE_URL}/api/upload?project=${encodeURIComponent(project)}` +
      (gitBranch ? `&git_branch=${encodeURIComponent(gitBranch)}` : "") +
      (gitHash ? `&git_hash=${encodeURIComponent(gitHash)}` : ""),
    {
      method: "POST",
      body: form,
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      redirect: "follow",
      follow: 10,
      timeout: 30000,
    }
  );
  const text = await response.text();
  if (!response.ok) {
    console.error(text);
    throw new Error(`Request failed with status '${response.status}'`);
  }
  if (text[0] === "{") {
    const json = JSON.parse(text);
    if (json.error) {
      throw new Error(json.error);
    }
  }
  const colonIndex = text.indexOf(":");
  if (colonIndex >= 0) {
    const status = text.substr(0, colonIndex);
    return { status, text };
  } else {
    console.error("Did not understand response from server:");
    console.error();
    console.error(text);
    console.error();
    console.error();
    console.error();
    throw new Error("Could not process result from server.");
  }
}

async function tryRun(cmd: string): Promise<string | null> {
  try {
    return await new Promise((resolve, reject) => {
      exec(cmd, {}, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  } catch (e) {
    return null;
  }
}

export async function pgrita(options: pgRITAOptions) {
  const token = options.token || process.env.PGRITA_TOKEN;
  if (!token) {
    throw new Error(
      "You must specify a token, either explicitly or via the 'PGRITA_TOKEN' envvar."
    );
  }
  const project = options.project;
  if (!project) {
    throw new Error("You must specify a project.");
  }

  const gitBranch =
    options.gitBranch ||
    process.env.GITHUB_REF ||
    process.env.CIRCLE_BRANCH ||
    process.env.TRAVIS_PULL_REQUEST_BRANCH ||
    process.env.TRAVIS_BRANCH ||
    (await tryRun("git rev-parse --abbrev-ref HEAD"));
  const gitHash =
    options.gitHash ||
    process.env.GITHUB_SHA ||
    process.env.CIRCLE_SHA1 ||
    process.env.TRAVIS_COMMIT ||
    (await tryRun("git rev-parse --verify HEAD"));

  const pool = options.pgPool
    ? options.pgPool
    : new Pool({
        connectionString: options.connectionString,
      });
  if (!options.pgPool) {
    pool.on("error", (e: Error) => {
      console.error("PostgreSQL connection error occurred:");
      console.error(e.message);
      process.exit(1);
    });
  }
  let results: any = null;
  try {
    const {
      rows: [row],
    } = await pool.query(INTROSPECTION_QUERY);
    results = row.introspection;
  } finally {
    pool.end();
  }

  if (results) {
    return await upload(results, token, project, { gitBranch, gitHash });
  } else {
    throw new Error(
      "Failed to retrieve introspection results from the database."
    );
  }
}
