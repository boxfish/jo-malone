var selenium = require('selenium-standalone');
var defaultConfig = require('selenium-standalone/lib/default-config');
var merge = require('lodash').merge;
var webdriverio = require('webdriverio');
var notifier = require('node-notifier');
// only install chrome driver
var driversOpts = {
    drivers: {
        chrome: defaultConfig.drivers['chrome']
    }
};

var MATCH_TEXT = "English Oak & Redcurrant Cologne 100ml";

var opts = merge({}, defaultConfig, driversOpts);

function play(client) {
    return new Promise((resolve, reject) => {
        var drops = 0;
        var drop = function() {
            if (drops < 3) {
                drops++;
                console.log('drop #' + drops);
                client
                    .click('#play-button')
                    .waitForVisible('#win-box', 10000)
                    .then(function() {
                        // got it!
                        client.getText('.win-message h2:nth-of-type(2)')
                            .then(function(text) {
                                console.log('we got: ' + text);
                                if (text.toLowerCase() === MATCH_TEXT.toLowerCase()) {
                                    resolve(text);
                                } else {
                                    reject({
                                        message: 'gift does not match',
                                        type: 'mis_match',
                                    });
                                }
                            });
                    })
                    .catch(function() {
                        drop();
                    });
            } else {
                reject({
                    message: 'exceed max drops',
                    type: 'max_drops',
                });
            }
        }
        drop();
    });    
}

function launch() {
    return new Promise((resolve, reject) => {
        var options = { desiredCapabilities: { browserName: 'chrome' } };
        var client = webdriverio.remote(options);
        client
            .init()
            .url('https://www.jomalone.com/pick-and-spritz')
            .waitForVisible('.grabber-help-overlay', 15000)
            .then(function() {
                client.click('.grabber-help-overlay')
                    .then(function() {
                        play(client)
                            .then(function(res) {
                                resolve(res)
                            })
                            .catch(function(err) {
                                client.end();
                                reject(err);
                            });
                    });
            })
            .catch(function(err) {
                console.log('something is wrong: ', err);
            });
    });
};

function startChecking() {
    var attempts = 0;
    return new Promise((resolve, reject) => {
        var _launch = function() {
            attempts++;
            console.log('######################');
            console.log('attempt #' + attempts);
            launch()
                .then(function(res) {
                    resolve(res);
                })
                .catch(function(err){
                    // keep trying
                    console.log('[FAIL] ', err.message);
                    console.log('trying again...');
                    _launch();
                }) ;
        }
        _launch();
    });
}
    
function notify() {
    ack = false;
    
    var msg = {
        title: 'Gift Matches',
        message: 'Go get it NOW!',
        sound: true, // Only Notification Center or Windows Toasters
        wait: true // Wait with callback, until user action is taken against notification
    };

    notifier.notify(msg);

    notifier.on('click', function(notifierObject, options) {
        ack = true;
    });

    notifier.on('timeout', function(notifierObject, options) {
        if (!ack) {
            // notify again in 5 seconds
            setTimeout(function() {
                notifier.notify(msg);
            }, 5000);
        }
    });
}

selenium.install(opts, function(err) {
    if (err !== null) {
        console.log('unable to install selenium: ', err);
        return;
    }
    console.log('selenium installed successfully!');

    selenium.start(driversOpts, function(err, child) {
        if (err !== null) {
            console.log('unable to start selenium server: ', err);
        }
        console.log('selenium server started successfully!');
        startChecking()
            .then(function(res) {
                console.log('[SUCCESS] Go get it NOW!');
                notify();
            });
    });
});


