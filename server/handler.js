'use strict';
const serverless = require('serverless-http');
const canvasApiApp = require('./canvasApiServer');

const handler = serverless(canvasApiApp(),{
  // request: function(request, event, context) {
  //   console.log(request);
  // },
  // response: function(response, event, context) {
  //   console.log(response);
  // },
  // Your Content-Type is matched against this and base64 encoding is automatically 
  // done for your payload. This also sets isBase64Encoded true for the Lambda response
  // to API Gateway by this library
  // this is very fucking important
  /// ARGG WTF is it image/png or */*?????
  binary: ['*/*']
});
module.exports.main = async (event, context) => {
  return await handler(event, context);
};