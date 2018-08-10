require('dotenv').config();

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
var cors = require('cors');
var multer = require('multer');

var parser = require('body-parser');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})

var upload = multer({storage : storage});

var nano = require('nano')(process.env.DB_URL);

app.use(parser.json());
app.use(cors());

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

    // 메시지 보내기
    socket.on('message', function (msg) {
        console.log('메시지 정상 들어옴'+ ' : '+msg);
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
                console.log(res.output.text);
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
app.post('/userupload', upload.single('photo'), function(req, res) {
    var d = new Date().toLocaleString();
    var info = {
        name : req.file.originalname,
        path : req.file.path,
        time : d,
        location : req.body.location
    };

    var user = nano.use('userimage');
    // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?

    user.insert(info, function (err, body) {
        // value / key 값을 집어넣는다
        if (err) {
            console.log('에러');
        }
        else {
            res.json(1);
            console.log(info);
        }
    });
    console.log('파일저장');
});


// cloudant 에 대피소 정보 넣
app.post('/inputshel', function (req, res) {
    var shelter = nano.use('shelter');
    // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?

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


http.listen(8080, function () {
    console.log('listening on *:8080');
});