# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Step 2: Run with Node (Backend Proxy)
FROM node:20-alpine

WORKDIR /app

# Copy package files for server dependencies
COPY package*.json ./
# Install ONLY production dependencies (this includes express/cors which are now in dependencies)
RUN npm install --omit=dev --legacy-peer-deps

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code
COPY --from=builder /app/server ./server

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["npx", "tsx", "server/index.ts"]
