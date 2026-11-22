#!/bin/bash
# Uploads this website to https://preview.elsecompany.com (private, with password). Run it after each change.
#   bash /Users/Mac/Desktop/else/else-shop/tools/deploy_preview.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=/Users/Mac/keys/else-test.pem
SERVER=ec2-user@18.224.131.44
echo "Uploading..."
COPYFILE_DISABLE=1 tar czf - --exclude=.git --exclude=.DS_Store --exclude=tools --exclude=.gitignore . \
  | ssh -i "$KEY" "$SERVER" 'set -e
      sudo rm -rf /var/www/else-shop.new && sudo mkdir -p /var/www/else-shop.new
      sudo tar xzf - -C /var/www/else-shop.new
      sudo chmod -R a+rX /var/www/else-shop.new
      sudo rm -rf /var/www/else-shop.old
      [ -d /var/www/else-shop ] && sudo mv /var/www/else-shop /var/www/else-shop.old
      sudo mv /var/www/else-shop.new /var/www/else-shop'
echo "Done: https://preview.elsecompany.com"
