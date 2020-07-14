# Node client for pgRITA.com

Usage:

```
npx pgrita
  [--token <token>]
  [--project <project>]
  [--connection <database>]
  [--gitBranch <branch>]
  [--gitHash <hash>]
```

The following CLI arguments are required unless the relevant environmental
variable is supplied:

- `--token <token>`: your authentication token from pgRITA.com; alternatively
  supply via the `PGRITA_TOKEN` environmental variable.
- `--project <project>`: the name of your project on pgRITA.com; alternatively
  supply via the `PGRITA_PROJECT` environmental variable.
- `--connection <database>`: connection string to your PostgreSQL database (see
  below); alternatively supply via the `DATABASE_URL` environmental variable.

The command will exit with success (`0` exit code) if introspection is
successful, the upload is successful, the results from your database analysis
are retrieved within the allotted timeout (30 seconds, normally much faster),
and the analysis results show no errors. In all other cases the command will
exit with a non-zero status code indicating failure.

This command is suitable for use in your CI workflow.

## Determining git branch and hash

If you don't supply git branch/hash via the `--gitBranch` and `--gitHash` flags,
we will attempt to determine your git branch and git hash by using these
continuous integration environmental variables:

- GitHub Actions:
  - branch: `GITHUB_REF`
  - hash: `GITHUB_SHA`
- Circle CI
  - branch: `CIRCLE_BRANCH`
  - hash: `CIRCLE_SHA1`
- Travis CI
  - branch: `TRAVIS_PULL_REQUEST_BRANCH` or `TRAVIS_BRANCH`
  - hash: `TRAVIS_COMMIT`

Failing that, we'll try and extract them from the local git repository by
running the following commands:

- git branch: `git rev-parse --abbrev-ref HEAD`
- git hash: `git rev-parse --verify HEAD`

If this fails, we'll progress without branch/hash.

## PostgreSQL connection string

If you have PostgreSQL installed locally using trust authentication, your
database name may suffice. Otherwise a standard PostgreSQL connection URI (e.g.
`postgres://user:password@host:port/dbname`) should be supplied.

You can read more about connection strings here:

- https://www.npmjs.com/package/pg-connection-string
- https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
