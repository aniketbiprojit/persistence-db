#!/bin/bash
npx tsc -p .
npx minify ./dist/index.js > ./dist/index.min.js
mv ./dist/index.min.js ./dist/index.js