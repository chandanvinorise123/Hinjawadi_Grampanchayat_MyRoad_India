const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Load Pune boundary polygon (GeoJSON) – path can be overridden via env var.
const boundaryPath =
  process.env.PUNE_BOUNDARY_PATH ||
  path.resolve(__dirname, '..', '..', 'frontend', 'public', 'boundaries', 'hinjavadi.geojson');

let punePolygon = null;
try {
  const data = fs.readFileSync(boundaryPath, 'utf8');
  const geo = JSON.parse(data);
  // Assume FeatureCollection with a single Polygon feature.
  punePolygon = turf.feature(geo.features[0].geometry);
} catch (e) {
  console.error('⚠️ Unable to load Pune boundary GeoJSON:', e);
}

/**
 * Returns true if the supplied latitude/longitude lies inside the Pune polygon.
 * @param {{ latitude: number, longitude: number }} coord
 * @returns {boolean}
 */
function isInsidePune({ latitude, longitude }) {
  if (!punePolygon) return false;
  const point = turf.point([longitude, latitude]); // GeoJSON expects [lon, lat]
  return turf.booleanPointInPolygon(point, punePolygon);
}

module.exports = { isInsidePune };
