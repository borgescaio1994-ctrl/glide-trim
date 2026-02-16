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

# Create simple server file with ES modules
RUN echo 'import express from "express"; import path from "path"; import { fileURLToPath } from "url"; const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename); const app = express(); const port = process.env.PORT || 3000; app.use(express.static(path.join(__dirname, "dist"))); app.get("/health", (req, res) => { res.status(200).send("OK"); }); app.get("/*", (req, res) => { res.sendFile(path.join(__dirname, "dist", "index.html")); }); app.listen(port, "0.0.0.0", () => { console.log("=== SERVER STARTED ON PORT: " + port + " ==="); });' > server.js

# Start Express server
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]
