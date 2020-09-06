
$(document).ready(function () {
    var socket = io.connect();
    var $nickBox= $('#nickname');
    var $nickForm = $('#setNick');


    $nickForm.submit(function (e) {
        socket.emit('yeni', $nickBox.val());
    })

});