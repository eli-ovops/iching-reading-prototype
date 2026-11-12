#!/bin/zsh
set -euo pipefail

script_dir=${0:A:h}
ios_root=${script_dir:h}
source_root=${ios_root:h}
web_root="$ios_root/IChingReflectionMVP/Web"

mkdir -p "$web_root"

# Web/vendor was a generated legacy copy of historical profile experiments.
# Remove only this known generated subtree before copying the allowlisted input;
# no source vendor directory or unrelated app resource is touched.
if [[ -d "$web_root/vendor" ]]; then
  rm -rf "$web_root/vendor"
fi

for file in index.html app.js styles.css iching-core.js reflection-prompts.js reflection-store.js soundscape.js; do
  cp "$source_root/$file" "$web_root/$file"
done

for directory in assets content; do
  mkdir -p "$web_root/$directory"
  rsync -a "$source_root/$directory/" "$web_root/$directory/"
done

echo "Web resources updated from the allowlist; legacy Web/vendor is excluded and removed."
