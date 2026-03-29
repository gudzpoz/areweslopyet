#!/bin/sh

set -e

URL=https://lobste.rs/rss
DEST=lobsters.rss
N=25

if [ -f "$DEST" ]; then
  echo "$DEST already exists"
else
  curl -o "$DEST" "$URL"
  echo "$DEST downloaded"
fi

total=$(grep -o '<item>' "$DEST" | wc -l)
if [ "$total" -ne "$N" ]; then
  echo "expected $N items, got $total"
  exit 1
fi

tags=$(grep -o '<category>[^<,]*</category>' "$DEST" \
  | sed 's/<category>\(.*\)<\/category>/\1/g' | sort | uniq -c \
  | tr '\n' ' ' | sed -e 's/  */ /g' -e 's/ $//' -e 's/^ //')

date=$(date -u +"%Y-%m-%d")
echo "$date,$total,$tags" >> public/count.csv
