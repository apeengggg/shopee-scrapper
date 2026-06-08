const CATEGORY_TAGS: Record<string, string[]> = {
  "klinik gigi": ['["amenity"="dentist"]'],
  restoran: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  bengkel: ['["shop"="car_repair"]', '["craft"="mechanic"]'],
  salon: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  laundry: ['["shop"="laundry"]'],
  apotek: ['["amenity"="pharmacy"]'],
  hotel: ['["tourism"="hotel"]', '["tourism"="guest_house"]'],
  toko: ['["shop"]'],
  kantor: ['["office"]']
};

export function categoryToOverpassFilters(category: string) {
  const key = category.trim().toLowerCase();
  return CATEGORY_TAGS[key] ?? [
    `["name"~"${escapeRegex(category)}",i]`,
    `["shop"]`,
    `["amenity"]`,
    `["office"]`,
    `["craft"]`
  ];
}

function escapeRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
