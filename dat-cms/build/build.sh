#!/bin/bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "usage: $0 <rust-target>" >&2
    exit 64
fi

TARGET="$1"
if ! rustup target list | cut -d' ' -f1 | grep -Fxq "$TARGET"; then
    echo "unknown Rust target: $TARGET" >&2
    exit 64
fi

if ! rustup target list --installed | grep -Fxq "$TARGET"; then
    echo "Rust target is not installed: $TARGET" >&2
    echo "install it explicitly with: rustup target add $TARGET" >&2
    exit 69
fi

mkdir -p target/bin
cargo build --locked --release --target "$TARGET"

binary="target/$TARGET/release/dat-cms"
if [[ "$TARGET" == *windows* ]]; then
    binary+=".exe"
fi

if [[ ! -f "$binary" ]]; then
    echo "build completed but binary is missing: $binary" >&2
    exit 1
fi

output="target/bin/dat-cms-$TARGET"
if [[ "$TARGET" == *windows* ]]; then
    output+=".exe"
fi
cp "$binary" "$output"
echo "$PWD/$output"
