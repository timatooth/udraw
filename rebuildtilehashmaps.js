var redis = require('redis');

var client = redis.createClient({return_buffers: true}); //la

client.get('total connections', function (err, data) {
    client.set('totalconnections', data, function () {
        client.del('total connections');
    });
});

client.get('total puts', function (err, data) {
    client.set('putcount', data, function () {
        client.del('total puts');
    });
});
client.get('total gets', function (err, data) {
    client.set('getcount', data, function () {
        client.del('total gets');
    });
});

client.keys("main:1:*", function (err, reply) {
    //console.log(reply); array of tiles
    reply.forEach(function (tilekey) {
        //console.log(tilekey); 
        client.get(tilekey, function (err, data) {
            client.hset("tile:" + tilekey, "data", data, function () {
                client.del(tilekey);
            });

        });
    });
});

