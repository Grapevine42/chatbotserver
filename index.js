require('dotenv').config();

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');

var parser = require('body-parser');

var multer = require('multer');
var upload = multer({dest: 'uploads/'});

var nano = require('nano')(process.env.DB_URL);

app.use(parser.json());


var assistant = new watson.AssistantV1({
    username: process.env.username,
    password: process.env.password,
    version: process.env.version
});


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


// 소켓io
io.on('connection', function (socket) {

    var user = {
        socketId: socket.conn.id,
        socketData: socket.handshake.time
    };

    console.log('a user connected : ' + user.socketId);

    // 기본 메시지 물어보기, 챗봇이 시작 시 물어봅니다.
    assistant.message({
        workspace_id: process.env.workspace_id,
        input: {
            // 기본 묻는 문장에 대해 적어야 합니다.
            'text': '무슨일이야'
        }
    }, function (err, res) {
        if (err)
            console.log('error:', err);
        else {
            socket.emit('message', res.output.text);
        }
    });


    // 이후 메시지를 보내면 대답 ㅇㅇ
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

// 파일 업로드 후 cloudant 저장
app.post('/upload', upload.single('file'), function(req, res) {

    var d = new Date();

    var info = {
        name : req.file.originalname,
        path : req.file.path,
        time : d,
        locationX : req.body.locationX,
        locationY : req.body.locationY
    };

    var user = nano.use('userimage');
    // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?

    user.insert(info, function (err, body) {
        // value / key 값을 집어넣는다
        if (err) {
            console.log('에러');
        }
    });
    res.send('user image insert complete');
});


// cloudant 값 넣기 , 대피소
app.post('/db/insert/shelter', function (req, res) {
    var shelter = nano.use('shelter');
    // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?

    var info = {

    }

    shelter.insert(req.body, function (err, body) {
        // value / key 값을 집어넣는다
        if (err) {
            console.log('에러');
        }
    });
    res.send('shelter insert complete');
});



//  이미지 디비 넣기 테스트, 이미지는 로컬에 저장
// // cloudant 값 넣기 , 사용자가 촬영한 사진?
// app.post('/db/insert/user', function (req, res) {
//     var user = nano.use('userimage');
//     // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?
//
//     user.insert(req.body, function (err, body) {
//         // value / key 값을 집어넣는다
//         if (err) {
//             console.log('에러');
//         }
//     });
//     res.send('user image insert complete');
// });





http.listen(3000, function () {
    console.log('listening on *:3000');
});