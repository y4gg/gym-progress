#!/bin/sh
set -eu

bun scripts/migrate.mjs
exec bun "$@"
