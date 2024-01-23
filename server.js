"use strict";
require("dotenv").config();
const passport = require("passport");
const session = require("express-session");
const express = require("express");
const bcrypt = require("bcrypt");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const { ObjectID } = require("mongodb");
const app = express();
const LocalStrategy = require("passport-local");



function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

app.set("view engine", "pug");
app.set("views", "./views/pug");
fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

passport.initialize();
passport.session();

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");

  passport.use(
    new LocalStrategy((username, password, done) => {
      myDataBase.findOne({ username: username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (password !== user.password) return done(null, false);
        return done(null, user);
      });
    })
  );

  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true,
    });
  });

  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/profile");
      }
    );

  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });

  app.route("/register").post((req, res, next) => {
    myDataBase.findOne(
      { username: req.body.username },
      (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect("/");
        } else {
          const hash = bcrypt.hashSync(req.body.password, 12);
          myDataBase.insertOne(
            {
              username: req.body.username,
              password: hash,
            },
            (err, doc) => {
              if (err) {
                res.redirect("/");
              } else {
                next(null, doc.ops[0]);
              }
            }
          );
        }
      },
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res, next) => {
        res.redirect("/profile");
      }
    );
  });

  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
