

module.exports = function(app,  passport) {
    app.get('/',function(req, res) {
        if(req.session.email===undefined){
            res.render('login.ejs', {message: req.flash('loginMessage')});
        }
        if(req.session.email!==undefined){
            const User   = require('../models/kullanici');
            User.findOne({ email: req.session.email},(err,data)=>{
                    module.exports.posta = data.email;
                    res.render('ChatPage.ejs', {
                        user : data // get the user out of session and pass to template
                    });
            });
        }
    });

    app.get('/signup', function(req, res) {

        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true// allow flash messages
    }));
    //Farklı porta yönlendirme yapabilmek için önce gelen her isteği karşılayacak bir isteğin yönlendirildiği bir kod yazılıyor.
    //Devamında gelen parametreye göre sayfa yönlendirmeleri yapılıyor.

    app.get('*', isLoggedIn);

    app.post('/',function (req,res,done) {
        const User   = require('../models/kullanici');
        User.findOne({ email: req.body.email},(err,data)=>{
            if(err)
                console.log(err);

            if(!data){
                req.flash('loginMessage', 'Kullanıcı bulunamadı !');
                res.redirect('/');
            }else if(!data.validPassword(req.body.password)){
                req.flash('loginMessage', 'Yanlış şifre !');
                res.redirect('/');
            }else{
                module.exports.posta = data.email;
                req.session.email = req.body.email;
                console.log("session : " + req.session.email);

                res.render('ChatPage.ejs', {

                    user : data // get the user out of session and pass to template
                });
            }

        });


    });




};


// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    // if they aren't redirect them to the home page

    var gelenIstek = (req.url).slice(1,8);

    if(gelenIstek === 'goruntu')
    {
        console.log("görüntü geldi");

        res.render('One-to-One.ejs');
    }
    else if(gelenIstek === "confere") {
        res.render('Video_Conference.ejs');
    }
    else if(gelenIstek==="logout") {
        req.session.destroy();
        req.logout();
        res.redirect('/');
    }
    else
        res.redirect('/');
}
function ignoreFavicon(req, res, next) {
    if (req.originalUrl === '/favicon.ico') {
        res.status(204).json({nope: true});
    } else {
        next();
    }
}