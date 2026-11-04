#!/bin/sh
# Migraciones y seed idempotente antes de arrancar; si un paso falla, el contenedor no arranca.
set -e
node node_modules/prisma/build/index.js migrate deploy
node dist/seed.js
exec node dist/main.js
