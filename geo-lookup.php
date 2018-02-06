<?php
  $address = $_GET['address'];
  if (!$address) {
    header('X-statedems: address required', 400, false);
    print 'address required';
    exit(0);
  }
  $base_url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=9&format=json&address=';
  $json = file_get_contents($base_url . $address);
  header('Content-Type: application/json');
  //error_log($json);
  print $json;
?>
