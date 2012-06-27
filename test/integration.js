// integration test
var request = require("request");
var worker = require("../email-in");
var url = require("url");
var fs = require("fs");
var assert = require("assert");

// config
var config = {
	server: "http://localhost:5984",
	db: "testdb"
};

var email_worker;

// url util
var make_url = function(path)
{
	var uri = url.parse(config.server);
    uri.path = "/" + config.db + "/" + path;
    return uri;
};

// require started couchdb
var require_couchdb = function()
{
	request(config.server, function(error, response) {
		if(error) {
			console.log("need a couch at " + config.server);
			process.exit(1);
		}
		next_step();
	});
};

// delete/craete test db
var delete_create_test_db = function()
{
	request({
		uri: make_url(),
		method: "DELETE"
	}, function(error, response) {
		// ignore error, we just need a greed field
		request({
			uri: make_url(),
			method: "PUT"
		}, function(error, response) {
			if(error) {
				console.log(error);
				process.exit(2);
			}
			next_step();
		});
	});
};

var start_email_in = function()
{
	// start email-in.js
	email_worker = new worker(config, function() {
		next_step();
	});
};

// POST to email-in.js
var post_to_email_in = function() {
	request({
		uri: "http://localhost:" + (process.env["PORT"] || 8888),
		method: "POST",
		body: fs.readFileSync("test/fixture_email.json")
	}, function(error, response) {
		if(error) {
			console.log(error);
			process.exit(4);
		}
		next_step();
	});
};

// in depth validation
var validate_doc = function(doc)
{
	assert.equal("myUser@theirDomain.com", doc.From);
	assert.equal(4, doc._attachments["myimage.png"].length);
	assert.equal(11, doc._attachments["mypaper.doc"].length);
	return true;
}

// read doc from CouchDB & verify
var verify_doc = function()
{
	request({
		uri: make_url("_all_docs?include_docs=true"),
		method: "GET"
	}, function(error, response) {
		if(error) {
			console.log(error);
			process.exit(3);
		}
		// console.log(response.body);
		var all_docs = JSON.parse(response.body);
		if(all_docs.rows.length == 0) {
			// try again
			console.log(all_docs);
			setTimeout(verify_doc, 1000); // wait 1 second
		} else {
			var doc = all_docs.rows[0].doc;
			if(!validate_doc(doc)) {
				console.log("Invalid doc: %j", doc);
				process.exit(6);
			}
			next_step();
		}
	});
};

// stop email-in.js
var stop_email_in = function()
{
	email_worker.stop();
	done();
};

var done = function()
{
	console.log("Integration Test Succeeded");
}

var next_step = function()
{
	console.log(".");
	steps.shift().call();
};


var steps = [
	require_couchdb,
	delete_create_test_db,
	start_email_in,
	post_to_email_in,
	verify_doc,
	stop_email_in
];

next_step();
