'use strict';

var _ = require('lodash');
var rest = require('rest');
var mime = require('rest/interceptor/mime');
var when = require('when');
var getPath = require('./getPath');

var client = rest.wrap(mime);

function getDevices(req, res){
  try{

    var localPath = getPath(req, '/localdevices');
    var unclaimedPath = getPath(req, '/unclaimeddevices');
    var myPath = getPath(req, '/mydevices');

    var headers = {
      meshblu_auth_uuid: req.query.uuid,
      meshblu_auth_token: req.query.token,
    };

    // console.log('getDevices', path);

    when.all([
      client({
        path: myPath,
        method: 'GET',
        headers: headers
      }),
      client({
        path: localPath,
        method: 'GET',
        headers: headers
      }),
      client({
        path: unclaimedPath,
        method: 'GET',
        headers: headers
      })
    ])
    .spread(function(mine, local, unclaimed){
      console.log('getDevices', mine.status, local.status, unclaimed.status);
      var allDevices = [];
      var allDeviceMap;
      if(mine.status.code === 200){
        _.forEach(mine.entity.devices, function(d){
          d.owner = 'MINE';
          allDevices.push(d);
        });
      }
      allDeviceMap = _.indexBy(allDevices, 'uuid');

      if(local.status.code === 200){
        _.forEach(local.entity.devices, function(d){
          d.owner = 'CLAIMED';
          if(!allDeviceMap[d.uuid]){
            allDeviceMap[d.uuid] = d;
          }
        });
      }

      if(unclaimed.status.code === 200){
        _.forEach(unclaimed.entity.devices, function(d){
         if(allDeviceMap[d.uuid]){
            allDeviceMap[d.uuid].owner = 'UNCLAIMED';
          }
        });
      }

      return res.send(_.values(allDeviceMap));
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

module.exports = getDevices;
