# AgentAuth API Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy app source
COPY . .

# Create logs directory for Winston logger
RUN mkdir -p logs

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the server
CMD ["node", "server.js"]
