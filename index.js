var express = require('express'),
  phantom = require('phantom-proxy'),
  app = express(),
  getContent,
  respond;

getContent = function(url, callback) {
  var content = '';

  phantom.create({}, function(proxy){
    page = proxy.page;

    return page.open(url, function() {
      var lastReceived = new Date().getTime(),
        requestCount = 0,
        responseCount = 0,
        requestIds = [],
        startTime = new Date().getTime(),
        checkComplete,
        checkCompleteInterval;

      page.onResourceRequested = function(request) {
        if(requestIds.indexOf(request.id) === -1) {
          requestIds.push(request.id);
          requestCount++;
        }
      };

      page.onResourceReceived = function(response) {
        if(requestIds.indexOf(response.id) !== -1) {
          lastReceived = new Date().getTime();
          responseCount++;
          requestIds[requestIds.indexOf(response.id)] = null;
        }
      };

      checkComplete = function() {
        if((new Date().getTime() - lastReceived > 300 && requestCount === responseCount) || new Date().getTime() - startTime > 5000) {
          clearInterval(checkCompleteInterval);

          page.evaluate(function(elem){
            return document.getElementsByTagName(elem)[0].innerHTML;
          }, function(result){
            callback(result);
            proxy.end(function() {
              console.log('Phantom has exited!');
            });
          }, 'html');
        }
      };

      checkCompleteInterval = setInterval(checkComplete, 1);
    });
  });
};

respond = function(req, res) {
  url = req.query.url;

  if (!url) res.status(404).send('Not found');

  getContent(url, function(content) {
    res.send(content);
  });
};

app.get('/scrape', respond);

app.listen(8111);
console.log('Express server started on port 8111');
