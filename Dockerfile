FROM node:9.8-alpine
LABEL maintainer="tsullivan@timatooth.com"
COPY . /opt/udraw
WORKDIR /opt/udraw
RUN npm install
RUN npm run build:production
CMD node server
