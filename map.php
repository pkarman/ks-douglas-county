<!DOCTYPE html>
<html>
<head>
  
  <title>Douglas County, Kansas</title>

  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Open+Sans">

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.2.0/dist/leaflet.css" integrity="sha512-M2wvCLH6DSRazYeZRIm1JnYyh22purTM+FDB5CsyxtQJYeKq83arPe5wgbNmcFXGqiSH2XR8dT/fJISVA1r/zQ==" crossorigin=""/>

  <script src="https://unpkg.com/leaflet@1.2.0/dist/leaflet.js" integrity="sha512-lInM/apFSqyy1o6s89K4iQUKg6ppXEgsVxT35HbzUupEVRh2Eu9Wdl4tHj7dZO0s1uvplcYGmt3498TtHq+log==" crossorigin=""></script>

  <script src="leaflet.ajax.min.js"></script>
  <script src="https://unpkg.com/@mapbox/leaflet-pip@latest/leaflet-pip.js"></script>

  <script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>

  <link rel="stylesheet" type="text/css" href="map.css">

</head>
<body>

<nav class="menu">
 <ul>
  <li><a href="http://douglascountydems.org/">Douglas County Democrats</a></li>
 </ul>
</nav>

<div id='about'>
<h1>Precinct Map</h1>
</div>

<div id='map'></div>
<div id='details'></div>

<script>
  var map, geojson, lastPoly, info, wards, people;

  L.Util.ajax("people.json").then(function(data) {
    people = data;
  });
  L.Util.ajax("wards.json").then(function(data) {
    wards = data;
  });

  var persons_for_precinct = function(props) {
    //console.log(props);
    var p = [];
    var precinct_id = [props.precinctid, props.subprecinctid].join('.');
    $.each(people, function(idx, person) {
      //console.log(person, precinct_id);
      var parts = (person["Pct Part"] + "").split(/\ +/);
      $.each(parts, function(idx2, part) {
        if (part.match(/^\d+\.\d+$/)) {
          if (part == precinct_id) {
            //console.log("match", part, precinct_id);
            p.push(person);
          }
        }
        else if (part.match(/^\.\d+$/)) {
          var precinct = parts[0].match(/^(\d+)\./)[1];
          if ((precinct + part) == precinct_id) {
            //console.log("match2", part, precinct_id);
            p.push(person);
          }
        }
        else {
          console.log("Unknown precinct format:", part);
        }
      });
    });
    console.log("matching people:", p);

    return p;
  };

  var precinct_details = function(props) {
    var precinct_name = props.name;
    var els = $('<div>');
    els.append($('<h4>'+precinct_name+'</h4>'));
    els.append($('<h5>'+props.ward+'</h5>'));
    var tbl = $('<table>');
    var persons = persons_for_precinct(props);
    $.each(persons, function(idx, cmte) {
      if (!cmte.Name) return;
      tbl.append('<tr><th>Committeeperson</th><td>'+cmte.Name+'</td></tr>');
    });
    els.append(tbl);
    return els.html();
  };

  /* map config / handlers */
  var polyClick = function(e) {
    var poly = e.target;
    var props = poly.feature.properties;
    $('#details').html(precinct_details(props));
    poly.setStyle({ weight: 3, color: '#666', fillOpacity: 0.1 });
    if (lastPoly && lastPoly != poly) {
      geojson.resetStyle(lastPoly);
    }
    lastPoly = poly;
  };
  var onHover = function(e) {
    var poly = e.target;
    if (lastPoly != poly) {
      poly.setStyle({ weight: 5, color: '#bbb', fillOpacity: 0.2 });
    }
    info.update(poly.feature.properties);
  };
  var offHover = function(e) {
    var poly = e.target;
    if (lastPoly != poly) {
      geojson.resetStyle(poly);
    }
    info.update();
  };
  var polyEach = function(p, layer) {
    layer.on({
      click: polyClick,
      mouseover: onHover,
      mouseout: offHover
    });
  };

  var getPrecinctColor = function(feature) {
    var precinctNumber = feature.properties.precinctid;
    var color;
    $.each(wards, function(k, val) {
      $.each(val.precincts, function(idx, p_id) {
        if (p_id == precinctNumber) {
          color = val.color;
          feature.properties.ward = k;
        }
      });
    });
    return color;
  };

  var opts = {
    style: function(feature) {
      return {
        color: '#777',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.3,
        fillColor: getPrecinctColor(feature)
      };
    },
    onEachFeature: polyEach
  };

  geojson = L.geoJson.ajax('douglas-county-precincts-2016.geojson', opts);

  var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

  var streets = L.tileLayer(mbUrl, {id: 'mapbox.streets',   attribution: mbAttr});

  var popup = L.popup();

  function onMapClick(e) {
    popup
      .setLatLng(e.latlng)
      .setContent("You clicked the map at " + e.latlng.toString())
      .openOn(map);
  }

  map = L.map('map', {
    center: [38.91, -95.25],
    zoom: 10,
    layers: [streets, geojson]
  });

  //map.on('click', onMapClick);

  // control that shows state info on hover
  info = L.control();
  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  info.update = function (props) {
    this._div.innerHTML = '<h4>Precinct</h4>' +  (props ?  (props.NAME || props.PRECINCT || props.name) : 'Click on a precinct');
  };

  info.addTo(map);

  // search by precinct name
  $('#search').on('click', function(e) {
    var $str = $('#precinct').val();
    if ($str.length == 0) return;

    //console.log($str);
    var found = false;
    geojson.eachLayer(function(layer) {
      if (found) return;
      var props = layer.feature.properties;
      var name = (props.NAME || props.PRECINCT || props.name);
      var sha = props.geosha || '';
      if (name.match($str) || $str == sha) {
        //console.log(layer);
        layer.fireEvent('click');
        map.fitBounds(layer.getLatLngs());
        found = true;
      }
    });
  });
  // enter key listener
  $("#precinct").keyup( function(e) {
    if (e.keyCode == 13) {
      $('#search').click();
    }
  });
</script>

</body>
</html>

