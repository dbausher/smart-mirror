        const fs = require('fs');

        function binEncode(data) {    
            var binArray = []
            var datEncode = "";

            for (i=0; i < data.length; i++) {
                binArray.push(data[i].charCodeAt(0).toString(2)); 
            } 
            for (j=0; j < binArray.length; j++) {
                var pad = padding_left(binArray[j], '0', 8);
                datEncode += pad + ' '; 
            }
            function padding_left(s, c, n) { if (! s || ! c || s.length >= n) {
                return s;
            }
            var max = (n - s.length)/c.length;
            for (var i = 0; i < max; i++) {
                s = c + s; } return s;
            }
            console.log(binArray);
            return binArray;
        }

        var pic1 = "";
        fs.readFile(__dirname + '/js/DBface1.jpg', function(err,data){
            if (err) throw err;
            pic1 = data;
        });
        var pic2 = ''; 
        fs.readFile(__dirname + '/js/DBface2.jpg', function(err,data){
            if (err) throw err;
            pic2 = data;
        });

        var myCanvas = $('<canvas/>');
        var myImageSrc = myCanvas.attr('src',"http://i.imgur.com/qQrlS02.jpg");
        myCanvas.attr('src', myImageSrc);
        var dataInBase64 = $(myCanvas)[0].toDataURL('image/png').replace(/data\:image\/png;base64,/, '');
        pic1 = binEncode(dataInBase64);

        var myCanvas2 = $('<canvas/>');
        var myImageSrc2 = myCanvas2.attr('src',"http://i.imgur.com/7cbT4Au.jpg");
        myCanvas2.attr('src', myImageSrc2);
        var dataInBase642 = $(myCanvas2)[0].toDataURL('image/png').replace(/data\:image\/png;base64,/, '');
        pic2 = binEncode(dataInBase642);

        console.log(pic1);
        console.log(pic2);
        var face1 = '';
        var face2 = '';

        var options = {
            url: "https://api.projectoxford.ai/face/v1.0/detect?returnFaceID=true&returnFaceLandmarks=false",
            headers: {
                'Content-Type': "application/octet-stream",
                "Ocp-Apim-Subscription-Key":"6ced1e1c9767493c89426d2fc4043995"
            }
        };

        var options2 = {
            url: "https://api.projectoxford.ai/face/v1.0/detect?",
            headers: {
                'Content-Type': "application/json",
                "Ocp-Apim-Subscription-Key":"6ced1e1c9767493c89426d2fc4043995"
            }
        };



        request.post(options,pic1,function optionalCallback(err, httpResponse, body) {
            if(err) throw err;
            console.log(httpResponse);
            face1 = body.faceId;

            request.post(options,pic2,function optionalCallback(err, httpResponse, body) {
                if(err) throw err;
                console.log(httpResponse);
                face2 = body.faceId;

                request.post(options2,{faceId1:face1,faceId2:face2},function optionalCallback(err, httpResponse, body) {
                    if(err) throw err;
                    console.log(httpResponse);
                    console.log(body.isIdentical);
                    console.log(body.confidence);

                });

            });
        });