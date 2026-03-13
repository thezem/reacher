FROM node:22-alpine

# Install openssh-client for ssh_exec tool
RUN apk add --no-cache openssh-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with production flag
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (default 3000, can be overridden)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
CMD ["node", "index.js"]
