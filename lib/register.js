'use strict';

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');

var client = rest.wrap(mime).wrap(errorCode);

function register(options){
  var server = options.server.toLowerCase();
  var port = options.port;
  var name = options.name;
  var type = options.type;

  if(server.indexOf('http') !== 0){
    server = 'http://' + server;
  }
  var path = server + ':' + port + '/devices';

  return client({
    path: path,
    method: 'POST',
    params: {type: type || 'nodered', name: name || 'nodered'}
  })
  .then(function(data){
    return data.entity;
  });

}

module.exports = register;
