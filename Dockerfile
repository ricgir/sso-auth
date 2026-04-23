FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the server
CMD [ "node", "server.js" ]
