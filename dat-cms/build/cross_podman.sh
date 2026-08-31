#!/bin/bash

set -uo pipefail

export CROSS_CONTAINER_ENGINE=podman

DEFAULT_TARGETS=(
    "aarch64-apple-darwin"
    "aarch64-unknown-linux-gnu"
    "x86_64-unknown-linux-gnu"
    "aarch64-pc-windows-msvc"
    "aarch64-pc-windows-gnullvm"
    "x86_64-pc-windows-gnu"
    "x86_64-pc-windows-msvc"
)

if [[ $# -gt 0 ]]; then
    TARGETS=("$@")
else
    TARGETS=("${DEFAULT_TARGETS[@]}")
fi

for target in "${TARGETS[@]}"; do
    if ! rustup target list | cut -d' ' -f1 | grep -Fxq "$target"; then
        echo "unknown Rust target: $target" >&2
        exit 64
    fi
done

echo "🚀 start..."

mkdir -p target/bin

HOST_TARGET=$(rustc -vV | sed -n 's/^host: //p')
echo "💻 Current Host Target: $HOST_TARGET"

for TARGET in "${TARGETS[@]}"; do
    if [[ "$TARGET" != "$HOST_TARGET" ]] && ! command -v cross >/dev/null; then
        echo "cross is required for non-host targets" >&2
        exit 69
    fi
done

declare -a results=()
failures=0

for TARGET in "${TARGETS[@]}"; do
    if ! rustup target list --installed | grep -Fxq "$TARGET"; then
        echo "❌ missing Rust target: $TARGET"
        results+=("$TARGET: missing target")
        ((failures += 1))
        continue
    fi

    if [[ "$TARGET" == "$HOST_TARGET" ]]; then
        echo "📦 build: cargo: $TARGET"
        builder=(cargo build --locked --target "$TARGET" --release)
    else
        echo "📦 build: cross: $TARGET"
        builder=(cross build --locked --target "$TARGET" --release)
    fi

    if ! "${builder[@]}"; then
        echo "❌ ERROR: $TARGET"
        results+=("$TARGET: build failed")
        ((failures += 1))
        continue
    fi

    if [[ "$TARGET" == *"windows"* ]]; then
        binary="target/$TARGET/release/dat-cms.exe"
        output="target/bin/dat-cms-$TARGET.exe"
    else
        binary="target/$TARGET/release/dat-cms"
        output="target/bin/dat-cms-$TARGET"
    fi

    if [[ ! -f "$binary" ]]; then
        echo "❌ binary missing: $binary"
        results+=("$TARGET: binary missing")
        ((failures += 1))
        continue
    fi

    cp "$binary" "$output"
    echo "✅ OK: $TARGET"
    results+=("$TARGET: ok")
done

printf '\nBuild summary:\n'
printf '  %s\n' "${results[@]}"
echo "$PWD/target/bin"

if (( failures > 0 )); then
    exit 1
fi
