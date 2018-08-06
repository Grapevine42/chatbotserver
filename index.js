var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');

var multer = require('multer');
var upload = multer({dest: 'uploads/'});

require('dotenv').config();


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
        assistant.message({
            workspace_id: process.env.workspace_id,
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
        workspace_id: process.env.workspace_id,
        input: {'text': '아메리카노'}
    },  function(err, response) {
        if (err)
            console.log('error:', err);
        else{
            console.log(JSON.stringify(response, null, 2));
            res.send(response);
        }
    });
});

// 파일 업로드

app.post('/upload', upload.single('file'), function(req, res) {

    var d = new Date();

    var info = {
        name : req.file.originalname,
        path : req.file.path,
        time : d
    }

    res.send(info);
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});