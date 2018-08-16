require('dotenv').config();

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
var cors = require('cors');
var multer = require('multer');
var distance = require('gps-distance');
var fs = require('fs-extra');


var userList = [];

var parser = require('body-parser');

// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads')
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now())
//     }
// })
//
// var upload = multer({storage : storage});
// test

let upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            let type = req.params.type;
            let path = `./uploads/${type}`;
            fs.mkdirsSync(path);
            callback(null, path);
        },
        filename: (req, file, callback) => {
            //originalname is the uploaded file's name with extn
            callback(null, file.originalname);
        }
    })
});

// app.post('/api/:type', upload.single('file'), (req, res) => {
//     res.status(200).send();
// });


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

    socket.on("enter", function(msg){
        var userInfo = {
            socketId : socket.conn.id,
            name : msg.name,
            blood : msg.blood,
            age : msg.age,
            gender : msg.gender,
            lat : msg.lat,
            long : msg.long
        };

        userList.push(userInfo);
     //   console.log("userList", userList);
    })


    // 메시지 보내기
    socket.on('message', function (msg) {
       // console.log('메시지 정상 들어옴'+ ' : '+msg);
        assistant.message({
            workspace_id: process.env.workspace_id,
            input: {
                'text': msg
            }
        }, function (err, res) {
            if (err)
                console.log('error:', err);
            else {
                // var msgType = 0;
                //
                // if(msg == "hello"){
                //     msgType = "map";
                // }
                // else if (msg == "1"){
                //     msgType = "image"
                // }
                // else if (res.output.generic[1].options){
                //     // console.log(res.output);
                //     // msgType = "option";
                //     // var optionList = [];
                //     // for(var i=0;i<res.output.generic[1].options.length;i++){
                //     //     optionList.push(res.output.generic[1].options[i].value.input.text);
                //     // }
                //
                //
                //
                // }
                // else{
                //     msgType = 'txt';
                //     console.log('123');
                // }
                //
                //
                var responseObj = {
                    type : msgType,
                    data : res
                };
                //
                // console.log(responseObj.data.output);
                // console.log(responseObj.data.intents);
                //


                //console.log(res.output.text);

                //console.log(res.output.generic[1].options);
                //console.log(res.output.generic[1].options[0].value);


                var msgType = 0;

                var generic = res.output.generic;
                for(var i=0;i<generic.length;i++){
                    if(generic[i].response_type == 'text'){
                        console.log(generic[i].text);
                    } else if(generic[i].response_type == 'option'){

                        responseObj.type='option';

                        var optionList = [];

                        for(var n = 0;n<generic[i].options.length;n++) {
                            var option = {
                                label: generic[i].options[n].label,
                                value: generic[i].options[n].value.input.text
                            }
                            optionList.push(option);
                        }

                        responseObj = {
                            type : 'option',
                            data : res,
                            option : optionList
                        }

                        // console.log(optionList); 옵션 리스트로 저장
                    }
                }

                console.log(responseObj);
                socket.emit('message', responseObj);
            }
        });
    });

    socket.on('disconnect', function () {
        // for(var i=0;i<userList.length;i++){
        //     if(socket.conn.id == userList[i].socketId){
        //         userList[i].pop();
        //     }
        // }
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

app.get("/users", function (req, res) {
    res.json(userList);
})




// 파일 업로드 후 cloudant 저장
app.post('/upload/:type', upload.single('photo'), function(req, res) {
    var d = new Date().toLocaleString();
    var info = {
        name : req.file.originalname,
        path : req.file.path,
        time : d,
        locationName : req.body.locationName,
        lat : req.body.lat,
        long : req.body.long
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

// 파일 다운로드
app.get('/uploads/user/:name', function (req, res) {
    var filePath = '/uploads/user';
    // console.log(req.params.name);
    var fileName = req.params.name;
    //
    var file = __dirname + filePath + '/'+fileName;
    res.download(file);
});


app.get('/uploads/handleList/:name', function (req, res) {
    var filePath = '/uploads/handleList';
    // console.log(req.params.name);
    var fileName = req.params.name;
    //
    var file = __dirname + filePath + '/'+fileName;
    res.download(file);
});

app.get('/handleList', function (req, res) {
    var infoList = [];

    var info1 = {
        type : 'imageList',
        title : '1.png',
        path : '/uploads/handleList'
    };
    var info2 = {
        type : 'imageList',
        title : '2.png',
        path : '/uploads/handleList'
    };
    var info3 = {
        type : 'imageList',
        title : '3.png',
        path : '/uploads/handleList'
    };

    infoList.push(info1);
    infoList.push(info2);
    infoList.push(info3);

    res.send(infoList);
});

// cloudant 에 대피소 정보 넣
app.post('/inputShel', function (req, res) {
    var shelter = nano.use('shelter');
    // DB_NAME 같은 경우는 대피소가 저장된 db, 사진 저장용 db 따로 해야해서 굳이 환경변수 필요없을듯?

    shelter.insert(req.body, function (err, body) {
        // value / key 값을 집어넣는다
        if (err) {
            console.log('에러');
        }
    });
    res.send(req.body);
});

// 대피소 리스트로 뿌려서 테스트, 좌표 임의값
app.get('/listShel', function (req, res) {
    var shelter = nano.use('shelter');
    shelter.list({include_docs:true}, function (err, body) {
        var dataArr = [];
        body.rows.forEach(function (db) {
            var data = {
                name:db.doc.name,
                x:db.doc.x,
                y:db.doc.y,
                differ:distance(37.528292, 127.117533, db.doc.x, db.doc.y)
            };
            dataArr.push(data);
        });
        console.log(dataArr);

        var maxNum, num;

        for(var i=0;i<dataArr.length;i++){
            if(!maxNum){
                maxNum = dataArr[i].differ;
                num = i;
            }
            if(maxNum>dataArr[i].differ){
                maxNum = dataArr[i];
                num = i;
            }
        }
        res.send(dataArr[num]);
    });
});

// 좌표값 넘겨주면 가까운 대피소 표시
app.post('/closeShel', function (req, res) {
    var shelter = nano.use('shelter');
    shelter.list({include_docs:true}, function (err, body) {
        var dataArr = [];
        body.rows.forEach(function (db) {
            var data = {
                name:db.doc.name,
                x:db.doc.x,
                y:db.doc.y,
                differ:distance(req.body.x, req.body.y, db.doc.x, db.doc.y)
            };
            dataArr.push(data);
        });
        console.log(dataArr);

        var maxNum, num;

        for(var i=0;i<dataArr.length;i++){
            if(!maxNum){
                maxNum = dataArr[i].differ;
                num = i;
            }
            if(maxNum>dataArr[i].differ){
                maxNum = dataArr[i];
                num = i;
            }
        }
        res.send(dataArr[num]);
    });
   // console.log(req.body)
});

// 유저이미지 JSON 리스트로 뿌려줍니다
app.get('/listPhoto', function (req, res) {
    var userphoto = nano.use('userimage');
    var dataArr = [];
    userphoto.list({include_docs:true}, function (err, body) {
        body.rows.forEach((db)=>
            dataArr.push(db.doc));
        res.send(dataArr);
    });
});



// id detail
app.get('/detail/:id', function (req, res) {
    console.log(req.params);
    var userphoto = nano.use('userimage');

    userphoto.get(req.params.id, function (err, body) {
        res.send(body);
    });
});

// 특정거리내 대피소 여러개 표시
app.post('/closeShelList', function (req, res) {
    var shelter = nano.use('shelter');
    shelter.list({include_docs:true}, function (err, body) {
        var dataArr = [];
        body.rows.forEach(function (db) {
            var data = {
                name:db.doc.name,
                x:db.doc.x,
                y:db.doc.y,
                differ:distance(req.body.x, req.body.y, db.doc.x, db.doc.y)
            };
            if(data.differ<10){
                dataArr.push(data);
            }
        });
        console.log(dataArr);

        res.send(dataArr);
    });
    // console.log(req.body)
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