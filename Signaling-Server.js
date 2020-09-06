var listOfUsers = {};

var shiftedModerationControls = {};

// for scalable-broadcast demos
var ScalableBroadcast;

module.exports = exports = function(app, socketCallback) {
    socketCallback = socketCallback || function() {};

    if (!!app.listen) {
        var io = require('socket.io');

        try {
            // use latest socket.io
            io = io(app);
            io.on('connection', onConnection);
        } catch (e) {
            // otherwise fallback
            io = io.listen(app, {
                log: false,
                origins: '*:*'
            });

            io.set('transports', [
                'websocket',
                'xhr-polling',
                'jsonp-polling'
            ]);

            io.sockets.on('connection', onConnection);
        }
    } else {
        onConnection(app);
    }
    function appendUser(socket) {
        var alreadyExist = listOfUsers[socket.userid];
        var extra = {};

        if (alreadyExist && alreadyExist.extra) {
            extra = alreadyExist.extra;
        }

        var params = socket.handshake.query;

        if (params.extra) {
            try {
                if (typeof params.extra === 'string') {
                    params.extra = JSON.parse(params.extra);
                }
                extra = params.extra;
            } catch (e) {
                extra = params.extra;
            }
        }

        listOfUsers[socket.userid] = {
            socket: socket,
            connectedWith: {},
            isPublic: false, // means: isPublicModerator
            extra: extra || {},
            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
        };
    }

    var Message = require('./models/message');
    var User = require('./models/kullanici');
    var GrpMessage = require('./models/grpmessage');
    var users = {};
    var giris = require('./routes/routes');
    function onConnection(socket) {
        socket.emit('kisi', giris.posta);

        socket.on('yeni', function (data) {

            socket.nickname = giris.posta;
            users[socket.nickname] = socket;

            Message.find({
                whom: socket.nickname
            }, (err,veri)=>{
                if(err)
                    console.log(err);
                if(veri !== null){
                    socket.emit('gonder', veri);
                }
            });
            console.log("data : " + socket.nickname);
            updateNicknames();
        });

        function updateNicknames() {
            console.log("users : " + Object.keys(users));
            io.sockets.emit('usernames', Object.keys(users));
        }

        socket.on('gericevrim', function (data) {
            for(i=0; i<data.length; i++){
                var isim = data[i].whom;
                var msg = data[i].message.trim();
                var nick = data[i].user;
                var time = data[i].time;
                msg = msg.substring(3);
                var ind = msg.indexOf(' ');

                var msg = msg.substring(ind+1);

                if(isim in users){
                    users[isim].emit('message', {msg: msg, nick: nick, time: time});
                }
            }
        });

        socket.on('send message', function (data,callback) {
            var newMsg = new Message();
            var bosluk = "";
            var msg = data.mesaj.trim();
            if(msg.substring(0,1)=== '@'){
                msg = msg.substring(1);
                var ind = msg.indexOf(' ');
                if(ind !== -1){
                    var name = msg.substring(0,ind);
                    var msg = msg.substring(ind+1);
                    console.log(msg.substring(4,8));
                    if (name in users){
                        users[name].emit('whisper', {msg:msg, nick: socket.nickname, time: data.datee});
                        if(msg.substring(4,8)=="href"){
                            console.log("if");
                            newMsg.user = socket.nickname;
                            newMsg.message = data.mesaj;
                            newMsg.whom = name;
                            newMsg.time = data.datee;

                            newMsg.save(function() {
                                console.log(newMsg);
                            });
                        }else{
                            console.log("else");
                            users[socket.nickname].emit('whisper-back', {msg:msg, nick: socket.nickname, time: data.datee, name: name});

                            newMsg.user = socket.nickname;
                            newMsg.message = data.mesaj;
                            newMsg.whom = name;
                            newMsg.time = data.datee;

                            newMsg.save(function() {
                                console.log(newMsg);
                            });
                        }
                    }else{

                        User.find({
                            email: name
                        }, (err,veri)=>{
                            console.log(veri);
                            if(err)
                                console.log(err);
                            if(veri == bosluk){
                                callback('Error! geçerli kullanıcı girin.');
                            }else{
                                newMsg.user = socket.nickname;
                                newMsg.message = data.mesaj;
                                newMsg.whom = name;
                                newMsg.time = data.datee;

                                newMsg.save(function() {
                                    console.log(newMsg);
                                });
                                callback('Kullanıcı online olduğunda mesajınız iletilecektir.');
                            }
                        });
                    }
                }else {
                    callback('Error! lütfen kişisel mesaj girin.');
                }
            }else {
                socket.broadcast.emit('new message', {msg:msg, nick: socket.nickname});
                users[socket.nickname].emit('genel sohbet', {msg:msg, nick: socket.nickname});

                newMsg.user = socket.nickname;
                newMsg.message = data.mesaj;
                newMsg.time = data.datee;

                newMsg.save(function() {
                    console.log(newMsg);
                });
            }
        });

        socket.on('grp message', (data)=>{
            socket.to(data.name).emit('new grp message', {msg:data.mesaj, nick: socket.nickname});
            users[socket.nickname].emit('grup mesaj', {msg:data.mesaj, nick: socket.nickname});

            var newGrpMsg = new GrpMessage();
            newGrpMsg.user = socket.nickname;
            newGrpMsg.message = data.mesaj;
            newGrpMsg.time = data.datee;
            newGrpMsg.group = data.room;
            newGrpMsg.save(function () {
                console.log(newGrpMsg);
            });
        });

        socket.on('grpRoom', (data)=>{
            socket.join(data.name, ()=>{
                io.to(data.name).emit('new grp', {count: kullaniciSayisi(io,data)});
                io.to(data.name).emit('new grpJoin', {name: socket.nickname});
            });
        });

        socket.on('joinRoom', (data) => {
            socket.join(data.name, () => {
                io.to(data.name).emit('new join', {count: kullaniciSayisi(io,data)});
                socket.emit('log', {mesaj: 'Odaya girdiniz.'});
            });
        });

        socket.on('leave', (data)=>{
            socket.leave(data.name, ()=>{
                io.to(data.name).emit('leave room', {count: kullaniciSayisi(io,data)});
                socket.emit('socket leave', {mesaj: 'Odadan ayrıldınız.'});
            });
        });

        socket.on('grp leave', (data)=>{
            socket.leave(data.name, ()=>{
                io.to(data.name).emit('leave grpRoom', {count: kullaniciSayisi(io,data), name: socket.nickname});
                if(kullaniciSayisi(io,data)=== 0){
                    socket.emit('destroy');
                }
                socket.emit('socket grpLeave', {mesaj: 'Odadan ayrıldınız.'});
            });
        });

        var params = socket.handshake.query;
        var socketMessageEvent = params.msgEvent || 'RTCMultiConnection-Message';
        var sessionid = params.sessionid;
        var autoCloseEntireSession = params.autoCloseEntireSession;

        if (params.enableScalableBroadcast) {
            if (!ScalableBroadcast) {
                ScalableBroadcast = require('./Scalable-Broadcast.js');
            }
            ScalableBroadcast(socket, params.maxRelayLimitPerUser);
        }

        // temporarily disabled
        if (false && !!listOfUsers[params.userid]) {
            params.dontUpdateUserId = true;

            var useridAlreadyTaken = params.userid;
            params.userid = (Math.random() * 1000).toString().replace('.', '');
            socket.emit('userid-already-taken', useridAlreadyTaken, params.userid);
        }

        socket.userid = params.userid;
        appendUser(socket);

        if (autoCloseEntireSession == 'false' && Object.keys(listOfUsers).length == 1) {
            socket.shiftModerationControlBeforeLeaving = true;
        }

        socket.on('shift-moderator-control-on-disconnect', function() {
            socket.shiftModerationControlBeforeLeaving = true;
        });

        socket.on('extra-data-updated', function(extra) {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].extra = extra;

                for (var user in listOfUsers[socket.userid].connectedWith) {
                    listOfUsers[user].socket.emit('extra-data-updated', socket.userid, extra);
                }
            } catch (e) {
                pushLogs('extra-data-updated', e);
            }
        });

        socket.on('get-remote-user-extra-data', function(remoteUserId, callback) {
            callback = callback || function() {};
            if (!remoteUserId || !listOfUsers[remoteUserId]) {
                callback('remoteUserId (' + remoteUserId + ') does NOT exist.');
                return;
            }
            callback(listOfUsers[remoteUserId].extra);
        });

        socket.on('become-a-public-moderator', function() {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = true;
            } catch (e) {
                pushLogs('become-a-public-moderator', e);
            }
        });

        var dontDuplicateListeners = {};
        socket.on('set-custom-socket-event-listener', function(customEvent) {
            if (dontDuplicateListeners[customEvent]) return;
            dontDuplicateListeners[customEvent] = customEvent;

            socket.on(customEvent, function(message) {
                try {
                    socket.broadcast.emit(customEvent, message);
                } catch (e) {}
            });
        });

        socket.on('dont-make-me-moderator', function() {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = false;
            } catch (e) {
                pushLogs('dont-make-me-moderator', e);
            }
        });

        socket.on('get-public-moderators', function(userIdStartsWith, callback) {
            try {
                userIdStartsWith = userIdStartsWith || '';
                var allPublicModerators = [];
                for (var moderatorId in listOfUsers) {
                    if (listOfUsers[moderatorId].isPublic && moderatorId.indexOf(userIdStartsWith) === 0 && moderatorId !== socket.userid) {
                        var moderator = listOfUsers[moderatorId];
                        allPublicModerators.push({
                            userid: moderatorId,
                            extra: moderator.extra
                        });
                    }
                }

                callback(allPublicModerators);
            } catch (e) {
                pushLogs('get-public-moderators', e);
            }
        });

        socket.on('changed-uuid', function(newUserId, callback) {
            callback = callback || function() {};

            if (params.dontUpdateUserId) {
                delete params.dontUpdateUserId;
                return;
            }

            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].socket.userid == socket.userid) {
                    if (newUserId === socket.userid) return;

                    var oldUserId = socket.userid;
                    listOfUsers[newUserId] = listOfUsers[oldUserId];
                    listOfUsers[newUserId].socket.userid = socket.userid = newUserId;
                    delete listOfUsers[oldUserId];

                    callback();
                    return;
                }

                socket.userid = newUserId;
                appendUser(socket);

                callback();
            } catch (e) {
                pushLogs('changed-uuid', e);
            }
        });

        socket.on('set-password', function(password) {
            try {
                if (listOfUsers[socket.userid]) {
                    listOfUsers[socket.userid].password = password;
                }
            } catch (e) {
                pushLogs('set-password', e);
            }
        });

        socket.on('disconnect-with', function(remoteUserId, callback) {
            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].connectedWith[remoteUserId]) {
                    delete listOfUsers[socket.userid].connectedWith[remoteUserId];
                    socket.emit('user-disconnected', remoteUserId);
                }

                if (!listOfUsers[remoteUserId]) return callback();

                if (listOfUsers[remoteUserId].connectedWith[socket.userid]) {
                    delete listOfUsers[remoteUserId].connectedWith[socket.userid];
                    listOfUsers[remoteUserId].socket.emit('user-disconnected', socket.userid);
                }
                callback();
            } catch (e) {
                pushLogs('disconnect-with', e);
            }
        });

        socket.on('close-entire-session', function(callback) {
            try {
                var connectedWith = listOfUsers[socket.userid].connectedWith;
                Object.keys(connectedWith).forEach(function(key) {
                    if (connectedWith[key] && connectedWith[key].emit) {
                        try {
                            connectedWith[key].emit('closed-entire-session', socket.userid, listOfUsers[socket.userid].extra);
                        } catch (e) {}
                    }
                });

                delete shiftedModerationControls[socket.userid];
                callback();
            } catch (e) {
                pushLogs('close-entire-session', e);
            }
        });

        socket.on('check-presence', function(userid, callback) {
            if (!listOfUsers[userid]) {
                callback(false, userid, {});
            } else {
                callback(userid !== socket.userid, userid, listOfUsers[userid].extra);
            }
        });

        function onMessageCallback(message) {
            try {
                if (!listOfUsers[message.sender]) {
                    socket.emit('user-not-found', message.sender);
                    return;
                }

                if (!message.message.userLeft && !listOfUsers[message.sender].connectedWith[message.remoteUserId] && !!listOfUsers[message.remoteUserId]) {
                    listOfUsers[message.sender].connectedWith[message.remoteUserId] = listOfUsers[message.remoteUserId].socket;
                    listOfUsers[message.sender].socket.emit('user-connected', message.remoteUserId);

                    if (!listOfUsers[message.remoteUserId]) {
                        listOfUsers[message.remoteUserId] = {
                            socket: null,
                            connectedWith: {},
                            isPublic: false,
                            extra: {},
                            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                        };
                    }

                    listOfUsers[message.remoteUserId].connectedWith[message.sender] = socket;

                    if (listOfUsers[message.remoteUserId].socket) {
                        listOfUsers[message.remoteUserId].socket.emit('user-connected', message.sender);
                    }
                }

                if (listOfUsers[message.sender].connectedWith[message.remoteUserId] && listOfUsers[socket.userid]) {
                    message.extra = listOfUsers[socket.userid].extra;
                    listOfUsers[message.sender].connectedWith[message.remoteUserId].emit(socketMessageEvent, message);
                }
            } catch (e) {
                pushLogs('onMessageCallback', e);
            }
        }

        function joinARoom(message) {
            var roomInitiator = listOfUsers[message.remoteUserId];

            if (!roomInitiator) {
                return;
            }

            var usersInARoom = roomInitiator.connectedWith;
            var maxParticipantsAllowed = roomInitiator.maxParticipantsAllowed;

            if (Object.keys(usersInARoom).length >= maxParticipantsAllowed) {
                socket.emit('room-full', message.remoteUserId);

                if (roomInitiator.connectedWith[socket.userid]) {
                    delete roomInitiator.connectedWith[socket.userid];
                }
                return;
            }

            var inviteTheseUsers = [roomInitiator.socket];
            Object.keys(usersInARoom).forEach(function(key) {
                inviteTheseUsers.push(usersInARoom[key]);
            });

            var keepUnique = [];
            inviteTheseUsers.forEach(function(userSocket) {
                if (userSocket.userid == socket.userid) return;
                if (keepUnique.indexOf(userSocket.userid) != -1) {
                    return;
                }
                keepUnique.push(userSocket.userid);

                if (params.oneToMany && userSocket.userid !== roomInitiator.socket.userid) return;

                message.remoteUserId = userSocket.userid;
                userSocket.emit(socketMessageEvent, message);
            });
        }

        var numberOfPasswordTries = 0;
        socket.on(socketMessageEvent, function(message, callback) {
            if (message.remoteUserId && message.remoteUserId === socket.userid) {
                // remoteUserId MUST be unique
                return;
            }

            try {
                if (message.remoteUserId && message.remoteUserId != 'system' && message.message.newParticipationRequest) {
                    if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].password) {
                        if (numberOfPasswordTries > 3) {
                            socket.emit('password-max-tries-over', message.remoteUserId);
                            return;
                        }

                        if (!message.password) {
                            numberOfPasswordTries++;
                            socket.emit('join-with-password', message.remoteUserId);
                            return;
                        }

                        if (message.password != listOfUsers[message.remoteUserId].password) {
                            numberOfPasswordTries++;
                            socket.emit('invalid-password', message.remoteUserId, message.password);
                            return;
                        }
                    }

                    if (listOfUsers[message.remoteUserId]) {
                        joinARoom(message);
                        return;
                    }
                }

                if (message.message.shiftedModerationControl) {
                    if (!message.message.firedOnLeave) {
                        onMessageCallback(message);
                        return;
                    }
                    shiftedModerationControls[message.sender] = message;
                    return;
                }

                // for v3 backward compatibility; >v3.3.3 no more uses below block
                if (message.remoteUserId == 'system') {
                    if (message.message.detectPresence) {
                        if (message.message.userid === socket.userid) {
                            callback(false, socket.userid);
                            return;
                        }

                        callback(!!listOfUsers[message.message.userid], message.message.userid);
                        return;
                    }
                }

                if (!listOfUsers[message.sender]) {
                    listOfUsers[message.sender] = {
                        socket: socket,
                        connectedWith: {},
                        isPublic: false,
                        extra: {},
                        maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                    };
                }

                // if someone tries to join a person who is absent
                if (message.message.newParticipationRequest) {
                    var waitFor = 60 * 10; // 10 minutes
                    var invokedTimes = 0;
                    (function repeater() {
                        if (typeof socket == 'undefined' || !listOfUsers[socket.userid]) {
                            return;
                        }

                        invokedTimes++;
                        if (invokedTimes > waitFor) {
                            socket.emit('user-not-found', message.remoteUserId);
                            return;
                        }

                        if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].socket) {
                            joinARoom(message);
                            return;
                        }

                        setTimeout(repeater, 1000);
                    })();

                    return;
                }

                onMessageCallback(message);
            } catch (e) {
                pushLogs('on-socketMessageEvent', e);
            }
        });

        socket.on('disconnect', function() {

            if(!socket.nickname) return;
            delete users[socket.nickname];
            updateNicknames();
            console.log('çıkış');

            try {
                if (socket && socket.namespace && socket.namespace.sockets) {
                    delete socket.namespace.sockets[this.id];
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                var message = shiftedModerationControls[socket.userid];

                if (message) {
                    delete shiftedModerationControls[message.userid];
                    onMessageCallback(message);
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                // inform all connected users
                if (listOfUsers[socket.userid]) {
                    var firstUserSocket = null;

                    for (var s in listOfUsers[socket.userid].connectedWith) {
                        if (!firstUserSocket) {
                            firstUserSocket = listOfUsers[socket.userid].connectedWith[s];
                        }

                        listOfUsers[socket.userid].connectedWith[s].emit('user-disconnected', socket.userid);

                        if (listOfUsers[s] && listOfUsers[s].connectedWith[socket.userid]) {
                            delete listOfUsers[s].connectedWith[socket.userid];
                            listOfUsers[s].socket.emit('user-disconnected', socket.userid);
                        }
                    }

                    if (socket.shiftModerationControlBeforeLeaving && firstUserSocket) {
                        firstUserSocket.emit('become-next-modrator', sessionid);
                    }
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            delete listOfUsers[socket.userid];
        });

        if (socketCallback) {
            socketCallback(socket);
        }
    }
};

var enableLogs = false;

try {
    var _enableLogs = require('./config.json').enableLogs;

    if (_enableLogs) {
        enableLogs = true;
    }
} catch (e) {
    enableLogs = false;
}

var fs = require('fs');

function pushLogs() {
    if (!enableLogs) return;

    var logsFile = process.cwd() + '/logs.json';

    var utcDateString = (new Date).toUTCString().replace(/ |-|,|:|\./g, '');

    // uncache to fetch recent (up-to-dated)
    uncache(logsFile);

    var logs = {};

    try {
        logs = require(logsFile);
    } catch (e) {}

    if (arguments[1] && arguments[1].stack) {
        arguments[1] = arguments[1].stack;
    }

    try {
        logs[utcDateString] = JSON.stringify(arguments, null, '\t');
        fs.writeFileSync(logsFile, JSON.stringify(logs, null, '\t'));
    } catch (e) {
        logs[utcDateString] = arguments.toString();
    }
}

// removing JSON from cache
function uncache(jsonFile) {
    searchCache(jsonFile, function(mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(jsonFile) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
}

function searchCache(jsonFile, callback) {
    var mod = require.resolve(jsonFile);

    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function(child) {
                run(child);
            });

            callback(mod);
        })(mod);
    }
}

const kullaniciSayisi = (io,data) =>{
    const room = io.sockets.adapter.rooms[data.name];
    return room ? room.length : 0;
};