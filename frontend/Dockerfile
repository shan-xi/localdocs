# Stage 1: Build the React application
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the source code
COPY . .

# Generate production static files in /app/dist
RUN npm run build


# Stage 2: Run Nginx
FROM nginx:alpine

# Remove the default Nginx site configuration
RUN rm /etc/nginx/conf.d/default.conf

# Install our custom Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the built React files into Nginx's document root
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80