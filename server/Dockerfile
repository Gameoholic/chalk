FROM node:22-alpine

WORKDIR /app

# Install deps (INCLUDING dev for build)
COPY package*.json .
RUN npm install

# Copy source
COPY . .

# Build TS → JS
RUN npx tsc

# Remove dev deps after build (keeps image small)
RUN npm prune --omit=dev

EXPOSE 5050

CMD ["node", "dist/server.js"]