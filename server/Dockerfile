FROM node:22-alpine

WORKDIR /app

COPY package*.json .
# Install deps (INCLUDING dev for compiling ts)
# Clean install (doesn't modify package-lock, downloads exact same packages as on repository)
RUN npm ci

# Copy source files
COPY . .

# Compile TS → JS
RUN npx tsc

# Remove dev deps (including typescript) after build
RUN npm prune --omit=dev

EXPOSE 5050

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]