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
 - tests
 - more docs
*/
var http = require('http');
var url = require("url");
var request = require("request");

var port = process.env["PORT"] || 8888;

var config = {
    server: process.env.HOODIE_SERVER,
    admin: {
        user: process.env.HOODIE_ADMIN_USER,
        pass: process.env.HOODIE_ADMIN_PASS
    }
}

// Variable to hold chunked data from Postmark.
var mailRaw = '';

http.createServer(function (req, res) {
    // res.writeHead(200, {'Content-Type': 'text/plain'});
    // res.end('Hello Worker');

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


        // Insert new document.
        var db = mailJSON.MailboxHash.toLowerCase(); // hoodie+hash@inbound.postmarkapp.com
        var uri = url.parse(config.server);
        uri.path = "/" + db + "/";
        uri.auth = config.admin.user + ":" + config.admin.pass;
        request({
          uri: uri,
          method: "POST",
          json: mailJSON
        }, function(error, response) {
          if(error) {
                console.log("Set Doc status fail: " + error);
          }
              //console.log("Save doc response: %j", response);
        });

        // Reset our holder variable.
        mailRaw = '';

        // Send an empty response.
        res.end();
        console.log("req-done yay");
    });

}).listen(port, '0.0.0.0');

console.log('Server running at http://0.0.0.0:' + port);
