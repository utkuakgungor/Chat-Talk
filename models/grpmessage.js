var mongoose = require('mongoose');

var grpmessageSchema = mongoose.Schema({
    user: String,
    message: String,
    time: String,
    group: String
});

module.exports = mongoose.model('GrpMessage', grpmessageSchema);