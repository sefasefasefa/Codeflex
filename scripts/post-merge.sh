#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Push schema to both possible database locations
cd lib/db
DATABASE_FILE=../../data/database.sqlite npx drizzle-kit push --config ./drizzle.config.ts
DATABASE_FILE=../../artifacts/api-server/data/database.sqlite npx drizzle-kit push --config ./drizzle.config.ts
