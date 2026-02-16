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

# Expose port
EXPOSE 4173

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4173/ || exit 1

# Start the application on port 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
