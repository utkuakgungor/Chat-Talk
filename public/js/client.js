$(document).ready(function () {
    new Vue({
        el: '#app',
        data: {
            deleteLater: "hello world",
            connectUsers: ["usera"],
            messages: [],
            message: {
                "type": "",
                "action": "",
                "user": "",
                "text": "",
                "timestamp": ""
            },
            areTyping: []
        },
        created: function () {

        },
        methods: {
            send: function () {

            },
            userIsTyping: function (username) {

            },
            usersAreTyping: function () {

            },
            stoppedTyping: function () {

            }
        }
    });
});
