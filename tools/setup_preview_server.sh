#!/bin/bash
# One time only: puts the website on https://preview.elsecompany.com, on the AWS test server, behind a password.
# The backend keeps running: Caddy reloads without stopping anything.
#   bash /Users/Mac/Desktop/else/else-shop/tools/setup_preview_server.sh
set -euo pipefail
KEY=/Users/Mac/keys/else-test.pem
SERVER=ec2-user@18.224.131.44
HOST=preview.elsecompany.com
LOGIN=else

read -r -s -p "Choose the password for $HOST (user: $LOGIN): " PASSWORD; echo
[ ${#PASSWORD} -ge 8 ] || { echo "Use at least 8 characters."; exit 1; }
HASH=$(printf '%s' "$PASSWORD" | ssh -i "$KEY" "$SERVER" 'caddy hash-password --plaintext "$(cat)"')

ssh -i "$KEY" "$SERVER" "sudo bash -s" <<REMOTE
set -euo pipefail
FILE=/etc/caddy/Caddyfile
if grep -q "^$HOST " \$FILE; then echo "$HOST is already set up."; exit 0; fi
mkdir -p /var/www/else-shop && chmod 755 /var/www /var/www/else-shop
cp \$FILE \$FILE.bak-preview
cat >> \$FILE <<'CADDY'

# The website (else-shop), private: only with the password. /public and /share go to the backend.
$HOST {
    encode gzip
    header X-Robots-Tag "noindex, nofollow"
    basic_auth {
        $LOGIN $HASH
    }
    @backend path /public/* /share/*
    handle @backend {
        reverse_proxy localhost:8080
    }
    handle {
        root * /var/www/else-shop
        file_server
    }
}
CADDY
if ! caddy validate --config \$FILE --adapter caddyfile >/dev/null 2>&1; then
  sed -i 's/^    basic_auth {/    basicauth {/' \$FILE     # older Caddy versions call it basicauth
fi
if ! caddy validate --config \$FILE --adapter caddyfile >/dev/null 2>&1; then
  cp \$FILE.bak-preview \$FILE
  echo "Caddy did not accept the new block; nothing was changed."; exit 1
fi
systemctl reload caddy
echo "Done: $HOST is set up. Now upload the website with deploy_preview.sh"
REMOTE
