'use strict';

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var when = require('when');

var client = rest.wrap(mime).wrap(errorCode);

function claim(options){
  try{

    var server = options.server.toLowerCase();
    var port = options.port;
    var toClaim = options.toClaim;
    var uuid = options.uuid;
    var token = options.token;

    if(server.indexOf('http') !== 0){
      server = 'http://' + server;
    }
    var path = server + ':' + port + '/claimdevice/' + toClaim;

    var headers = {
      skynet_auth_uuid: uuid,
      skynet_auth_token: token,
    };

    console.log('claimdevice', path);

    return client({
      path: path,
      method: 'PUT',
      headers: headers
    })
    .then(function(data){
      return {uuid: toClaim};
    });

  }catch(exp){
    return when.reject(exp);
  }

}

module.exports = claim;
