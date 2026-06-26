#!/bin/bash

set -euo pipefail

echo "▶ Running Drizzle codegen..."
pnpm drizzle-kit generate

if [ -n "${DATABASE_URL:-}" ]; then
    echo "▶ Applying migrations..."
    pnpm drizzle-kit migrate
else
    echo "▶ DATABASE_URL not set, skipping drizzle-kit migrate (app will migrate embedded pglite db on startup)"
fi

echo "▶ Starting Next.js dev server..."
exec pnpm dev
