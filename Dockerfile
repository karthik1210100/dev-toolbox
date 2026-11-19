# DevToolbox — a self-hostable, offline-first developer toolbox.
#
# It is just static files (no build step), so this image simply serves them
# with nginx. Run your own private instance in seconds:
#
#   docker build -t dev-toolbox .
#   docker run -p 8080:80 dev-toolbox      ->  http://localhost:8080
#
FROM nginx:1.27-alpine

# Serve only the app shell — nothing else leaves the image.
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY index.html styles.css app.js tools.js sw.js manifest.webmanifest ./

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost/ || exit 1
