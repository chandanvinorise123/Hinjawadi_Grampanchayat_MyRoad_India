import * as turf from "@turf/turf";

let hinjavadiBoundary = null;

export const loadHinjavadiBoundary = async () => {
  if (hinjavadiBoundary) {
    return hinjavadiBoundary;
  }

  const response = await fetch(
    "/boundaries/hinjavadi.geojson"
  );

  if (!response.ok) {
    throw new Error("Failed to load Hinjawadi boundary");
  }

  hinjavadiBoundary = await response.json();

  return hinjavadiBoundary;
};

export const isInsideHinjavadi = async (lat, lng) => {
  const boundary = await loadHinjavadiBoundary();

  const point = turf.point([
    Number(lng),
    Number(lat),
  ]);

  return boundary.features.some((feature) =>
    turf.booleanPointInPolygon(point, feature)
  );
};