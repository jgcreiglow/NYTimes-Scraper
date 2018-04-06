// Dependencies
var express = require("express");
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");
var request = require("request");
var db = require("./models");
// Create an instance of the express app.
var app = express();

// Set the port of our application
// process.env.PORT lets the port be set by Heroku

var PORT = process.env.PORT || 8080;

// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({
    defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({
    extended: true
}));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

// Routes

app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with request
    axios.get("http://www.washingtonpost.com/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        // Now, we grab every h2 within an article tag, and do the following:
        $("div.pb-root").each(function (i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");

            // Create a new Article using the `result` object built from scraping
            db.Headline.create(result)
            .then(function (dbHeadline) {
                // View the added result in the console
                console.log(dbHeadline);
            })
            .catch(function (err) {
                // If an error occurred, send it to the client
                return res.json(err);
            });
        });

        res.send("Scrape Complete");
    });
 });
//  / Route for getting all Articles from the db
 app.get("/articles", function(req, res) {
   // Grab every document in the Articles collection
   db.Headline.find({})
     .then(function(dbHeadline) {
       // If we were able to successfully find Articles, send them back to the client
       res.json(dbHeadline);
     })
     .catch(function(err) {
       // If an error occurred, send it to the client
       res.json(err);
     });
 });
 
 // Route for grabbing a specific Article by id, populate it with it's note
 app.get("/articles/:id", function(req, res) {
   // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
   db.Headline.findOne({ _id: req.params.id })
     // ..and populate all of the notes associated with it
     .populate("note")
     .then(function(Headline) {
       // If we were able to successfully find an Article with the given id, send it back to the client
       res.json(Headline);
     })
     .catch(function(err) {
       // If an error occurred, send it to the client
       res.json(err);
     });
 });
 
 // Route for saving/updating an Article's associated Note
 app.post("/articles/:id", function(req, res) {
   // Create a new note and pass the req.body to the entry
   db.Note.create(req.body)
     .then(function(dbNote) {
       // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
       // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
       // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
       return db.Headline.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
     })
     .then(function(dbHeadline) {
       // If we were able to successfully update an Article, send it back to the client
       res.json(dbHeadline);
     })
     .catch(function(err) {
       // If an error occurred, send it to the client
       res.json(err);
     });
 });

app.get("/", function (req, res) {
    res.render("home");
});
app.get("/home", function (req, res) {
    res.render("home");
});

app.get("/results", function (req, res) {
    res.render("results");
});

app.get("/saved", function (req, res) {
    res.render("saved");
});


// Start our server so that it can begin listening to client requests.
app.listen(PORT, function () {
    // Log (server-side) when our server has started
    console.log("Server listening on: http://localhost:" + PORT);
});