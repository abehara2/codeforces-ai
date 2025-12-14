# Use the official Playwright image which has browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall as we'll install browsers separately)
RUN npm ci --ignore-scripts

# Install Playwright browsers (base image has system deps)
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]
