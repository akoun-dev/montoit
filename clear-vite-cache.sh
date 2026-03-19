#!/bin/bash

# Clear Vite cache directories
rm -rf .vite
rm -rf node_modules/.vite
rm -rf node_modules/.pnpm
rm -rf dist

echo "Vite cache cleared successfully"
