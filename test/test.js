var assert = require("assert");
var WorkerEmailInPostmark = require("../lib/email-in");

var fixtures = {
    db_names: {
        hash: {
            MailboxHash: "foo"
        },
        from: {
            From: "jane@example.com"
        },
        default_: {
            foo: "bar"
        }
    },
    config: {
        server: "example.com",
        admin: {
            user: "admin",
            pass: "pass"
        },
        default_db: "default_db"
    },
    email_json: require("./fixture_email.js")
};

describe("WorkerEmailInPostmark", function() {

    var worker;
    // beforeEach(function(done) {
        // TODO: start/stop module between tests.
       worker = new WorkerEmailInPostmark(fixtures.config);
    // });
    // afterEach(function(done) {
    //     worker.stop(done);
    // });

    describe("#_postMarkToHoodie()", function() {
        it("should convert attachments to couch-attachments", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.notEqual(null, result._attachments);
        });
        it("should delete the 'Attachments' member", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.equal(null, result.Attachments);
        });
        it("should convert the content-type correctly", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.equal("image/png", result._attachments["myimage.png"].content_type);            
        });
        it("should convert the Name correctly", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.notEqual(null, result._attachments["myimage.png"]);
        });
        it("should convert the other content-type correctly", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.equal("application/msword", result._attachments["mypaper.doc"].content_type);
        });
        it("should convert the other Name correctly", function() {
            var result = worker._postMarkToHoodie(fixtures.email_json);
            assert.notEqual(null, result._attachments["mypaper.doc"]);
        });
    });

    describe("#_parseDbName()", function() {
        it("should use MailboxHash, if available", function() {
            var db = worker._parseDbName(fixtures.db_names.hash);
            assert.equal("foo", db);
        });
        it("should use From, if available", function() {
            var db = worker._parseDbName(fixtures.db_names.from);
            assert.equal("jane@example.com", db);
        });
        it("should default to 'default_db'", function() {
            var db = worker._parseDbName(fixtures.db_names.default_);
            assert.equal("default_db", db);
        });
    });

});
