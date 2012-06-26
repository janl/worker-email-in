var assert = require("assert");
var WorkerEmailInPostmark = require("../email-in");

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
    // beforeEach(function() {
        // TODO: add worker.stop() in afterEach()
       worker = new WorkerEmailInPostmark(fixtures.config);
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
