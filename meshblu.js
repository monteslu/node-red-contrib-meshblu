var skynet = require('skynet');
var _ = require('lodash');

var rest = require('rest');
var mime = require('rest/interceptor/mime');
var client = rest.wrap(mime);
var RPC_TIMEOUT = 10000;

function isBroadcast(data){
    var broadcast = false;
    _.forEach(data.devices, function(device){
        if(device === '*' || device === 'all'){
            broadcast = true;
        }
    });
    return broadcast;
}

module.exports = function(RED) {

    function meshbluserverNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.port = n.port;
        this.uuid = n.uuid;
        this.token = n.token;

        var options = {
            server: this.server,
            port: this.port,
            uuid: this.uuid,
            token: this.token
        };
        this.conn = skynet.createConnection(options);

        var self = this;
        self.directs = [];
        self.subs = [];

        self.conn.on('ready', function(data){
            self.conn.connected = true;

            _.forEach(RED.nodes.getFlows(), function(n){
                if(n.server === self.id){
                    var mnode = RED.nodes.getNode(n.id);
                    if(n.type === 'meshblu in'){
                        if(mnode.directToMe){
                            self.directs.push(mnode);
                        }else{
                            self.subs.push(mnode);
                            self.conn.subscribe({ uuid: mnode.uuid }, function(err){
                                console.log('subscribed to', mnode.uuid, err);
                            });
                        }
                    }

                    if(n.type === 'meshblu in' || n.type === 'meshblu out'){
                        mnode.status({fill:"green",shape:"dot",text:"connected"});
                    }
                }
            });

        });

        self.conn.on('message', function(data, fn){
            if(data.devices){
                if(!Array.isArray(data.devices)){
                    data.devices = [data.devices];
                }
                if(isBroadcast(data)){
                    _.forEach(self.subs, function(sub){
                        if(sub.uuid === data.fromUuid){
                            sub.send(data);
                        }
                    });
                }else{
                    _.forEach(self.directs, function(direct){
                        direct.send(data);
                    });
                }

            }
        });

        self.conn.on('error', function(err){
           console.log('error in meshblu connection', err);
        });

        self.on('close', function() {
            if (self.conn.connected) {
                console.log('close meshblu connection');
                self.conn.close();
            }
        });

        self.conn.alternateMethod = function(name, msg, fn){
            try{
                self.conn[name](msg, fn);
            }catch(exp){
                console.log('error calling alternateMethod', name, msg, exp);
            }
        }
    }
    RED.nodes.registerType("meshblu-server", meshbluserverNode);

    function meshbluInNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        this.directToMe = n.directToMe;
        this.uuid = n.uuid;
    }
    RED.nodes.registerType("meshblu in",meshbluInNode);

    function meshbluOutNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        this.broadcast = n.broadcast;
        this.uuid = n.uuid;
        this.forwards = n.forwards;
        var self = this;

        if (this.serverConfig) {
            var node = this;
            this.on("input",function(msg) {
                if(!msg.devices){
                    if(self.broadcast){
                        msg.devices = ['*'];
                    }else{
                        if(self.uuid){
                            msg.devices = [self.uuid];
                        }
                    }
                }
                if(msg.devices){
                    try{
                        var conn = self.serverConfig.conn;
                        if(self.forwards && !msg.reply){
                          var responded = false;
                          function handleResponse(resp){
                            if(!responded){
                                responded = true;
                                msg.payload = resp;
                                node.send(msg);
                            }
                          }
                          if(msg.alternateMethod){
                            conn.alternateMethod(msg.alternateMethod, msg, handleResponse);
                          }else{
                            conn.message(msg, handleResponse);
                          }
                          setTimeout(function(){
                            if(!responded){
                              responded = true;
                              msg.payload = {error: "request timeout"};
                              self.send(msg);
                            }
                          },msg.timeout || RPC_TIMEOUT);
                        }else{
                          if(msg.reply){
                            if(msg.ack && msg.fromUuid){
                              msg.devices = msg.fromUuid;
                              delete msg.fromUuid;
                              msg.payload = msg.reply;
                              delete msg.reply;
                              conn.alternateMethod('_messageAck', msg);
                            }else{
                              console.log('cant reply without an ack and fromUuid', msg);
                            }
                          }else{
                            conn.message(msg);
                          }

                        }
                    }catch(err){
                        console.log('errr sending', err);
                    }
                }

            });
        } else {
            this.error("missing server configuration");
        }
    }

    RED.httpAdmin.get("/meshblu/register", function(req,res) {
        try{

            var server = req.query.server.toLowerCase();
            if(server.indexOf('http') !== 0){
                server = 'http://' + server;
            }
            var path = server+':'+req.query.port+'/devices';

            client({
                path: path,
                method: 'POST',
                params: {type: 'nodered', name: 'nodered'}
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

    });

    RED.httpAdmin.get("/meshblu/local", function(req,res) {
        try{

            var server = req.query.server.toLowerCase();
            if(server.indexOf('http') !== 0){
                server = 'http://' + server;
            }
            var path = server+':'+req.query.port+'/localdevices';

            client({
                path: path,
                method: 'GET',
                headers: {
                    skynet_auth_uuid: req.query.uuid,
                    skynet_auth_token: req.query.token,
                }
            })
            .then(function(data){
                //console.log('resp ok', data.entity);
                res.send(data.entity);
            }, function(err){
                console.log('error', err);
                res.send(500);
            });

        }catch(exp){
            console.log('err', exp);
            res.send(500);
        }

    });


    RED.nodes.registerType("meshblu out",meshbluOutNode);
}
