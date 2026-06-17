#!/bin/bash

TARGET=$1

rustup target add $TARGET
mkdir -p target/bin
rm -rf target/bin/$TARGET
cargo build --release --target $TARGET
cp "target/$TARGET/release/dat-cms" "target/bin/$TARGET"
echo "$PWD/target/bin/$TARGET"
