# syntax=docker/dockerfile:1.7
# CIのBuildKitが読む複数段ビルド定義。ソースと固定依存から実行用イメージを作る。
# 入口はci/build-oci.sh、成果物のdigest検査はtools/oci-input/layout.go。
# VCS_REF/VCS_SOURCEをOCIラベルへ結び、build用依存を最終runtimeへそのまま持ち込まない。
FROM node:24.19.0-alpine3.23@sha256:244cc2b53f46f9e876304391d17682b0ddae9ac33491f4857e25e35a36ba7995 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm run typecheck && npm test -- --run && npm run build

FROM nginxinc/nginx-unprivileged:1.29.5-alpine3.23@sha256:42a7d7f2ee23e9f5a1dcdf3647ba5c585bbd18f79e79cd817e70e8cd61c55779
ARG VCS_REF=unknown
ARG VCS_SOURCE=unknown
LABEL org.opencontainers.image.revision=$VCS_REF org.opencontainers.image.source=$VCS_SOURCE
USER 10001:10001
COPY --from=build --chown=10001:10001 /app/dist /usr/share/nginx/html
COPY --chown=10001:10001 nginx/default.conf.template /etc/nginx/conf.d/default.conf
EXPOSE 8080
ENTRYPOINT ["/usr/sbin/nginx"]
CMD ["-g", "daemon off;"]
