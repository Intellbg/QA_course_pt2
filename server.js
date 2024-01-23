"use strict";
require("dotenv").config();
const session = require("express-session");
const express = require("express");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const app = express();
const myDB = require("./connection");
const routes = require('./routes.js');
const auth = require('./auth.js');

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
  })
);

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

auth()
auth()


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
