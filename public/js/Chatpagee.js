
$(document).ready(function ()
{
    var socket = io.connect();

    //Oda id'sini random verme
    var dizi='';
    var dizi2=['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','r','s','t','u','v','x','y','z'];
    for(var i = 0;i<8;i++)
    {
        dizi +=Math.floor(Math.random() * Math.floor(9));
        dizi +=(dizi2[Math.floor(Math.random() * Math.floor(22))]);
    }
    $('#oda').val(dizi);

    var $messageForm = $('#send-message');
    var $messageBox = $('#mesaj');
    var $chat = $('#mesajlar');
    var $users = $('#users');
    var $kisiSayisi = $('#bagliKullanici');
    var oda = document.getElementById("oda");
    var odaGir = document.getElementById("odaGir");
    var kisiAdi = $('#kisiAdi');

    var $grpMessageForm = $('#grp-send-message');
    var $grpMessageBox = $('#grp-mesaj');
    var $grpChat = $('#grp-mesajlar');
    var $grpPanel = $('#grp-panel');

    var grpOda = document.getElementById("grp-oda");
    var grpOdaGir = document.getElementById("grp-odaGir");

    var options = { hour: 'numeric', minute: 'numeric'};
    var today  = new Date();


    var sayi = 0;

    if (sayi == 0){
        socket.emit('yeni');
        sayi++;
    }

    $('#grp-odaGir').on('click', () => {
        socket.emit('grpRoom', {name: $('#grp-oda').val()});
    });

    socket.on('new grp', (data)=>{
        $('#sayi').html('Sohbet Odası '+'<span class="sag">'+'Odada '+data.count+' kişi var.'+'</span>');
        $('#oda, #odaGir').attr('disabled','disabled');
        $('#grp-oda, #grp-odaGir').attr('disabled','disabled');
        $('#grp-odaCik').show();
    });

    socket.on('new grpJoin', (data)=>{
        $('#grp-mesajlar').append(data.name+ ' kişisi katıldı.</br></br>');
        document.getElementById("grp-panel").scrollTop = document.getElementById("grp-panel").scrollHeight;
    });

    $('#odaGir').click(function () {

        birebirGorusme();
    });

    $('#odaConfGir').click(function () {

        konferansGorusme();
    });

    function birebirGorusme() {
        var kisi = $('#kisi').val();
        var odaID = $('#oda').val();
        var str = 'https://localhost:3000/goruntu!' + odaID;

        var link = "<a  href='" +str+ "' target='_blank'> Size birebir görüntülü görüşme isteği gönderildi. Görüşmek istiyorsanız  tıklayınız.</a>";
        var mesajj = "@" + kisi + " " + link ;
        $('#mesaj').val(mesajj);

        document.getElementById('ozelMsgGonder').click();
        $('#kisi').val("");
        odaID.hide();
    }

    function konferansGorusme() {
        var kisiler = $('#kisi').val();

        var odaID = $('#oda').val();
        var str = 'https://localhost:3000/conference!' + odaID;

        var b = [], k = [], n = [];
        var sayac = (kisiler.match(/,/g) || []).length;
        kisiler += ",";
        for (var i = 0; i <= sayac; i++) {
            n[i] = kisiler.indexOf(",");
            k[i] = kisiler.substring(0, n[i]);
            b[i] = kisiler.substring(0, n[i] + 1);
            kisiler = kisiler.replace(b[i], "");
            //$("#demo").append(k[i]);

            var link = "<a  href='" + str + "' target='_blank'> Size video konferans görüntülü görüşme isteği gönderildi. Görüşmek istiyorsanız  tıklayınız.</a>";
            var mesajj = "@" + k[i] + " " + link;
            $('#mesaj').val(mesajj);
            document.getElementById('ozelMsgGonder').click();
            $('#kisi').val("");
        }
        odaID.hide();
    }

    socket.on('new join', (data)=>{
        $('#bilgi').html('Bu odada <b>'+ data.count +'</b> kişi var.');
    });

    socket.on('log', (data)=>{
        $('#bilgi').append(data.mesaj);
        $('#oda, #odaGir').attr('disabled','disabled');
        $('#grp-oda, #grp-odaGir').attr('disabled','disabled');
        $('#odaCik').show();
    });

    socket.on('gonder', function (data) {
        socket.emit('gericevrim', data);
    });

    socket.on('message', function (data) {
        $chat.append('<div>' +
            '<li id="msgID" class="left clearfix">'+
            '<div class="chat-body clearfix">'+
            '<div class="header"><strong class="primary-font" style="color: black">'+ data.nick+" (Çevrimdışı Gelen)"+'</strong><span class="sag"><b class="primary-font">'+ data.time +'</b></span> '+
            '</div>' +data.msg+'</div></li></div>');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    socket.on('socket leave', (data)=>{
        oda.removeAttribute("disabled");
        odaGir.removeAttribute("disabled");
        grpOda.removeAttribute("disabled");
        grpOdaGir.removeAttribute("disabled");
        $('#odaCik').hide();
    });


    $('#odaCik').on('click', ()=>{
        socket.emit('leave', {name: $('#oda').val()});
    });

    socket.on('leave room', (data)=>{
        $('#bilgi').html('Bu odada <b>'+ data.count +'</b> kişi var.');
    });

    $('#grp-odaCik').on('click', ()=>{
        socket.emit('grp leave', {name: $('#grp-oda').val()});
    });

    socket.on('leave grpRoom', (data)=>{
        $('#sayi').html('Sohbet Odası'+'<span class="sag">'+'Odada '+data.count+' kişi var.'+'</span>');
        $('#grp-mesajlar').append(data.name+ ' kişisi çıktı.</br>');
        document.getElementById("grp-panel").scrollTop = document.getElementById("grp-panel").scrollHeight;
    });

    socket.on('destroy', ()=>{
        $grpChat.empty();
    });

    socket.on('socket grpLeave', (data)=>{
        grpOda.removeAttribute("disabled");
        grpOdaGir.removeAttribute("disabled");
        oda.removeAttribute("disabled");
        odaGir.removeAttribute("disabled");
        $('#grp-odaCik').hide();
    });

    $messageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('send message', {mesaj: $messageBox.val(), datee: today.toLocaleTimeString("tr-TR",options)}, function (data) {

            $chat.append('<span class="error">' + data + "</span></br>");
        });
        $messageBox.val('');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    $grpMessageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('grp message', {mesaj: $grpMessageBox.val(), datee:today.toLocaleTimeString("tr-TR",options), name: $('#grp-oda').val(), room: $('#grp-oda').val()}, function (data){
            //daha sonra kullanılabilir.
            $grpChat.append('<span class="error">' + data + "</span></br>");
        });
        $grpMessageBox.val('');
        document.getElementById("grp-panel").scrollTop = document.getElementById("grp-panel").scrollHeight;
    });

    socket.on('new message', function (data) {
        $chat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><strong class="sol primary-font">'+data.nick+'</strong>'+
            '</div>' +data.msg+'</div></li></div>');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    socket.on('new grp message', (data)=>{
        $grpChat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><strong class="sol primary-font">'+data.nick+'</strong>'+
            '</div>' +data.msg+'</div></li></div>');
        document.getElementById("grp-panel").scrollTop = document.getElementById("grp-panel").scrollHeight;
    });

    socket.on('grup mesaj', (data)=>{
        $grpChat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><span class="sol"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+data.nick+'</b></span> '+
            '</div><b>' +data.msg+'</div></li></div>');
        document.getElementById("grp-panel").scrollTop = document.getElementById("grp-panel").scrollHeight;
    });


    socket.on('whisper', function (data) {
        $chat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><strong class="primary-font" style="color: red">'+ data.nick+" (Özel)"+'</strong><span class="sol"></span> '+
            '</div>' +data.msg+'</div></li></div>');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    socket.on('whisper-back', function (data) {
        $chat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><span class="sol"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+data.nick+'</b></span> '+
            '</div><b>'+data.msg+'<b style="color: red">(Kime:'+data.name+')</b>'+'</div></li></div>');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    socket.on('genel sohbet', function (data) {
        $chat.append('<div>' +
            '<li  class="left clearfix">'+
            '<div class="chat-body clearfix" style="float: left">'+
            '<div class="header"><span class="sol"><b class="primary-font">'+today.toLocaleTimeString("tr-TR",options) +'</b></span></div></div>'+
            '<div class="chat-body clearfix" style="float: right">'+
            '<div class="header"><span class="sag"><b class="primary-font">'+data.nick+'</b></span> '+
            '</div><b>' +data.msg+'</div></li></div>');
        document.getElementById("panel").scrollTop = document.getElementById("panel").scrollHeight;
    });

    var html="";
    socket.on('usernames', function (data) {

        $kisiSayisi.html('<i class="glyphicon glyphicon-user"></i> Çevrimiçi (' + data.length +')');
        for(i=0; i<data.length; i++){
            html+='<b><font face="verdana" color="#337ab7">' + data[i]+ '</font></b></br>';
            $users.html(html);

        }
        html = "";
        document.getElementById("users").scrollTop = document.getElementById("users").scrollHeight;
    });

    socket.on('kisi', function (data) {
        kisiAdi.html('Genel Sohbet ('+ data+')'+'<a href="/logout" class="btn btn-danger btn-xs" style="float: right">Çıkış</a>');
    });

});