<!DOCTYPE html>
<html>
<head>
  
  <title>Douglas County, Kansas</title>

  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Open+Sans">

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.2.0/dist/leaflet.css" integrity="sha512-M2wvCLH6DSRazYeZRIm1JnYyh22purTM+FDB5CsyxtQJYeKq83arPe5wgbNmcFXGqiSH2XR8dT/fJISVA1r/zQ==" crossorigin=""/>

  <script src="https://unpkg.com/leaflet@1.2.0/dist/leaflet.js" integrity="sha512-lInM/apFSqyy1o6s89K4iQUKg6ppXEgsVxT35HbzUupEVRh2Eu9Wdl4tHj7dZO0s1uvplcYGmt3498TtHq+log==" crossorigin=""></script>

  <script src="https://statedemocrats.us/js/leaflet.ajax.min.js"></script>
  <script src="https://unpkg.com/@mapbox/leaflet-pip@latest/leaflet-pip.js"></script>

  <script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
  <script src="https://statedemocrats.us/js/p-loading.min.js"></script>
  <script src="https://statedemocrats.us/js/leaflet.pattern.js"></script>

  <link rel="stylesheet" type="text/css" href="map.css">
  <link rel="stylesheet" type="text/css" href="https://statedemocrats.us/css/p-loading.min.css">

</head>
<body>

<nav class="menu">
 <ul>
  <li><a href="https://statedemocrats.us/">State Democrats</a></li>
  <li><a href="https://statedemocrats.us/kansas/">Kansas</a></li>
  <li class="active"><a href="http://douglascountydems.org/">Douglas County</a></li>
 </ul>
</nav>

<div id="mask"></div>

<div id='about'>
<h1>Precinct Map</h1>
<p>Problem? Send email to <a href="mailto:info@statedemocrats.us">info@statedemocrats.us</a>.</p>
</div>

<div id='search'>
 <label>Street Address</label>
 <input id='street-address' class='search' type='text' size='30' >
 <label>ZIP</label>
 <input id='zip-address' class='search' type='text' size='10' >
 <button id='find-address'>Lookup Address</button>
 <div id="error-msg"></div>
</div>

<div id='controls'>
 <span class='control'>Select a Precinct: <select id="precinct-list"></select></span>
 <span class='control'><button onclick="clearAllMapMarkers()">Clear map markers</button></span>
</div>
<div id='map'></div>
<div id='details'></div>

<script type="text/javascript">
  $(document).ready(function() {
    var $mask = $('#mask');
    $mask.show();
    $mask.ploading({ action: 'show' });
  });
</script>
<script type="text/javascript" src="map.js"></script>

</body>
</html>

