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
*/

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
