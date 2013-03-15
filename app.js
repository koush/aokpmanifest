
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');
var request = require('request');

var app = express();
var path = require('path');
var url = require('url');

var $ = require('jquery');


var get = function(urlStr, callback, headers) {
  var options = {
    url: urlStr,
    headers: headers
  }
  request(options, function(err, resp, body) {
    try {
      callback(err, body, resp);
    }
    catch (e) {
      console.log('exception during get');
      console.log(e);
    }
  });
}

var ajax = function(urlStr, callback, headers) {
  get(urlStr, function(err, data) {
    if (err) {
      callback(err);
    }
    else {
      var parsed;
      try {
        parsed = JSON.parse(data);
      }
      catch (e) {
        console.log('ajax parse error');
        console.log(data);
        callback(e);
      }
      if (parsed)
        callback(err, parsed);
    }
  },
  headers)
}

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}
if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var manifest = {
  version: 1,
  homepage: "http://www.cyanogenmod.com/",
  donate: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=3283920",
  roms: [
  ]
};

app.get('/mirror/chaos/:device/:filename', function(req, res) {
  res.header('Cache-Control', 'max-age=432000');
  request('http://chaos.xfer.in/AOKP/' + req.params.device + '/' + req.params.filename).pipe(res);
})

var aokpList = 'http://aokp.co/supported-devices/';
function refresh() {
  var newManifest = {
    version: 1,
    homepage: "http://www.cyanogenmod.com/",
    donate: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=3283920",
    roms: [
    ]
  };
  
  get(aokpList, function(err, data) {
    if (err) {
      manifest = newManifest;
      setTimeout(refresh, 86400);
      return;
    }
    
    // console.log(data);
    var devices = $(data).find('.device a');
    var waiting = devices.length;
    $.each(devices, function(key, device) {
      var href = aokpList + $(device).attr('href');
      device = $(device).text();
      get(href, function(err, data) {
        waiting--;
        console.log('waiting: ' + waiting);
        if (!err) {
          var roms = $(data).find('table.sortable tr');
          $.each(roms, function(index, rom) {
            $.each($(rom).find('a'), function(index, atag) {
              var href = $(atag).attr('href');
            
              if (href.indexOf('androtransfer.com') != -1) {
                // now we have the url, device, etc. let's populate the manifest.
                var android = $(rom.children[0]).text();
                var version = $(rom.children[1]).text();
                var type = $(rom.children[2]).text();
              
              
                var entry = {
                  device: device,
                  name: 'AOKP ' + android + ' ' + type + ' ' + version,
                  summary: '',
                  url: 'http://aokpmanifest.clockworkmod.com/mirror/chaos/' + device + '/' + path.basename(url.parse(href).path)
                }
                newManifest.roms.push(entry);
                // console.log(entry);
              }
            });
          });
        }
        if (waiting == 0)
          manifest = newManifest;
      })
    });
  });
}
refresh();

app.get('/manifest', function(req, res) {
  res.send(manifest);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
