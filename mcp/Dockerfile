# Remote MCP server over the Pantheon corpus. Build context = repo root
# (the server reads ../app/data.js). On Render: runtime "docker",
# dockerfilePath ./mcp/Dockerfile, dockerContext .
FROM node:20-slim
WORKDIR /app/mcp

# deps first for layer caching
COPY mcp/package.json mcp/package-lock.json ./
RUN npm ci --omit=dev

# server code + the committed corpus (single source of truth)
COPY mcp/ ./
COPY app/data.js /app/app/data.js

ENV NODE_ENV=production
# Render injects PORT; the server falls back to 3000 locally.
EXPOSE 3000
CMD ["node", "server.mjs"]
