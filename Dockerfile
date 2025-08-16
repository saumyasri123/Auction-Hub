# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files and server code
COPY --from=builder /app/dist dist
COPY server/ server/
COPY shared/ shared/
COPY .env .env

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server/index.js"]