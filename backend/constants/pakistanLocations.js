/** Province keys + city lists for PK doctor registration */
const PROVINCES = [
  { key: "punjab", label: "Punjab" },
  { key: "sindh", label: "Sindh" },
  { key: "kpk", label: "Khyber Pakhtunkhwa (KP)" },
  { key: "balochistan", label: "Balochistan" },
  { key: "gilgit_baltistan", label: "Gilgit-Baltistan" },
  { key: "azad_kashmir", label: "Azad Kashmir" },
];

const CITIES_BY_PROVINCE = {
  punjab: [
    "Lahore",
    "Faisalabad",
    "Rawalpindi",
    "Multan",
    "Gujranwala",
    "Sialkot",
    "Bahawalpur",
    "Sargodha",
    "Sheikhupura",
    "Rahim Yar Khan",
    "Jhelum",
    "Sahiwal",
    "Okara",
    "Kasur",
    "Attock",
    "Mandi Bahauddin",
    "Chiniot",
  ],
  sindh: [
    "Karachi",
    "Hyderabad",
    "Sukkur",
    "Larkana",
    "Nawabshah",
    "Mirpur Khas",
    "Jacobabad",
    "Khairpur",
  ],
  kpk: ["Peshawar", "Mardan", "Abbottabad", "Swat", "Kohat", "Bannu", "Dera Ismail Khan"],
  balochistan: ["Quetta", "Gwadar", "Turbat", "Khuzdar", "Sibi", "Zhob"],
  gilgit_baltistan: ["Gilgit", "Skardu", "Hunza", "Diamer"],
  azad_kashmir: ["Muzaffarabad", "Mirpur", "Kotli", "Rawalakot"],
};

const PROVINCE_KEYS = new Set(PROVINCES.map((p) => p.key));

const isValidCityForProvince = (provinceKey, cityName) => {
  const cities = CITIES_BY_PROVINCE[provinceKey];
  if (!cities || !cityName) return false;
  return cities.includes(String(cityName).trim());
};

module.exports = {
  PROVINCES,
  CITIES_BY_PROVINCE,
  PROVINCE_KEYS,
  isValidCityForProvince,
};
