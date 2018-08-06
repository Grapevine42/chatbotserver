var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

    var user = {
        socketId : socket.conn.id,
        socketData : socket.handshake.time
    };

    console.log('a user connected : ' +user.socketId);


    socket.on('message', function(msg){
        socket.emit('message', msg);
        // 왓슨 연동 시켜주고요
        console.log(msg);
    });


    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});