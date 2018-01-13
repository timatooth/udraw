FROM node:9.4-alpine
COPY . /opt/udraw
WORKDIR /opt/udraw
RUN npm install
RUN npm run build:production
CMD node server
