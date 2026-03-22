# Use Node.js 22 with standard Linux (not Alpine) for Rollup compatibility
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install to avoid Rollup issues
RUN rm -rf node_modules package-lock.json

# Install dependencies
RUN npm install --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Install express for static serving
RUN npm install express

# Start Express server (server.js já veio no COPY . .)
CMD ["node", "server.js"]
