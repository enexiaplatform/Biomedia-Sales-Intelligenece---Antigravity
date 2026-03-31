/**
 * Utility for estimating coordinates based on Vietnam regions
 * for accounts that do not have explicit lat/lng data.
 */

const REGION_COORDS = {
  "Hà Nội": [21.0285, 105.8542],
  "TP.HCM": [10.8231, 106.6297],
  "Miền Trung": [16.0544, 108.2022],
  "Miền Nam": [10.0452, 105.7469],
  "Miền Bắc": [20.8449, 106.6881],
  "default": [14.0583, 108.2772] // Center of Vietnam
};

export function getEstimatedCoords(region, id) {
  const base = REGION_COORDS[region] || REGION_COORDS["default"];
  
  // Use id as seed for consistent jitter
  const seed = id ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random();
  const jitterLat = (Math.sin(seed) * 0.05); // ~5km range
  const jitterLng = (Math.cos(seed) * 0.05);

  return [base[0] + jitterLat, base[1] + jitterLng];
}

export const VIETNAM_BOUNDS = [
  [8.18, 102.14], // Southwest
  [23.39, 109.46] // Northeast
];
