'use strict';

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var when = require('when');

var client = rest.wrap(mime);

function register(req, res){
  try{

    var server = req.query.server.toLowerCase();
    if(server.indexOf('http') !== 0){
      server = 'http://' + server;
    }
    var path = server+':'+req.query.port+'/devices';

    client({
      path: path,
      method: 'POST',
      params: {type: req.query.type || 'nodered', name: req.query.name || 'nodered'}
    })
    .then(function(data){
      console.log('resp ok', data.entity);
      res.send(data.entity);
    }, function(err){
      console.log('error', err);
      res.send(500);
    });

  }catch(exp){
    console.log('err', exp);
    res.send(500);
  }

}

module.exports = register;
