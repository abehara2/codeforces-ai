# Use the official Playwright image which has browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app

# Install WebKit system dependencies (for full browser support)
RUN apt-get update && apt-get install -y \
    libgstreamer-gl1.0-0 \
    gstreamer1.0-plugins-bad \
    libenchant-2-2 \
    libsecret-1-0 \
    libmanette-0.2-0 \
    libgles2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall as we'll install browsers separately)
RUN npm ci --ignore-scripts

# Install Playwright browsers with all dependencies
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]
