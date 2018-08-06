var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
require('dotenv').config()



var assistant = new watson.AssistantV1({
    username: process.env.username,
    password: process.env.password,
    version: process.env.version
});


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

    var user = {
        socketId: socket.conn.id,
        socketData: socket.handshake.time
    };

    console.log('a user connected : ' + user.socketId);


    socket.on('message', function (msg) {
        // socket.emit('message', msg);

        console.log(typeof(msg) + 'asdfasdf');

        // 왓슨 연동 시켜주고요
        assistant.message({
            workspace_id: process.env.workspaceId,
            input: {
                'text': msg
            }
        }, function (err, res) {
            if (err)
                console.log('error:', err);
            else {
                console.log(res);
                socket.emit('message', res.output.text);
            }
        });
    });


    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});


// 왓슨 연동 테스트

app.get('/test', function (req, res) {
    assistant.message({
        workspace_id: process.env.workspaceId,
        input: {'text': '123'}
    }, function (err, response) {
        if (err)
            console.log('error:', err);
        else {
            console.log(JSON.stringify(response, null, 2));
            res.send(response);
        }
    });
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});