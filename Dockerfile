from node:7.4.0-alpine
COPY . /opt/udraw
WORKDIR /opt/udraw
#VOLUME /opt/udraw
RUN npm install --production
CMD node server