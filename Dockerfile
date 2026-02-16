# Use Node.js 22 for maximum compatibility
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm (force and ignore scripts)
RUN npm install --force --no-optional --no-audit --no-fund

# Copy source code
COPY . .

# Debug: Check if tsconfig.json exists
RUN ls -la

# Debug: Check Node and npm versions
RUN node --version && npm --version

# Build the application with detailed output
RUN npm run build --verbose || echo "Build failed with exit code $?"

# Check if build succeeded
RUN ls -la dist/ || echo "dist directory not found"

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "preview"]
