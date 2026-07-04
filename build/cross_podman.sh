#!/bin/bash

rustup update

export CROSS_CONTAINER_ENGINE=podman

TARGETS=(
    "aarch64-apple-darwin"

    "aarch64-unknown-linux-gnu"
    "x86_64-unknown-linux-gnu"

    "aarch64-pc-windows-msvc"
    "aarch64-pc-windows-gnullvm"
    "x86_64-pc-windows-gnu"
    "x86_64-pc-windows-msvc"
)

echo "🚀 start..."

rm -rf target/bin
mkdir -p target/bin

HOST_TARGET=$(rustc -vV | grep 'host:' | cut -d: -f2 | tr -d ' ')
echo "💻 Current Host Target: $HOST_TARGET"

for TARGET in "${TARGETS[@]}"; do

    if ! rustup target list | grep -q "$TARGET (installed)"; then
        echo "🛠 install️ target '$TARGET'"
        if ! rustup target add "$TARGET"; then
            echo "❌ install error: $TARGET"
            continue
        fi
    fi

    if [ -d "target/$TARGET" ]; then
        echo "🧹 Cleaning previous target cache for $TARGET..."
        rm -rf "target/$TARGET"
    fi

    if [[ "$TARGET" == "$HOST_TARGET" ]]; then
        echo "📦 build: cargo: $TARGET"
        cargo build --target "$TARGET" --release
    else
        echo "📦 build: cross: $TARGET"
        cross build --target "$TARGET" --release
    fi

    if [[ "$TARGET" == *"windows"* ]]; then
        cp "target/$TARGET/release/dat-cms.exe" "target/bin/dat-cms-$TARGET.exe"
    else
        cp "target/$TARGET/release/dat-cms" "target/bin/dat-cms-$TARGET"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ OK: $TARGET"
    else
        echo "❌ ERROR: $TARGET"
    fi
done

echo "🎉 ALL DONE"
echo "$(pwd)/target/bin"
