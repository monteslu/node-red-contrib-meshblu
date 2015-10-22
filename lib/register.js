'use strict';

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var when = require('when');
var getPath = require('./getPath');

var client = rest.wrap(mime);

function register(req, res){
  try{
    client({
      path: getPath(req, '/devices'),
      method: 'POST',
      params: {type: req.query.type || 'nodered', name: req.query.name || 'nodered'}
    })
    .then(function(data){
      console.log('resp ok', data.entity);
      res.send(data.entity);
    }, function(err){
      console.error('error', err);
      res.send(500);
    });
  }catch(error){
    console.error('error', error);
    res.send(500);
  }
}

module.exports = register;
