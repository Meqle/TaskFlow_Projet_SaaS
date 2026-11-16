# Étape 1 : Compilation de l'interface Vue 3 avec Vite
FROM node:22-alpine AS client-build
WORKDIR /build/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Étape 2 : Image de production Node.js + Express (sans sources ni outils de build front)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json ./
RUN npm install --omit=dev

COPY server/ ./
COPY --from=client-build /build/client/dist ./public

EXPOSE 3000
CMD ["node", "index.js"]

