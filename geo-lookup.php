<?php
  define('CACHE_TTL', 86400); // 24 hours
  $address = $_GET['address'];
  if (!$address) {
    header('X-statedems: address required', 400, false);
    print 'address required';
    exit(0);
  }

  header('Content-Type: application/json');

  require 'FileCache.php';
  $cache = new FileCache();
  $key = sha1($address);
  $json = $cache->get($key);
  if (!$json) {
    $json = fetch_geocode($key, $address);
  }
  print $json;

  function fetch_geocode($key, $address) {
    $base_url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=9&format=json&address=';
    $json = file_get_contents($base_url . urlencode($address));
    if ($json) {
      $cache = new FileCache();
      $cache->save($key, $json, CACHE_TTL);
    }
    return $json;
  }
?>
