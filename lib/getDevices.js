'use strict';

var _ = require('lodash');
var rest = require('rest');
var mime = require('rest/interceptor/mime');
var when = require('when');

var client = rest.wrap(mime);

function getDevices(options){
  try{

    var server = options.server.toLowerCase();
    var port = options.port;
    var uuid = options.uuid;
    var token = options.token;

    if(server.indexOf('http') !== 0){
      server = 'http://' + server;
    }
    var path = server + ':' + port + '/';
    var localPath = path + 'localdevices';
    var unclaimedPath = path + 'unclaimeddevices';
    var myPath = path + 'mydevices';

    var headers = {
      skynet_auth_uuid: uuid,
      skynet_auth_token: token,
    };

    console.log('getDevices', path);

    return when.all([
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
      return _.values(allDeviceMap);
    });

  }catch(exp){
    return when.reject(exp);
  }

}

module.exports = getDevices;
