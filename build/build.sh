#!/bin/bash

TARGET=$1

rustup target add $TARGET
rm -rf target/$TARGET
cargo build --release --target $TARGET
cp target/$TARGET/release/dat-cms target/bin/$TEARGET
echo "$PWD/target/bin$TARGET"
