/**
 * Default coordinates for Vietnamese regions/provinces
 * Used as fallbacks for Market Map visualization.
 */
export const REGION_COORDS = {
  // Major Cities
  "Hà Nội": [21.0285, 105.8542],
  "TP.HCM": [10.7626, 106.6602],
  "Đà Nẵng": [16.0544, 108.2022],
  "Hải Phòng": [20.8449, 106.6881],
  "Cần Thơ": [10.0452, 105.7469],
  
  // General Regions
  "Miền Bắc": [21.0278, 105.8342],
  "North": [21.0278, 105.8342],
  "Miền Trung": [16.0544, 108.2022],
  "Central": [16.0544, 108.2022],
  "Miền Nam": [10.8231, 106.6297],
  "South": [10.8231, 106.6297],
  "Miền Tây": [10.0452, 105.7469],
  "Miền Đông": [10.9574, 106.8427],

  // Default Center of Vietnam
  "Default": [16.0471, 108.2062]
};

/**
 * Adds a small random jitter to coordinates to prevent markers from stacking
 * @param {Array} coords - [lat, lng]
 * @param {number} amount - Jitter factor
 * @returns {Array} - [lat, lng]
 */
export const addJitter = (coords, amount = 0.05) => {
  if (!coords) return REGION_COORDS["Default"];
  const lat = coords[0] + (Math.random() - 0.5) * amount;
  const lng = coords[1] + (Math.random() - 0.5) * amount;
  return [lat, lng];
};

/**
 * Returns coordinates based on a region name or string
 * @param {string} regionStr 
 * @returns {Array}
 */
export const getCoordsByRegion = (regionStr) => {
  if (!regionStr) return REGION_COORDS["Default"];
  
  // Look for exact matches
  if (REGION_COORDS[regionStr]) return REGION_COORDS[regionStr];

  // Look for partial matches (e.g. "Hà Nội - Gia Lâm")
  for (const [name, coords] of Object.entries(REGION_COORDS)) {
    if (regionStr.toLowerCase().includes(name.toLowerCase())) {
      return coords;
    }
  }

  return REGION_COORDS["Default"];
};
