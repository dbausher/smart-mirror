(function() {
    'use strict';

    function GiphyService($http) {
        var service = {};
        service.gif = null;

        service.init = function(img){

          return $http.get("http://api.giphy.com/v1/gifs/random?api_key="+config.giphy.key+"&tag="+img).
              then(function(response) {
                  return service.gif = response.data;
              });
        };
        /*
        service.fairest = function(){

          return $http.get("http://api.giphy.com/v1/gifs/random?api_key="+config.giphy.key+"&tag=Snow+white&rating=pg-13").
            then(function(response) {
                  return service.gif = response.data;
              });
        }
        */

        service.fairest = function(giftype){
          var snowID = "4jOkqzylSaipW";
          var snowID2 = "zrkgTVBtq1a4E";
          var snowID3 = "fmKw5qN7TEXza";
          var mirrID = "NJKKy7o0mM920";

          var gifphs = {"mirror" : mirrID, "snow white": snowID3};

          return $http.get("http://api.giphy.com/v1/gifs/"+ gifphs[giftype] + "?api_key="+config.giphy.key).
            then(function(response) {
              console.log(response);
                  return service.gif = response.data;
              });
        }

        service.giphyImg = function() {
          if(service.gif === null){
              return null;
          }
          if(service.gif.data.images.original != null){
            return service.gif.data.images.original.url;
          }
          return service.gif.data.image_url;
        };

        return service;
    }

    angular.module('SmartMirror')
        .factory('GiphyService', GiphyService);

}(window.annyang));
