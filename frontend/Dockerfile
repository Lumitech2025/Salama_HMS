# ==========================================
# Stage 1: Build the React Application
# ==========================================
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package management configurations first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

RUN ln -sf /app/src/services/api.js /app/src/services/API.js

# Build the production-ready bundle
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx
# ==========================================
FROM nginx:alpine AS production-stage

# Copy our custom Nginx routing configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from Stage 1 into Nginx default serving path
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]