#!/usr/bin/env bash
# Rebuild the static site and publish it to https://knapsack.zhou-yufan.com
#
# Serving chain on this machine:
#   Cloudflare DNS (knapsack.zhou-yufan.com)
#     -> cloudflared tunnel "knapsack" (pm2: knapsack-tunnel,
#        config ~/.cloudflared/config-knapsack.yml)
#     -> static server (pm2: knapsack-web, `serve` on 127.0.0.1:8793)
#     -> /home/zhou/knapsack/www
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
rsync -a --delete out/ /home/zhou/knapsack/www/

echo "Deployed: https://knapsack.zhou-yufan.com"
echo "Question manager: https://knapsack.zhou-yufan.com/questions"
