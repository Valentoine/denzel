const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
require('dotenv').config();

const imdb = require('./imdb.js');
const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL = "mongodb+srv://"+process.env.DB_USER+":"+process.env.DB_PASS+"@denzel-q6jaw.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "Denzel";

var app = Express();

var database, collection;

MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {

  if(error) {throw error;}

  database = client.db(DATABASE_NAME);
  collection = database.collection("Movies");

  //Populate database
  app.get('/movies/populate', async function(req, res) {
    const listMovies = await imdb(DENZEL_IMDB_ID);

    listMovies.forEach(function(obj){
      collection.insertOne(obj, null, function (error, results) {
        if (error) throw error;
      });
    });
    res.send('La databse est maintenant peuplee');
  });

  app.get('/movies', async function(req, res) {
    const resp = await collection.findOne({"metascore":{$gt:70}});
    res.send(resp);
  });


  app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
  });

  app.listen(9292);
});
