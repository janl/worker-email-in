var http = require('http');
var url = require("url");

var port = process.env["PORT"] || 8888;

var config = {
    server: process.env.HOODIE_SERVER,
    admin: {
        user: process.env.HOODIE_ADMIN_USER,
        pass: process.env.HOODIE_ADMIN_PASS
    }
}

// thx https://gist.github.com/1647808
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
        var db = mailJSON.MailboxHash; // hoodie+hash@inbound.postmarkapp.com
        var uri = url.parse(this._config.server);
        uri.path = "/" + db + "/";
        uri.auth = this._config.admin.user + ":" + this._config.admin.pass;
        request({
          uri: uri,
          method: "POST",
          json: doc
        }, function(error, response) {
          if(error) {
            console.warn("Set Doc status fail: " + error);
          }
          // console.warn("Save doc response: %j", response.body);
        });

        // Reset our holder variable.
        mailRaw = '';

        // Send an empty response.
        res.end();
    });

}).listen(port, '0.0.0.0');

console.log('Server running at http://0.0.0.0:' + port);
