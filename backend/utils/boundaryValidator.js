const fs = require("fs");
const path = require("path");

const boundaryPath = path.join(
  __dirname,
  "../../frontend/public/boundaries/hinjavadi.geojson"
);

let boundary;

const loadBoundary = () => {
  if (!boundary) {
    boundary = JSON.parse(fs.readFileSync(boundaryPath, "utf8"));
  }
  return boundary;
};

const pointInRing = ([longitude, latitude], ring) => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (point, coordinates) =>
  pointInRing(point, coordinates[0]) &&
  !coordinates.slice(1).some((ring) => pointInRing(point, ring));

const isInsideHinjawadiBoundary = (latitude, longitude) => {
  const geoJson = loadBoundary();
  const point = [Number(longitude), Number(latitude)];
  return geoJson.features.some((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return false;
    if (geometry.type === "Polygon") {
      return pointInPolygon(point, geometry.coordinates);
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
    }
    return false;
  });
};

module.exports = { isInsideHinjawadiBoundary };
