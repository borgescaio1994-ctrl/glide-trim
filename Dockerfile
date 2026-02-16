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
EXPOSE 3000

# Start the application with explicit port
CMD ["sh", "-c", "npm run preview -- --port 3000 --host 0.0.0.0"]
