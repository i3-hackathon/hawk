var request = require('request');
var FacebookStrategy = require('passport-facebook').Strategy;
var User = require('./models/user');

module.exports = function (passport) {
  /*
    user ID is serialized to the session. When subsequent requests are
    received, this ID is used to find the user, which will be restored
    to req.user.
  */
  passport.serializeUser(function(user, done) {
    console.log('serializeUser: ' + user._id);
    done(null, user._id);
  });

  /*
    intended to return the user profile based on the id that was serialized
    to the session.
  */
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user){
      if (!err) {
        done(null, user);
      } else {
        done(err, null);
      }
    });
  });

  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'displayName', 'photos']
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('lookup user');
      User.findOne({$or: [{fbId : profile.id }, {email: profile.emails[0].value}]}, function(err, oldUser) {
        if (oldUser) {
          console.log("old user detected");
          return done(null, oldUser);
        } else {
          if (err) return done(err);
          console.log("new user found");
          var newUser = new User({
            fbId: profile.id,
            accessToken: accessToken,
            email: profile.emails[0].value,
            name: profile.displayName,
            photo: 'http://graph.facebook.com/' + profile.id + '/picture?width=800',
            username: profile.emails[0].value.split('@')[0],
          }).save(function(err, newUser) {
            if (err) return done(err);
            return done(null, newUser);
          });
        }
      });
    }
  ));
};