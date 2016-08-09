(function(angular) {
    'use strict';

    function MirrorCtrl(
            SpeechService,
            GeolocationService,
            WeatherService,
            FitbitService,
            MapService,
            HueService,
            CalendarService,
            ComicService,
            GiphyService,
            TrafficService,
            TimerService,
            ReminderService,
            SearchService,
            SoundCloudService,
            RssService,
            $rootScope, $scope, $timeout, $interval, tmhDynamicLocale, $translate) {
        var _this = this;
        const mqtt = require('mqtt');
        const request = require('request');
        const client = mqtt.connect('mqtt://broker.hivemq.com');

        const oxford = require('project-oxford');
        const oxclient = new oxford.Client('6ced1e1c9767493c89426d2fc4043995');

        var people = ["Victor","Daniel"];
        var groupID = 'mirrorusers';
        var added = 0;
        var trained = false;
        var trainId;
        var checkTrainId;
        var whosThereId;
        var user = 'Not ready to be';
        var profiles = {};
        var done = false;

        $scope.listening = false;
        $scope.debug = false;
        $scope.focus = "default";
        $scope.user = {};
        $scope.shownews = true;
        $scope.commands = [];
        
        /*$translate('home.commands').then(function (translation) {
            $scope.interimResult = translation;
        });*/
        $scope.interimResult = $translate.instant('home.commands');
        $scope.layoutName = 'main';

        $scope.fitbitEnabled = false;
        if (typeof config.fitbit != 'undefined') {
            $scope.fitbitEnabled = true;
        }

        // LINUX ONLY

        var v4l2camera = require("v4l2camera");

        var cam = new v4l2camera.Camera("/dev/video0");
        if (cam.configGet().formatName !== "MJPG") {
            console.log("NOTICE: MJPG camera required");
            process.exit(1);
        }




        // oxclient.face.detect({path:'faces/' + people[1] + '/face1.JPG',analyzesAge:false,analyzesGender:false}).then(function(response){
        //     console.log(response);
        // });

        function checkFam(){
            //console.log('hello')
            //$scope.traffic = {time_to: 'Initializing, please wait to log in'};
            oxclient.face.personGroup.list().then(function(response){
                //console.log(response);
                if(response.length > 0 && response[0]['personGroupId'] == groupID){
                    //console.log('tere');
                    oxclient.face.personGroup.delete(groupID).then(function(response){
                        makeFam();
                    });
                }
                else{
                    //console.log('nun');
                    makeFam();
                }
            });
        }

        function makeFam(){
            oxclient.face.personGroup.create(groupID,"Mirror Users","").then(function(response,err){
                if(err) throw Error;
                //console.log('from');
                for (var i = 0; i < people.length;i++){
                    //console.log('the');
                    //console.log(people[i]);
                    addFam(people[i]);
                }

            });
        }

        function addFam(name){
            oxclient.face.person.create(groupID,name,"").then(function(response){
                        //console.log(response);
                        //console.log(response['personId']);
                        //console.log(name);
                        profiles[response['personId']] = name;
                        oxclient.face.person.addFace(groupID,response['personId'],{'path':'faces/' + name + '/face1.JPG'}).then(function(response){added++;});
                        oxclient.face.person.addFace(groupID,response['personId'],{'path':'faces/' + name + '/face2.JPG'}).then(function(response){added++;});
                        oxclient.face.person.addFace(groupID,response['personId'],{'path':'faces/' + name + '/face3.JPG'}).then(function(response){added++;});
                    });
        }

        var startTraining = function(){
            console.log(added)
            if(added == people.length*3){
                //console.log(added)
                oxclient.face.personGroup.trainingStart(groupID);
                $interval.cancel(trainId);
                console.log('no more added')
                checkTrainId = $interval(checkTraining, 5000);
            }
        }

        var checkTraining = function(){
            oxclient.face.personGroup.trainingStatus(groupID).then(function(response){
                console.log(response);
                if(response['status'] == 'succeeded'){
                    $interval.cancel(checkTrainId);
                    user = 'Ready to be';
                }
            })
        }

        var takePic = function)(){
            cam.start();
            cam.capture(function (success) {
              var frame = cam.frameRaw();
              require("fs").createWriteStream("result.jpg").end(Buffer(frame));
              cam.stop();
            });
        }


        var whosThere = function(){
            oxclient.face.detect({'path':'faces/testimg.JPG','returnFaceId':true}).then(function(response){
                console.log(response);
                if (response.length > 0){
                    oxclient.face.identify([response[0]['faceId']],groupID).then(function(response,err){
                        if(err){throw Error}
                        //console.log(response[0]['candidates'][0]['personId']);
                        if (response.length > 0){
                            user = profiles[response[0]['candidates'][0]['personId']];
                        }
                        else{
                            user = "Failed to be";
                        }
                    });
                }
                else{
                    console.log('nobody there')
                    user = 'Failed to be';
                }
                
            });
        }
        checkFam();
        trainId = $interval(startTraining,18000);


        

        


        //set lang
        moment.locale((typeof config.language != 'undefined')?config.language.substring(0, 2).toLowerCase(): 'en');
        console.log('moment local', moment.locale());

        //Update the time
        function updateTime(){
            $scope.date = new moment();
        }
        $scope.bathroomDoor = {title: "bathroom door status", content: "?", lastUpdated: $scope.date }
        client.on('connect', () => {  
            client.subscribe('dbmirror/test')
            });
        client.on('message', (topic, message) => {  
            if(topic === 'dbmirror/test') {
            console.log(message.toString());
            var currentTime = new moment();
            $scope.bathroomDoor.content = message.toString();
            $scope.bathroomDoor.lastUpdated = currentTime;
            }
        });

        // Reset the command text
        var restCommand = function(){
            $translate('home.commands').then(function (translation) {
                $scope.interimResult = translation;
            });
        };

        _this.init = function() {
            var tick = $interval(updateTime, 1000);
            updateTime();
            GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                console.log("Geoposition", geoposition);
                $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
            });
            restCommand();



            //Initialize SoundCloud
            var playing = false, sound;
            SoundCloudService.init();

            var refreshMirrorData = function() {
                //Get our location and then get the weather for our location
                GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    WeatherService.init(geoposition).then(function(){
                        $scope.currentForecast = WeatherService.currentForecast();
                        $scope.weeklyForecast = WeatherService.weeklyForecast();
                        $scope.hourlyForecast = WeatherService.hourlyForecast();
                        console.log("Current", $scope.currentForecast);
                        console.log("Weekly", $scope.weeklyForecast);
                        console.log("Hourly", $scope.hourlyForecast);

                        var skycons = new Skycons({"color": "#aaa"});
                        skycons.add("icon_weather_current", $scope.currentForecast.iconAnimation);

                        skycons.play();

                        $scope.iconLoad = function (elementId, iconAnimation){
                            skycons.add(document.getElementById(elementId), iconAnimation);
                            skycons.play();
                        };

                    });
                }, function(error){
                    console.log(error);
                });

                CalendarService.getCalendarEvents().then(function(response) {
                    $scope.calendar = CalendarService.getFutureEvents();
                }, function(error) {
                    console.log(error);
                });

                if ($scope.fitbitEnabled) {
                    setTimeout(function() { refreshFitbitData(); }, 5000);
                }
            };

            var refreshFitbitData = function() {
                console.log('refreshing fitbit data');
                FitbitService.profileSummary(function(response){
                    $scope.fbDailyAverage = response;
                });

                FitbitService.todaySummary(function(response){
                    $scope.fbToday = response;
                });
            };

            refreshMirrorData();
            $interval(refreshMirrorData, 1500000);

            var greetingUpdater = function () {
                if(typeof config.greeting != 'undefined' && !Array.isArray(config.greeting) && typeof config.greeting.midday != 'undefined') {
                    var hour = moment().hour();
                    var greetingTime = "midday";

                    if (hour > 4 && hour < 11) {
                        greetingTime = "morning";
                    } else if (hour > 18 && hour < 23) {
                        greetingTime = "evening";
                    } else if (hour >= 23 || hour < 4) {
                        greetingTime = "night";
                    }

                    if(people.indexOf(user) > -1){
                        greetingTime = user;
                    }

                    var nextIndex = Math.floor(Math.random() * config.greeting[greetingTime].length);
                    var nextGreeting = config.greeting[greetingTime][nextIndex]
                    $scope.greeting = nextGreeting;
                }else if(Array.isArray(config.greeting)){
                    $scope.greeting = config.greeting[Math.floor(Math.random() * config.greeting.length)];
                }
            };
            greetingUpdater();
            $interval(greetingUpdater, 120000);

            var refreshTrafficData = function() {
                if(done){
                    $scope.trips[0].name = user;
                }
                else{
                    TrafficService.getDurationForTrips().then(function(tripsWithTraffic) {
                        console.log("Traffic", tripsWithTraffic);
                        //Todo this needs to be an array of traffic objects -> $trips[]
                        $scope.trips = tripsWithTraffic;
                        $scope.trips[0].name = user;
                        done = true;
                    }, function(error){
                        $scope.traffic = {error: error};
                    });                    
                }
                
            };

            if(typeof config.traffic != 'undefined'){
                refreshTrafficData();
                $interval(refreshTrafficData, config.traffic.reload_interval * 1000);    
            }

            var refreshComic = function () {
                console.log("Refreshing comic");
                ComicService.initDilbert().then(function(data) {
                    console.log("Dilbert comic initialized");
                }, function(error) {
                    console.log(error);
                });
            };

            refreshComic();
            var defaultView = function() {
                console.debug("Ok, going to default view...");
                $scope.focus = "default";
            }

            $interval(refreshComic, 12*60*60000); // 12 hours

            var refreshRss = function () {
                console.log ("Refreshing RSS");
                $scope.news = null;
                RssService.refreshRssList();
            };

            var updateNews = function() {
                $scope.shownews = false;
                setTimeout(function(){ $scope.news = $scope.bathroomDoor; $scope.shownews = true; }, 1000);
            };

            refreshRss();
            $interval(refreshRss, config.rss.refreshInterval * 60000);
            
            updateNews();
            $interval(updateNews, 8000);  // cycle through news every 8 seconds

            var addCommand = function(commandId, commandFunction){
                var voiceId = 'commands.'+commandId+'.voice';
                var textId = 'commands.'+commandId+'.text';
                var descId = 'commands.'+commandId+'.description';
                $translate([voiceId, textId, descId]).then(function (translations) {
                    SpeechService.addCommand(translations[voiceId], commandFunction);
                    if (translations[textId] != '') {
                        var command = {"text": translations[textId], "description": translations[descId]};
                        $scope.commands.push(command);
                    }
                });
            };

            // List commands
            addCommand('list', function() {
                console.debug("Here is a list of commands...");
                console.log(SpeechService.commands);
                $scope.focus = "commands";
            });


            // Go back to default view
            addCommand('home', defaultView);

            // Hide everything and "sleep"
            addCommand('sleep', function() {
                console.debug("Ok, going to sleep...");
                $scope.focus = "sleep";
            });

            // Go back to default view
            addCommand('wake_up', defaultView);

            // Hide everything and "sleep"
            addCommand('debug', function() {
                console.debug("Boop Boop. Showing debug info...");
                $scope.debug = true;
            });

            // Show map
            addCommand('map_show', function() {
                console.debug("Going on an adventure?");
                GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
                    $scope.focus = "map";
                });
            });

            // Hide everything and "sleep"
            addCommand('map_location', function(location) {
                console.debug("Getting map of", location);
                $scope.map = MapService.generateMap(location);
                $scope.focus = "map";
            });

            // Zoom in map
            addCommand('map_zoom_in', function() {
                console.debug("Zoooooooom!!!");
                $scope.map = MapService.zoomIn();
            });

            addCommand('map_zoom_out', function() {
                console.debug("Moooooooooz!!!");
                $scope.map = MapService.zoomOut();
            });

            addCommand('map_zoom_point', function(value) {
                console.debug("Moooop!!!", value);
                $scope.map = MapService.zoomTo(value);
            });

            addCommand('map_zoom_reset', function() {
                console.debug("Zoooommmmmzzz00000!!!");
                $scope.map = MapService.reset();
                $scope.focus = "map";
            });

            //SoundCloud search and play
            addCommand('sc_play', function(query) {
                SoundCloudService.searchSoundCloud(query).then(function(response){
                    if (response[0].artwork_url){
                        $scope.scThumb = response[0].artwork_url.replace("-large.", "-t500x500.");
                    } else {
                        $scope.scThumb = 'http://i.imgur.com/8Jqd33w.jpg?1';
                    }
                    $scope.scWaveform = response[0].waveform_url;
                    $scope.scTrack = response[0].title;
                    $scope.focus = "sc";
                    SoundCloudService.play();
                });
            });

            //SoundCloud stop
            addCommand('sc_pause', function() {
                SoundCloudService.pause();
                $scope.focus = "default";
            });
            //SoundCloud resume
            addCommand('sc_resume', function() {
                SoundCloudService.play();
                $scope.focus = "sc";
            });
            //SoundCloud replay
            addCommand('sc_replay', function() {
                SoundCloudService.replay();
                $scope.focus = "sc";
            });

            //Search for a video
            addCommand('video_search', function(query){
                SearchService.searchYouTube(query).then(function(results){
                    //Set cc_load_policy=1 to force captions
                    $scope.video = 'http://www.youtube.com/embed/'+results.data.items[0].id.videoId+'?autoplay=1&controls=0&iv_load_policy=3&enablejsapi=1&showinfo=0';
                    $scope.focus = "video";
                });
            });
            //Stop video
            addCommand('video_stop', function() {
              var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
              iframe.postMessage('{"event":"command","func":"' + 'stopVideo' +   '","args":""}', '*');
              $scope.focus = "default";
            });

            // Set a reminder
            addCommand('reminder_insert', function(task) {
                console.debug("I'll remind you to", task);
                $scope.reminders = ReminderService.insertReminder(task);
                $scope.focus = "reminders";
            });

            // Clear reminders
            addCommand('reminder_clear', function() {
                console.debug("Clearing reminders");
                $scope.reminders = ReminderService.clearReminder();
                $scope.focus = "default";
            });

            // Clear reminders
            addCommand('reminder_show', function() {
                console.debug("Showing reminders");
                $scope.reminders = ReminderService.getReminders();
                $scope.focus = "reminders";
            });

            // Check the time
            addCommand('time_show', function(task) {
                 console.debug("It is", moment().format('h:mm:ss a'));
            });

            // Turn lights off
            addCommand('light_action', function(state, action) {
                HueService.performUpdate(state + " " + action);
            });

            //Show giphy image
            addCommand('image_giphy', function(img) {
                GiphyService.init(img).then(function(){
                    $scope.gifimg = GiphyService.giphyImg();
                    $scope.focus = "gif";
                });
            });
            //Show Snow White
            addCommand('show_fairest', function(img) {
                GiphyService.fairest().then(function(){
                    $scope.gifimg = GiphyService.giphyImg();
                    $scope.focus = "gif";
                });
            });

            addCommand('log_in',function() {
                user = 'Attempting to be'
                console.debug('Taking picture and Identifying');
                //take a photo needs to be implemented
                whosThere();
            });

            addCommand('log_out',function(){
                user = 'Nobody';

            });

            //Show fitbit stats (registered only if fitbit is configured in the main config)
            if ($scope.fitbitEnabled) {
                SpeechService.addCommand('show my walking', function() {
                    refreshFitbitData();
                });
            }

            // Show xkcd comic
            addCommand('image_comic', function(state, action) {
                console.debug("Fetching a comic for you.");
                ComicService.getXKCD().then(function(data){
                    $scope.xkcd = data.img;
                    $scope.focus = "xkcd";
                });
            });

            // Show Dilbert comic
            addCommand('image_comic_dilbert', function(state, action) {
                console.debug("Fetching a Dilbert comic for you.");
                $scope.dilbert = ComicService.getDilbert("today");  // call it with "random" for random comic
                $scope.focus = "dilbert";
            });

            // Start timer
            addCommand('timer_start', function(duration) {
                console.debug("Starting timer");
                TimerService.start(duration);
                $scope.timer = TimerService;
                $scope.focus = "timer";

                $scope.$watch('timer.countdown', function(countdown){
                    if (countdown === 0) {
                        TimerService.stop();
                        // defaultView();
                    }
                });
            });

            // Show timer
            addCommand('timer_show', function() {
              if (TimerService.running) {
                // Update animation
                if (TimerService.paused) {
                  TimerService.start();
                  TimerService.stop();
                } else {
                  TimerService.start();
                }

                $scope.focus = "timer";
              }
            });

            // Stop timer
            addCommand('timer_stop', function() {
              if (TimerService.running && !TimerService.paused) {
                TimerService.stop();
              }
            });

            // Resume timer
            addCommand('timer_resume', function() {
              if (TimerService.running && TimerService.paused) {
                TimerService.start();
                $scope.focus = "timer";
              }
            });

            var resetCommandTimeout;
            //Register callbacks for Annyang and the Keyword Spotter
            SpeechService.registerCallbacks({
                listening : function(listening){
                    $scope.listening = listening;
                },
                interimResult : function(interimResult){
                    $scope.interimResult = interimResult;
                    $timeout.cancel(resetCommandTimeout);
                },
                result : function(result){
                    if(typeof result != 'undefined'){
                        $scope.interimResult = result[0];
                        resetCommandTimeout = $timeout(restCommand, 5000);
                    }
                },
                error : function(error){
                    console.log(error);
                    if(error.error == "network"){
                        $scope.speechError = "Google Speech Recognizer: Network Error (Speech quota exceeded?)";
                        SpeechService.abort();
                    } else {
                        // Even if it isn't a network error, stop making requests
                        SpeechService.abort();
                    }
                }
            });
        };

        _this.init();
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

    function themeController($scope) {
        $scope.layoutName = (typeof config.layout != 'undefined' && config.layout)?config.layout:'main';
    }

    angular.module('SmartMirror')
        .controller('Theme', themeController);

}(window.angular));
