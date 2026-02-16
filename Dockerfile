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

# Debug: Check if build succeeded
RUN ls -la dist/ || echo "=== DIST NOT FOUND ==="

# Debug: Check package.json scripts
RUN cat package.json | grep -A 10 "scripts"

# Start application with Railway dynamic port
CMD ["sh", "-c", "echo '=== STARTING SERVER ON RAILWAY PORT ===' && npm run preview 2>&1"]
