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

# Build the application (skip postinstall to avoid infinite loop)
RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "preview"]
