# ==============================================================================
# ServiceSphere - Frontend Multi-Stage Dockerfile
# Stage 1: Build production React application with Node.js 22
# Stage 2: Serve optimized static bundle with Nginx Alpine
# ==============================================================================

# --- Stage 1: Build Environment ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy application source code and build for production
COPY . .
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine

# Remove default Nginx welcome assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy SPA routing Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
