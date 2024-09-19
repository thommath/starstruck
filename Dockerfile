# Building layer
FROM node:16-alpine as development

# Optional NPM automation (auth) token build argument
# ARG NPM_TOKEN

# Optionally authenticate NPM registry
# RUN npm set //registry.npmjs.org/:_authToken ${NPM_TOKEN}

WORKDIR /app

# Copy configuration files
COPY tsconfig*.json ./
COPY package*.json ./
COPY *.js ./
COPY *.ts ./
COPY *.html ./

# Install dependencies from package-lock.json, see https://docs.npmjs.com/cli/v7/commands/npm-ci
RUN npm ci

# Copy application sources (.ts, .tsx, js)
COPY src/ src/
COPY public/ public/

# Build application (produces build/ folder)
RUN npm run build

# Runtime (production) layer
FROM nginx
COPY --from=development /app/dist/ /usr/share/nginx/html
COPY --from=development /app/dist/ /usr/share/nginx/html/static
EXPOSE 80