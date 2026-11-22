#!/bin/bash
# Sets up (or changes the password of) https://preview.elsecompany.com on the AWS test server:
# the website, private, with a password page that works on every phone and browser.
# The backend keeps running: Caddy reloads without stopping anything. Safe to run again.
#   bash /Users/Mac/Desktop/else/else-shop/tools/setup_preview_server.sh
set -euo pipefail
cd "$(dirname "$0")"
KEY=/Users/Mac/keys/else-test.pem
SERVER=ec2-user@18.224.131.44
HOST=preview.elsecompany.com

read -r -s -p "Password for $HOST: " PASSWORD; echo
[ ${#PASSWORD} -ge 8 ] || { echo "Use at least 8 characters."; exit 1; }
# The browser keeps the SHA-256 of the password in a cookie; the server only knows that hash
HASH=$(printf '%s' "$PASSWORD" | shasum -a 256 | cut -d' ' -f1)

echo "Uploading the password page..."
COPYFILE_DISABLE=1 tar czf - -C preview-login . | ssh -i "$KEY" "$SERVER" \
  'sudo rm -rf /var/www/else-preview-login && sudo mkdir -p /var/www/else-preview-login && sudo tar xzf - -C /var/www/else-preview-login && sudo chmod -R a+rX /var/www/else-preview-login && sudo mkdir -p /var/www/else-shop && sudo chmod 755 /var/www /var/www/else-shop'

echo "Setting up Caddy..."
ssh -i "$KEY" "$SERVER" "sudo bash -s" <<REMOTE
set -euo pipefail
FILE=/etc/caddy/Caddyfile
cp \$FILE \$FILE.bak-preview
python3 - <<'PY'
import re
f = "/etc/caddy/Caddyfile"
s = open(f).read()
s = re.sub(r"\n*# BEGIN else-shop preview.*?# END else-shop preview\n?", "\n", s, flags=re.S)
s = re.sub(r"\n*# The website \(else-shop\).*?\npreview\.elsecompany\.com \{.*?\n\}\n?", "\n", s, flags=re.S)
open(f, "w").write(s.rstrip("\n") + "\n")
PY
cat >> \$FILE <<'CADDY'

# BEGIN else-shop preview
# The website (else-shop), private: only browsers that entered the password (cookie) see it.
# /public and /share go to the backend. Set up by else-shop/tools/setup_preview_server.sh
$HOST {
    encode gzip
    header X-Robots-Tag "noindex, nofollow"
    @authed header_regexp Cookie "(^|;) *else_preview=$HASH *(;|$)"
    handle_path /_login/* {
        root * /var/www/else-preview-login
        file_server
    }
    handle @authed {
        @backend path /public/* /share/*
        handle @backend {
            reverse_proxy localhost:8080
        }
        handle {
            root * /var/www/else-shop
            file_server
        }
    }
    handle {
        header Cache-Control "no-store"
        root * /var/www/else-preview-login
        rewrite * /index.html
        file_server
    }
}
# END else-shop preview
CADDY
if ! caddy validate --config \$FILE --adapter caddyfile >/dev/null 2>&1; then
  caddy validate --config \$FILE --adapter caddyfile 2>&1 | tail -3
  cp \$FILE.bak-preview \$FILE
  echo "Caddy did not accept the change; nothing was changed."; exit 1
fi
systemctl reload caddy
echo "Done: $HOST asks for the password on its own page."
REMOTE
