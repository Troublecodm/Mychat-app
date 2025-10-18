#!/usr/bin/env bash
echo "Installing dependencies..."
npm install express socket.io fs-extra shortid --no-audit --no-fund
echo "Done. Start server with: node server.js"
