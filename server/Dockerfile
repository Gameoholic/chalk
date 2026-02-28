FROM node:22-alpine

WORKDIR /app

COPY package*.json .
# Install deps (INCLUDING dev for compiling ts)
RUN npm install

# Copy source files
COPY . .

# Compile TS → JS
RUN npx tsc

# Remove dev deps (including typescript) after build
RUN npm prune --omit=dev

EXPOSE 5050

CMD ["node", "dist/server.js"]