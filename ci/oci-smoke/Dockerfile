FROM input
RUN set -eu; \
    test "$(id -u)" = 10001; \
    test -s /usr/share/nginx/html/index.html; \
    /usr/sbin/nginx -g 'daemon off;' >/tmp/oci-smoke-nginx.log 2>&1 & nginx_pid=$!; \
    trap 'kill "$nginx_pid" 2>/dev/null || true' EXIT HUP INT TERM; \
    attempt=0; \
    until wget -q -O /dev/null http://127.0.0.1:8080/readyz; do \
      attempt=$((attempt + 1)); test "$attempt" -le 10; sleep 1; \
    done; \
    wget -q -O /dev/null http://127.0.0.1:8080/livez; \
    wget -q -O /tmp/oci-smoke-index.html http://127.0.0.1:8080/; \
    grep -q 'id="root"' /tmp/oci-smoke-index.html
