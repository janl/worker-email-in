/*

This email-in module is a post-receive-hook for the postmarkapp.com
email service. It is based on https://gist.github.com/1647808 by
Mark Headd. Thanks Mark!

The setup is easy, define these three environment variables:

    HOODIE_SERVER
    HOODIE_ADMIN_USER
    HOODIE_ADMIN_PASS

For example:

    HOODIE_SERVER=http://my.irisouch.com
    HOODIE_ADMIN_USER=username
    HOODIE_ADMIN_PASS=password

If you are using Heroku to run this worker, run:

    heroku config:add \
      HOODIE_SERVER=http://my.irisouch.com \
      HOODIE_ADMIN_USER=username \
      HOODIE_ADMIN_PASS=password

This module relies on the `request` module, but it is included, yay.

Author: jan@apache.org

TODO:
 - code formatting
 - make doc-transformation a separate function
  - make doc hoodie-capable
 - print useful output when run from the commandline
 - add user-email-hashing config
 - more docs
*/

var http = require('http');
var url = require("url");
var request = require("request");

module.exports = WorkerEmailInPostmark;

function WorkerEmailInPostmark(config) {
    this._config = config;

    // Variable to hold chunked data from Postmark.
    var mailRaw = '';

    http.createServer(function (req, res) {

        req.on('data', function(chunk) {
            mailRaw += chunk;
        });

        req.on('end', function() {

            // Get the JSON payload from Postmark.
            if(!mailRaw) { 
                console.log("no mailRaw, skip");
                res.end();
                return;
            }

            var mailJSON = this._postMarkToHoodie(mailRaw);

            // hoodie+hash@inbound.postmarkapp.com
            var db = this._parseDbName(mailJSON);

            this._doSaveDoc(db, mailJSON);

            // Reset our holder variable.
            mailRaw = '';

            // Send an empty response.
            res.end();
            console.log("req-done yay");
        });

    }).listen(port, '0.0.0.0');

    //console.log('Server running at http://0.0.0.0:' + port);

}

WorkerEmailInPostmark.prototype._parseDbName = function(doc)
{
    // if "mail+hash@..."
    //   db = hash
    if(doc.MailboxHash) {
        return doc.MailboxHash;
    }

    // if From == known user
    //   db = user db
    if(doc.From) {
        // mangle via config wubble
        return doc.From;
    }

    // else
    //   db = catchall db for losers
    return this._config.default_db;
}

WorkerEmailInPostmark.prototype._doSaveDoc = function(db, doc)
{
    // Insert new document.
    var uri = url.parse(this._config.server);
    uri.path = "/" + db + "/";
    uri.auth = this._config.admin.user + ":" + this._config.admin.pass;
    request({
        uri: uri,
        method: "POST",
        json: doc
    }, function(error, response) {
        if(error) {
            console.log("Set Doc status fail: " + error);
        }
        //  console.log("Save doc response: %j", response);
    });

}

WorkerEmailInPostmark.prototype._postMarkToHoodie = function(mailRaw)
{
    var mailJSON = JSON.parse(mailRaw);

    // Transform attachments (fairly cheesy, but seems to work).
    if(mailJSON.Attachments.length) {
        var couchAttachments = '{';
        for(var i=0; i<mailJSON.Attachments.length; i++) {
            couchAttachments += '"' + mailJSON.Attachments[i].Name + '": {';
            couchAttachments += '"content_type":"' + mailJSON.Attachments[i].ContentType + '",';
            couchAttachments += '"data":"' + mailJSON.Attachments[i].Content + '"';
            couchAttachments += '},';
        }
        couchAttachments = couchAttachments.substring(0, (couchAttachments.length)-1);
        couchAttachments += '}';
        var _attachments = JSON.parse(couchAttachments);

        // Replace old attachments property with new Couchified attachments.
        mailJSON._attachments = _attachments;
        delete mailJSON.Attachments;
    }
    return mailJSON;
}

// setup
var port = process.env["PORT"] || 8888;
var config = {
    server: process.env.HOODIE_SERVER,
    admin: {
        user: process.env.HOODIE_ADMIN_USER,
        pass: process.env.HOODIE_ADMIN_PASS
    },
    default_db: process.env.HOODIE_MAIL_IN_DEFAULT_DB || "hoodie-lone-mail"
}

// let's go
var worker = new WorkerEmailInPostmark(config);
