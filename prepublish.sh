#!/bin/bash
rm -rf dist
npx tsc -p .
npx minify ./dist/index.js > ./dist/index.min.js
mv ./dist/index.min.js ./dist/index.js
chmod +x ./dist/cli.js