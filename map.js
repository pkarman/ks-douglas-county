var map, geojson, lastPoly, info, wards, people, lastMarker, polling_places, precincts, voter_stats;
var GEO_LOOKUP = 'geo-lookup.php?address=';
var POLL_CACHE = {};
var election_stat_ids = ['GN2008', 'GN2010', 'GN2012', 'GN2014', 'GN2016'];

var makePrecinctSelector = function() {
  var $dropdown = $('#precinct-list');
  //console.log('populating', $dropdown, 'with', precincts);
  $dropdown.append($('<option />').val('').text(''));
  $.each(precincts, function(idx, p_id) {
    $dropdown.append($('<option />').val(p_id).text(p_id));
  });
  $dropdown.change(function() {
    var precinctPicked = $dropdown.find(':selected').text();
    if (!precinctPicked) return;
    showPrecinct(precinctPicked);
  });
};

L.Util.ajax("people.json").then(function(data) {
  people = data;
});
L.Util.ajax("wards.json").then(function(data) {
  wards = data;
  precincts = [];
  $.each(wards, function(k, val) {
    $.each(val.precincts, function(idx, p_id) {
      precincts.push(p_id);
    });
  });
  precincts.sort(function(a,b) { return a - b });
});
L.Util.ajax("polling.json").then(function(data) {
  polling_places = data;
});
L.Util.ajax("douglas-county-voters-stats.json").then(function(data) {
  voter_stats = data;
});

var persons_for_precinct = function(props) {
  //console.log(props);
  if (props.people) return props.people;

  var p = [];
  var precinct_id = [props.precinctid, props.subprecinctid].join('.');

  if (!PRECINCT2PERSON) {
    buildPrecinct2Person();
  }

  if (PRECINCT2PERSON[precinct_id]) {
    p = PRECINCT2PERSON[precinct_id];
  }
  props['people'] = p;
  return p;
};

var PRECINCT2PERSON;
function buildPrecinct2Person() {
  PRECINCT2PERSON = {};
  $.each(people, function(idx, person) {
    //console.log(person, precinct_id);
    if (!person.Name) return true;
    var parts = (person["Pct Part"] + "").split(/\ +/);
    //console.log(person, parts);
    $.each(parts, function(idx2, part) {
      if (part.match(/^\d+\.\d+$/)) {
        if (!PRECINCT2PERSON[part]) {
          PRECINCT2PERSON[part] = [];
        }
        PRECINCT2PERSON[part].push(person);
      }
      else if (part.match(/^\.\d+$/)) {
        var precinct = parts[0].match(/^(\d+)\./)[1];
        var precinct_id = precinct + part;
        if (!PRECINCT2PERSON[precinct_id]) {
          PRECINCT2PERSON[precinct_id] = [];
        }
        PRECINCT2PERSON[precinct_id].push(person);
      }
      else {
        console.log("Unknown precinct format:", part);
      }
    });
  });
};

var find_polling_place = function(props) {
  var place = '';
  $.each(polling_places, function(idx, pp) {
    //console.log(pp, props.precinctid);
    if (pp.Precinct == props.precinctid) {
      place = pp.PollingPlace;
      return false;
    }
  });
  return place;
}

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
  var polling_place = find_polling_place(props);
  tbl.append('<tr><th>Polling Location</th><td>'+polling_place+'</td></tr>');
  // add a marker for the polling place
  if (!POLL_CACHE[polling_place]) {
    $.getJSON(GEO_LOOKUP+encodeURIComponent(polling_place), function(data) {
        if (!data.result.addressMatches || data.result.addressMatches.length == 0) return;

        var result = data.result.addressMatches[0];
        var lat, lng, popstr, marker, icon;
        popstr = 'Polling Location:<br/>' + result.matchedAddress;
        lat = result.coordinates.y;
        lng = result.coordinates.x;
        icon = L.icon({
          iconUrl:'https://cdn.vectorstock.com/i/thumb-large/88/29/ballot-box-line-icon-vector-17948829.jpg',
          iconSize:[30, 30]
        });
        marker = L.marker([lat, lng], { icon: icon}).addTo(map).bindPopup(popstr);
        POLL_CACHE[polling_place] = marker;
    })
    .done(function(data) {
      //console.log('polling geo lookup done');
    });
  }

  els.append(tbl);

  // voter stats
  var ct_id = props.precinctid + '.' + props.subprecinctid;
  var vtd_code = voter_stats['names'][precinct_name] || voter_stats['names'][ct_id];

  if (!vtd_code) return els.html();

  els.append('<h5>VTD: '+vtd_code+'</h5>');

  var stats = voter_stats[vtd_code];
  //console.log(stats);
  $.each(election_stat_ids, function(idx, id) {
    var stat = stats[id];
    var by_party = $('<table>');
    by_party.append('<caption>'+id+'</caption>');
    by_party.append('<tr><th></th><th>Registered</th><th>Turnout</th><th>%</th></tr>');
    // sort party names for consistency
    var parties = [];
    $.each(stat, function(party) {
      parties.push(party);
    });
    $.each(parties.sort(), function(idx2, party) {
      var numbers = stat[party];
      by_party.append('<tr><th>'+party+'</th><td>'+numbers['r']+'</td><td>'+numbers['c']+'</td><td>'+numbers['p'].toFixed(2)+'</td></tr>');
    });
    els.append(by_party);
  });

  return els.html();
};

/* map config / handlers */
var polyClick = function(e) {
  var poly = e.target;
  var props = poly.feature.properties;
  //console.log(props);
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

var getDashArray = function(feature) {
  var precinctNumber = feature.properties.precinctid;
  var dashArray = null;
  var people = persons_for_precinct(feature.properties);
  if (people.length == 0) {
    dashArray = '30,10';
  }
  return dashArray;
};

var opts = {
  style: function(feature) {
    var precinctColor = getPrecinctColor(feature);
    var dashArray = getDashArray(feature);
    var lineColor = '#777';
    var fillPattern = null;

    // no precinct persons
    if (dashArray !== null) {
      var stripes = new L.StripePattern({color: precinctColor, angle: 20, weight: 6});
      stripes.addTo(map);
      fillPattern = stripes;
    }

    return {
      color: lineColor,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.2,
      fillColor: precinctColor,
      fillPattern: fillPattern,
      dashArray: dashArray
    };
  },
  onEachFeature: polyEach
};

geojson = L.geoJson.ajax('douglas-county-precincts-2016.geojson', opts);
geojson.on('data:loaded', function() {
  $('#mask').ploading({action: 'hide'});
  $('#mask').hide();
  makePrecinctSelector();
  // populate form from url params if present
  var urlParams = getJsonFromUrl();
  if (urlParams['precinct']) {
    showPrecinct(urlParams['precinct']);
  }
});

// https://stackoverflow.com/questions/8486099/how-do-i-parse-a-url-query-parameters-in-javascript
function getJsonFromUrl(hashBased) {
  var query;
  if(hashBased) {
    var pos = location.href.indexOf("#");
    if(pos==-1) return [];
    query = location.href.substr(pos+1);
  } else {
    query = location.search.substr(1);
  }
  var result = {};
  query.split("&").forEach(function(part) {
    if(!part) return;
    part = part.split("+").join(" "); // replace every + with space, regexp-free version
    var eq = part.indexOf("=");
    var key = eq>-1 ? part.substr(0,eq) : part;
    var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
    var from = key.indexOf("[");
    if(from==-1) result[decodeURIComponent(key)] = val;
    else {
      var to = key.indexOf("]",from);
      var index = decodeURIComponent(key.substring(from+1,to));
      key = decodeURIComponent(key.substring(0,from));
      if(!result[key]) result[key] = [];
      if(!index) result[key].push(val);
      else result[key][index] = val;
    }
  });
  return result;
}

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

var address_lookup_string = function() {
  var $addr = $('#street-address').val();
  var $zip  = $('#zip-address').val();
  if ($addr.length == 0 || $zip.length == 0) {
    //console.log('missing input');
    $('#search').addClass('error');
    $('#error-msg').text('You must enter both street address and ZIP code');
    return null;
  }
  $('#error-msg').text('');
  $('#search').removeClass('error');
  return $addr + " KS " + $zip;
}

var renderLookup = function(result) {
  //console.log(result);
  // clean any existing marker
  if (lastMarker) {
    map.removeLayer(lastMarker);
  }

  var lat, lng, popstr, marker;
  popstr = result.matchedAddress;
  lat = result.coordinates.y;
  lng = result.coordinates.x;
  map.setView([lat, lng], 16);
  marker = L.circle([lat, lng], {
    color: 'blue',
    fillColor: 'blue',
    fillOpacity: 0.5,
    radius: 10
  }).addTo(map)
  .bindPopup(popstr).openPopup();
  // activate whichever precinct this marker lies within
  var pip_precincts = leafletPip.pointInLayer([lng, lat], geojson);
  $.each(pip_precincts, function(idx, precinct) {
    //console.log(precinct);
    precinct.fireEvent('click');
  });
  lastMarker = marker;
}

// search by precinct name
$('#find-address').on('click', function(e) {
  var $btn = $('#find-address');
  if ($btn.prop('disabled') == true) return;

  var $str = address_lookup_string();
  if (!$str || $str.length == 0) return;

  $btn.prop('disabled', true);

  var $mask = $('#mask');
  $mask.show();
  $mask.ploading({ action: 'show' });

  $.getJSON(GEO_LOOKUP+encodeURIComponent($str), function(data) {
    //console.log(data);
    if (!data.result.addressMatches || data.result.addressMatches.length == 0) {
      $('#search').addClass('error');
      $('#error-msg').text('Error looking up address');
      //console.log(data);
      return;
    }
    renderLookup(data.result.addressMatches[0]);
  })
  .done(function() {
    //console.log('done!');
  })
  .fail(function(r) {
    console.log('fail: ', r);
    $('#search').addClass('error');
    $('#error-msg').text('Error looking up address');
  })
  .always(function(r) {
    //console.log('always:', r);
    $btn.prop('disabled', false);
    $mask.hide();
    $mask.ploading({ action: 'hide' });
  });
});

// enter key listener
$("#street-address").keyup( function(e) {
  if (e.keyCode == 13) {
    $('#find-address').click();
  }
});
$('#zip-address').keyup(function(e) {
  if (e.keyCode == 13) {
    $('#find-address').click();
  }
});

// clear all markers
function clearAllMapMarkers() {
  if (lastMarker) {
    map.removeLayer(lastMarker);
  }
  $.each(POLL_CACHE, function(polling_place, marker) {
    //console.log(polling_place, marker);
    map.removeLayer(marker);
  });
}

function showPrecinct(precinctId) {
  var found = false;
  geojson.eachLayer(function(layer) {
    if (found) return;
    var props = layer.feature.properties;
    if (props.precinctid == precinctId) {
      //console.log(layer);
      layer.fireEvent('click');
      map.fitBounds(layer.getLatLngs());
      found = true;
    }
  });
}
