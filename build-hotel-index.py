#!/usr/bin/env python3
"""
Build the sharded hotel index used by gtm-link-generator.html.

Revelex send a new GTCHotels.csv every so often. Re-run this each time:

    python3 build-hotel-index.py

It reads GTCHotels.csv from this folder and writes ./deploy — three files,
ready to drag onto Netlify.

Why shards: the source file is ~85MB / 990k rows. Nobody is downloading that
to look up one hotel ID. Each hotel is indexed under the first three letters
of every significant word in its name, so a search for "cap" needs about 89KB.

Why one packed file: the obvious layout is one file per prefix, but that is
~13,000 files, and Netlify's browser uploader stalls on that many. So every
shard is gzipped individually and concatenated into hotels/pack.bin, with
hotels/meta.json recording each one's byte range. The browser asks for just
that range with an HTTP Range request and gunzips it with DecompressionStream.
Same bytes over the wire, three files to deploy instead of thirteen thousand.
"""

import csv
import io
import json
import re
import shutil
import sys
import gzip
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "GTCHotels.csv"
GENERATOR = HERE / "gtm-link-generator.html"
DEPLOY = HERE / "deploy"
SHARDS = DEPLOY / "hotels"
PACK = SHARDS / "pack.bin"
META = SHARDS / "meta.json"

PREFIX_LEN = 3

# Words that appear in a huge share of hotel names. Indexing them creates a
# few enormous shards ("hot" was 6.5MB) and they are never what someone is
# actually searching for. A name made up entirely of these still gets indexed
# on them, so nothing becomes unfindable.
STOPWORDS = {
    "hotel", "hotels", "resort", "resorts", "inn", "the", "and", "spa",
    "suites", "suite", "motel", "apartments", "apartment", "guest", "house",
    "lodge", "villa", "villas", "residence", "residences",
}

NETLIFY_HEADERS = """/*
  X-Robots-Tag: noindex, nofollow, noarchive

/hotels/pack.bin
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/octet-stream

/hotels/meta.json
  Cache-Control: public, max-age=3600
"""

# The site carries the whole Revelex hotel database. Netlify's free tier has
# no password protection, so keeping it out of search indexes is the least we
# can do - this is obscurity, not security. See netlify/edge-functions/auth.js
# for the actual gate.
ROBOTS = """User-agent: *
Disallow: /
"""


def normalise(value):
    """Fold to plain lowercase ascii words. Must match normalise() in the generator JS."""
    folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", " ", folded.lower())


def tokens_for(name):
    words = [w for w in normalise(name).split() if len(w) >= PREFIX_LEN]
    significant = {w[:PREFIX_LEN] for w in words if w not in STOPWORDS}
    if significant:
        return significant
    # Name was nothing but stopwords ("The Inn"). Index it on those rather
    # than dropping it from the database entirely.
    return {w[:PREFIX_LEN] for w in words}


def load_hotels():
    if not SOURCE.exists():
        sys.exit(f"Missing {SOURCE}. Drop the latest GTCHotels.csv there and re-run.")

    shards = defaultdict(set)
    total = skipped = 0

    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        if len(header) < 11 or header[2] != "GDSHotelID":
            sys.exit(
                "Unexpected columns in GTCHotels.csv.\n"
                f"  expected GDSHotelID at index 2, got: {header}\n"
                "If Revelex changed the format, update the indices below."
            )

        for row in reader:
            total += 1
            if len(row) < 11:
                skipped += 1
                continue
            gds_id = row[2].strip()
            name = row[3].strip()
            if not gds_id.isdigit() or not name:
                skipped += 1
                continue
            record = (gds_id, name, row[6].strip(), row[8].strip().upper())
            buckets = tokens_for(name)
            if not buckets:
                skipped += 1
                continue
            for bucket in buckets:
                shards[bucket].add(record)

    return shards, total, skipped


def write_deploy(shards):
    if SHARDS.exists():
        shutil.rmtree(SHARDS)
    SHARDS.mkdir(parents=True, exist_ok=True)

    meta = {}
    offset = 0

    # Deterministic order so an unchanged CSV rebuilds byte-identically and
    # the CLI has nothing to re-upload.
    with PACK.open("wb") as pack:
        for prefix in sorted(shards):
            # Prefixes reach the client as JSON keys only, but keep them to the
            # [a-z0-9] the tokeniser already guarantees.
            if not re.fullmatch(r"[a-z0-9]+", prefix):
                continue
            rows = io.StringIO()
            writer = csv.writer(rows)
            for record in sorted(shards[prefix], key=lambda r: (r[1].lower(), r[0])):
                writer.writerow(record)
            # mtime=0 keeps the gzip header stable between runs.
            blob = gzip.compress(rows.getvalue().encode("utf-8"), 9, mtime=0)
            pack.write(blob)
            meta[prefix] = [offset, len(blob), len(shards[prefix])]
            offset += len(blob)

    META.write_text(
        json.dumps(
            {"prefixLength": PREFIX_LEN, "packBytes": offset, "shards": meta},
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    if not GENERATOR.exists():
        sys.exit(f"Missing {GENERATOR} — cannot assemble the deploy folder.")
    shutil.copyfile(GENERATOR, DEPLOY / "index.html")
    (DEPLOY / "_headers").write_text(NETLIFY_HEADERS, encoding="utf-8")
    (DEPLOY / "robots.txt").write_text(ROBOTS, encoding="utf-8")

    return meta, offset


def main():
    print(f"Reading {SOURCE.name} …")
    shards, total, skipped = load_hotels()

    print(f"Writing {DEPLOY} …")
    meta, packed = write_deploy(shards)

    sizes = sorted((entry[1] for entry in meta.values()), reverse=True)
    unique = len({r for records in shards.values() for r in records})
    biggest = max(meta, key=lambda k: meta[k][1])

    print()
    print(f"  source rows      {total:,}  ({skipped:,} skipped)")
    print(f"  hotels indexed   {unique:,}")
    print(f"  shards           {len(meta):,}  (packed into one file)")
    print(f"  pack.bin         {packed / 1024 / 1024:.1f} MB")
    print(f"  meta.json        {META.stat().st_size / 1024:.0f} KB")
    print(f"  largest shard    '{biggest}' at {sizes[0] / 1024:.0f} KB")
    print(f"  median shard     {sizes[len(sizes) // 2] / 1024:.1f} KB")
    print()
    print("Three files in ./deploy. A search downloads only its own byte range,")
    print("so the median lookup costs well under a kilobyte.")


if __name__ == "__main__":
    main()
