#!/bin/bash

export CROSS_CONTAINER_ENGINE=podman

TARGETS=(
    "aarch64-apple-darwin"
    "aarch64-pc-windows-msvc"
    "aarch64-unknown-linux-gnu"
    "x86_64-pc-windows-gnu"
    "x86_64-pc-windows-msvc"
    "x86_64-unknown-linux-gnu"
)

echo "🚀 start..."

rm -rf target/bin
mkdir -p target/bin

for TARGET in "${TARGETS[@]}"; do

    if [[ "$TARGET" == *"aarch64-apple"* ]]; then
        echo "📦 build: cargo: $TARGET"
        cargo build --target "$TARGET" --release
    else
        echo "📦 build: cross: $TARGET"
        cross build --target "$TARGET" --release
    fi

    if [[ "$TARGET" == *"windows"* ]]; then
        cp "target/$TARGET/release/dat-cms.exe" "target/bin/$TARGET.exe"
    else
        cp "target/$TARGET/release/dat-cms" "target/bin/$TARGET"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ OK: $TARGET"
    else
        echo "❌ ERROR: $TARGET"
    fi
done

echo "🎉 ALL DONE"
