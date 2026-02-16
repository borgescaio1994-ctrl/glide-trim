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

# Create simple server file
RUN echo 'const express = require("express"); const app = express(); const path = require("path"); app.use(express.static(path.join(__dirname, "dist"))); app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "dist", "index.html")); }); const port = process.env.PORT || 3000; app.listen(port, "0.0.0.0", () => { console.log("=== SERVER STARTED ON PORT: " + port + " ==="); });' > server.js

# Start the Express server
CMD ["node", "server.js"]
