const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const Cors = require("cors");
const ExpressGraphQL = require("express-graphql");
const makeExecutableSchema = require("graphql-tools").makeExecutableSchema;
require('dotenv').config();

const imdb = require('./imdb.js');
const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL = "mongodb+srv://"+process.env.DB_USER+":"+process.env.DB_PASS+"@denzel-q6jaw.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "Denzel";
var database, collection;

const typeDefs = `
  type Movie {
    id: String
    link: String
    metascore: Int
    synopsis: String
    title: String
    year: Int
    date : String
    review : String
  }

  type Query {
    movies: [Movie]
    movie: Movie
    movieid(id:String) : Movie
  }

  type Mutation {
    createDateReview(id: String, date: String, review: String): Movie
  }

  schema {
    query: Query
    mutation: Mutation
  }
`;

const resolvers = {
  Query: {
    movieid: async (root, {id}) => {
      return (await collection.findOne({"id" :id}));
    },
    movies : async () => {
      return (await collection.find({}).toArray());
    },
    movie : async () => {
      return (await collection.findOne({"metascore":{$gt:70}}));
    }
  },
  Mutation: {
    createDateReview: async (root, {id, date, review}) => {
      await collection.updateOne({"id" :id},{$set :{"review":review}});
      await collection.updateOne({"id" :id},{$set :{"date":date}});
      return (await collection.findOne({"id" :id}));
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

var app = Express();

MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {

  if(error) {throw error;}

  database = client.db(DATABASE_NAME);
  collection = database.collection("Movies");

  //API
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

  app.get('/movies/search', async function(req, res) {
    if(req.query.metascore)
      var meta = parseInt(req.query.metascore);
    if(req.query.limit)
      var lim = parseInt(req.query.limit);

    if(meta && lim)
      res.send(await collection.find({"metascore":{$gt:meta}}).limit(lim).sort({"metascore": -1 }).toArray());
    else if(!meta && lim)
      res.send(await collection.find({"metascore":{$gt:0}}).limit(lim).sort({"metascore": -1 }).toArray());
    else if(meta && !lim)
      res.send(await collection.find({"metascore":{$gt:meta}}).limit(5).sort({"metascore": -1 }).toArray());
    else
      res.send(await collection.find({"metascore":{$gt:0}}).limit(5).sort({"metascore": -1 }).toArray());
  });

  app.route('/movies/:id')
    .get(async function(req, res) {
      await collection.findOne({"id": req.params.id}, (error, result) => {
          if(error) {
              return res.status(500).send(error);
          }
          res.send(result);
      });
    })
    .post(async function(req, res) {
      if(req.query.review)
        var rev = req.query.review;
      if(req.query.date)
        var date = req.query.date;

      if(rev && date)
      {
        await collection.updateOne({"id" :req.params.id},{$set :{"review":rev}});
        await collection.updateOne({"id" :req.params.id},{$set :{"date":date}});
      }
      else if(rev && !date)
        await collection.updateOne({"id" :req.params.id},{$set :{"review":rev}});
      else if(!rev && date)
        await collection.updateOne({"id" :req.params.id},{$set :{"date":date}});

      await collection.findOne({"id": req.params.id}, (error, result) => {
          if(error) {
              return res.status(500).send(error);
          }
          res.send(result);
      });
    });


  //graphql
  app.use("/graphql",Cors(),BodyParser.json(),ExpressGraphQL({
    schema,
    graphiql: true
    })
  );


  app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
  });

  app.listen(9292);
});
