'use strict';

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var when = require('when');
var getPath = require('./getPath');

var client = rest.wrap(mime).wrap(errorCode);

function claim(req, res){
  try{
    var path = getPath(req, '/claimdevice/' + req.query.toClaim);

    var headers = {
      meshblu_auth_uuid: req.query.uuid,
      meshblu_auth_token: req.query.token,
    };

    console.log('claimdevice', path);

    client({
      path: path,
      method: 'PUT',
      headers: headers
    })
    .then(function(data){
      return res.send({uuid: req.query.toClaim});
    })
    .otherwise(function(err){
      console.log('error', err);
      res.send(500);
    });
  }catch(exp){
    console.log('err', exp);
    res.send(500);
  }
}

module.exports = claim;
