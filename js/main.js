$(".btn").mouseup(function() {
    $(this).blur();
});

$('.refresh').on('click', function() {
    document.location.reload(true);
})

$.getJSON("js/burncenters.json", function(data) {
    var firebase = new Firebase("https://burning-heat-6696.firebaseio.com/");
    var historic_burns = firebase.child("Burns");
    L.mapbox.accessToken = 'pk.eyJ1Ijoic2x2YW5jaXNlIiwiYSI6InhXaFpxTVEifQ.PXBBAEqSyW9DWmZ060-OvQ';
    function onEachFeature(feature, layer) {
        layer.bindPopup(feature.properties.Name);
    }

    var map = L.mapbox.map('map', 'slvancise.gghikhh3', {
        zoomControl : false
    }).setView([39.833333, -98.583333], 5);

    var burnIcon = L.AwesomeMarkers.icon({
        icon : 'glyphicon-fire',
        prefix : 'glyphicon',
        markerColor : 'darkred'
    });
    var greenIcon = L.AwesomeMarkers.icon({
        icon : 'fa-medkit',
        prefix : 'fa',
        markerColor : 'green'
    });

    var marker = L.marker([-73, 40], {
        icon : burnIcon
    });
    var nearestMarker = L.marker([-73, 40], {
        icon : greenIcon
    });
    var burnCenters = L.geoJson(data, {
        onEachFeature : onEachFeature,
        pointToLayer : function(feature, latlng) {
            var smallIcon = L.AwesomeMarkers.icon({
                icon : 'fa-medkit',
                prefix : 'fa',
                markerColor : 'cadetblue'
            });
            return L.marker(latlng, {
                icon : smallIcon
            });
        }
    }).addTo(map);

    var currentPosition;
    function route(start, end) {
        var startEnd = start[0] + ',' + start[1] + ';' + end[0] + ',' + end[1];
        var directionsAPI = 'https://api.tiles.mapbox.com/v4/directions/mapbox.driving/' + startEnd + '.json?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ'
        // query for directions and draw the path
        $.get(directionsAPI, function(data) {
            if (data.hasOwnProperty('error')) {
                $('#buttonRow').hide();
                $('#textRow').hide();
                $('#errorRow').show();
            } else {
                var coords = data.routes[0].geometry.coordinates;
                var path = turf.linestring(coords, {
                    "stroke" : "#3c4e5a",
                    "stroke-width" : 4,
                    "opacity" : 1
                });
                map.fitBounds(map.featureLayer.setGeoJSON(path).getBounds());
                $('#buttonRow').hide();
                $('#textRow').hide();
                var time;
                if (data.routes[0].duration / 3600 < 1) {
                    time = "Time: " + Math.round(data.routes[0].duration / 60) + " Minutes";
                }
                if (data.routes[0].duration / 3600 > 1) {
                    if (Math.round(data.routes[0].duration / 3600) === 1) {
                        time = "Time: " + Math.round(data.routes[0].duration / 3600) + " Hour";
                    } else {
                        time = "Time: " + Math.round(data.routes[0].duration / 3600) + " Hours";
                    }
                }
                $('#distance').html("Distance: " + Math.round(data.routes[0].distance / 1609.34) + " Miles");
                $('#time').html(time);
                $('#detailsRow').show();
                $('#destRow').show();
            }
        })
    };

    function findNearest(loc) {
        map.removeLayer(burnCenters);
        var point = turf.point(loc);
        var nearest = turf.nearest(point, data);
        $("#destination").html(nearest.properties.Name);
        var nearestCors = [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
        nearestMarker.setLatLng(nearestCors).bindPopup(nearest.properties.Name).addTo(map);
        route(loc, nearest.geometry.coordinates);
    };

    function success(pos) {
        currentPosition = [pos.coords.latitude, pos.coords.longitude];
        historic_burns.push([pos.coords.latitude, pos.coords.longitude]);
        marker.setLatLng(currentPosition).bindPopup("Your Location").addTo(map);
        findNearest([pos.coords.longitude, pos.coords.latitude]);

    };

    function error(err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
    };

    $('#findMe').click(function() {
        navigator.geolocation.getCurrentPosition(success, error);
    });

    $('#placeLoc').click(function() {
        $("#placeLoc").toggleClass('selected')
        map.on('click', function(e) {
            if ($("#placeLoc").hasClass('selected')) {
                $("#placeLoc").toggleClass('selected')
                marker.setLatLng([e.latlng.lat, e.latlng.lng]).bindPopup("Your Location").addTo(map);
                findNearest([e.latlng.lng, e.latlng.lat]);

                historic_burns.push([e.latlng.lat, e.latlng.lng]);
            };
        });
    });

    var press = 1;
    var historic_burns_parsed = [];
    historic_burns.on("value", function(snapshot) {
        snapshot.forEach(function(data) {
            historic_burns_parsed.push(data.val());
        })
        heat = L.heatLayer(historic_burns_parsed, {
            maxZoom : 12,
            radius : 15
        });

    }, function(errorObject) {
        console.log("The read failed: " + errorObject.code);
    });

    $('#heatMap').click(function() {
        console.log("run");
        console.log(press);
        if (press == 1) {
            map.addLayer(heat);
            press = 2;
            $('#heatMap').html("Hide Heat Map");
        } else {
            map.removeLayer(heat);
            $('#heatMap').html("Show Heat Map");
            press = 1;
        }

    });

});
