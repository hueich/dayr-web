#!/bin/bash
for file in $(find www -type f \! -name "*.gz"); do
    gzip "$file" -9 -c > "$file.gz"
done