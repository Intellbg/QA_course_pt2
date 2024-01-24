"use strict";
require("dotenv").config();
const session = require("express-session");
const express = require("express");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const myDB = require("./connection");
const routes = require("./routes.js");
const auth = require("./auth.js");
const passport = require("passport");
const passportSocketIo = require("passport.socketio");
const cookieParser = require("cookie-parser");

const MongoStore = require("connect-mongo")(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

function onAuthorizeSuccess(data, accept) {
  console.log("successful connection to socket.io");

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log("failed connection to socket.io:", message);
  accept(null, false);
}

app.set("view engine", "pug");
app.set("views", "./views/pug");
fccTesting(app);
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    key: "express.sid",
    store: store,
  })
);
app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: "express.sid",
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  })
);

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");
  auth(app, myDataBase);
  routes(app, myDataBase);

  let currentUsers = 0;
  io.on("connection", (socket) => {
    ++currentUsers;
    console.log("A user has connected");
    console.log("user " + socket.request.user.username + " connected");
    io.emit("user", {
      username: socket.request.user.username,
      currentUsers,
      connected: true,
    });
    socket.on("disconnect", () => {
      --currentUsers;
      io.emit("user count", currentUsers);
    });
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
