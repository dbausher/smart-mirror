(function(annyang) {
  'use strict';

  function StockService($window, $http, $q) {
    var service = {};

    service.getStockQuotes = function() {
      var deferred = $q.defer();
      var url = 'http://finance.yahoo.com/webservice/v1/symbols/'+config.stock.names+'/quote?format=json&view=detail';

      $http.get(url).then(function(response) {
        deferred.resolve(response.data);
      }, function(error) {
        deferred.reject('Unknown error');
      });

      return deferred.promise;
    }

    return service;
  }

  angular.module('SmartMirror')
    .factory('StockService', StockService);
}(window.annyang));