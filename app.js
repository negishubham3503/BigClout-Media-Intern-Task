require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const sgMail = require('@sendgrid/mail');

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/videoDB", {useNewUrlParser: true});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const videoSchema = new mongoose.Schema({
    url: {
        type: String,
        required: [true, "Please specify URL"]
    }
});

const Video = mongoose.model("Video", videoSchema);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    uploadedVideos: [videoSchema]
});

const User = mongoose.model("User", userSchema);

app.route("/")

.get(function(req, res){
    res.render("login");
})

.post(function(req, res){
    const user = req.body.username;
    User.findOne({username: user}, function(err, foundUser){
        if(err)
            res.send(err);
        else{
            if (foundUser){
                if(foundUser.password === req.body.password)
                    res.redirect("/user/" + foundUser._id);
                else
                    res.redirect('/?error=' + encodeURIComponent('Password_mismatch'));
            }
            else{
                res.redirect('/?error=' + encodeURIComponent('No_user_found'));
            }
        }
    });
})

.delete(function(req, res){
    User.deleteMany(function(err){
        if (err)
            res.send(err);
        else
            res.send("Successfully deleted");
    });
});

app.route("/signup")

.get(function(req, res){
    res.render("signup");
})

.post(function(req, res){
    let newUser = new User({
        username: req.body.username,
        password: req.body.password,
        uploadedVideos: []
    });
    newUser.save(function(err){
        if(err)
            res.send(err);
        else{
            res.redirect("/");
        }
    });
});

app.route("/reset")

.get(function(req, res){
    res.render("reset");
})

.post(function(req, res){
    const code = Math.floor(Math.random() * 10000);
    const codeText = 'Enter the following 4-digit code - ' + code;
    const msg = {
        to: res.username,
        from: "coe17b030@iiitk.ac.in",
        subject: 'Please reset your password',
        text: codeText,
        html: '<strong>Enter the following 4-digit code</strong><br>',
    };
    sgMail.send(msg);
    res.render("password", {email: res.username, resetCode: code});
});

app.route("/user/:userid")

.get(function(req, res){
    User.findOne({_id: req.params.userid}, function(err, foundUser){
        if(!err){
            if(foundUser){
                res.render("home", {name: foundUser.username.substring(0, foundUser.username.indexOf("@")), id: req.params.userid});
            }
            else{
                res.redirect("/?error=" + encodeURIComponent('No_user_found.Try_again)'));
            }
        }
    });
})

.put(function(req, res){
    User.update(
        {_id: req.params.userid}, 
        {username: req.body.name, password: req.body.password, uploadedVideos: req.body.videos}, 
        {overwrite: true}, function(err){
        if(!err){
            res.send("Successfully updated");
        }
        else
            res.send(err);
    });
})

.patch(function(req, res){
    User.update({_id: req.params.userid}, {$set : req.body}, function(err){
        if (!err)
            res.send("Successfully updated");
        else
            res.send(err);
    });
})

.delete(function(req, res){
    User.deleteOne({_id: req.params.userid}, function(err){
        if (err)
            res.send(err);
        else
            res.send("Successfully deleted");
    });
});

app.route("user/:userid/api/media")

.get(function(req, res){
    User.findOne({_id: req.params.userid}, function(err, foundUser){
        if(!err){
            if(foundUser){
                res.render("videos", {uploads: foundUser.uploadedVideos});
            }
            else{
                res.redirect("/?error=" + encodeURIComponent('No_user_found.Try_again)'));
            }
        }
    });
});

app.route("user/:userid/api/media/upload")

.get(function(req, res){
    User.findOne({_id: req.params.userid}, function(err, foundUser){
        if(!err){
            if(foundUser){
                res.render("upload", {user: req.params.userid});
            }
            else{
                res.redirect("/?error=" + encodeURIComponent('No_user_found.Try_again)'));
            }
        }
    });
})

.post(function(req, res){
    User.findOne({_id: req.params.userid}, function(err, foundUser){
        if(!err){
            if(foundUser){
                const uploadedVideo = new Video({
                    url: req.body.url
                });
                foundUser.uploadedVideos.push(uploadedVideo);
                foundUser.save(function(err){
                    if(!err)
                        res.redirect("/user/" + req.params.userid);
                });
            }
            else{
                res.redirect("/?error=" + encodeURIComponent('No_user_found.Try_again)'));
            }
        }
    });
});

app.route("/newPassword")

.post(function(req, res){
    if (req.body.code === req.body.initial){
        User.findOne({username: req.body.reset}, function(err, foundUser){
            if(!err){
                if (foundUser){
                    foundUser.password = req.body.password;
                    foundUser.save(function(err){
                        if(!err)
                            res.redirect("/");
                    });
                }
                else{
                    res.redirect("/reset?error=" + encodeURIComponent('No_user_found.Try_again)'));
                }
            }
        });
    }
});

app.listen(3000, function(){
    console.log("Server is running on port 3000");
});