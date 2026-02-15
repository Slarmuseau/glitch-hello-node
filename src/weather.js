/**
 * Weather Service - Uses Open-Meteo API (free, no API key needed)
 * Geocodes destination name -> fetches weather forecast
 */

// Weather code to description mapping (WMO codes)
const weatherDescriptions = {
  0: { text: "Clear sky", icon: "sun" },
  1: { text: "Mainly clear", icon: "sun" },
  2: { text: "Partly cloudy", icon: "cloud-sun" },
  3: { text: "Overcast", icon: "cloud" },
  45: { text: "Foggy", icon: "fog" },
  48: { text: "Depositing rime fog", icon: "fog" },
  51: { text: "Light drizzle", icon: "drizzle" },
  53: { text: "Moderate drizzle", icon: "drizzle" },
  55: { text: "Dense drizzle", icon: "drizzle" },
  61: { text: "Slight rain", icon: "rain" },
  63: { text: "Moderate rain", icon: "rain" },
  65: { text: "Heavy rain", icon: "heavy-rain" },
  66: { text: "Light freezing rain", icon: "rain" },
  67: { text: "Heavy freezing rain", icon: "heavy-rain" },
  71: { text: "Slight snow", icon: "snow" },
  73: { text: "Moderate snow", icon: "snow" },
  75: { text: "Heavy snow", icon: "snow" },
  77: { text: "Snow grains", icon: "snow" },
  80: { text: "Slight showers", icon: "rain" },
  81: { text: "Moderate showers", icon: "rain" },
  82: { text: "Violent showers", icon: "heavy-rain" },
  85: { text: "Slight snow showers", icon: "snow" },
  86: { text: "Heavy snow showers", icon: "snow" },
  95: { text: "Thunderstorm", icon: "storm" },
  96: { text: "Thunderstorm with slight hail", icon: "storm" },
  99: { text: "Thunderstorm with heavy hail", icon: "storm" },
};

// Weather icon to emoji mapping for the template
const weatherEmojis = {
  sun: "\u2600\uFE0F",
  "cloud-sun": "\u26C5",
  cloud: "\u2601\uFE0F",
  fog: "\uD83C\uDF2B\uFE0F",
  drizzle: "\uD83C\uDF26\uFE0F",
  rain: "\uD83C\uDF27\uFE0F",
  "heavy-rain": "\uD83C\uDF27\uFE0F",
  snow: "\u2744\uFE0F",
  storm: "\u26C8\uFE0F",
};

/**
 * Geocode a destination name to lat/lon using Open-Meteo
 */
async function geocodeDestination(destinationName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destinationName)}&count=1&language=en`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country || "",
    admin1: result.admin1 || "",
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone || "auto",
  };
}

/**
 * Fetch weather forecast from Open-Meteo
 */
async function fetchForecast(latitude, longitude, days, timezone) {
  const forecastDays = Math.min(days || 7, 16); // Open-Meteo max 16 days
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode,wind_speed_10m_max` +
    `&timezone=${encodeURIComponent(timezone || "auto")}` +
    `&forecast_days=${forecastDays}`;

  const response = await fetch(url);
  return response.json();
}

/**
 * Format weather data for the template
 */
function formatWeatherData(forecast) {
  const daily = forecast.daily;
  if (!daily || !daily.time) return null;

  const days = daily.time.map((date, i) => {
    const code = daily.weathercode[i];
    const weather = weatherDescriptions[code] || { text: "Unknown", icon: "cloud" };
    const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      date: dayName,
      rawDate: date,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      precipProb: daily.precipitation_probability_max[i] || 0,
      precipSum: Math.round((daily.precipitation_sum[i] || 0) * 10) / 10,
      windMax: Math.round(daily.wind_speed_10m_max[i] || 0),
      description: weather.text,
      icon: weather.icon,
      emoji: weatherEmojis[weather.icon] || "\u2601\uFE0F",
    };
  });

  // Calculate summary stats
  const avgHigh = Math.round(days.reduce((s, d) => s + d.tempMax, 0) / days.length);
  const avgLow = Math.round(days.reduce((s, d) => s + d.tempMin, 0) / days.length);
  const rainyDays = days.filter((d) => d.precipProb > 40).length;
  const maxWind = Math.max(...days.map((d) => d.windMax));

  return {
    days: days,
    summary: {
      avgHigh,
      avgLow,
      rainyDays,
      totalDays: days.length,
      maxWind,
    },
  };
}

/**
 * Generate weather-based packing advice
 */
function generateWeatherAdvice(weatherData, location) {
  const advice = [];
  const { summary, days } = weatherData;

  // Temperature-based advice
  if (summary.avgHigh > 30) {
    advice.push(`It will be hot in ${location.name} (avg high ${summary.avgHigh}\u00B0C). Pack lightweight, breathable clothing and bring plenty of sunscreen.`);
    advice.push("Stay hydrated \u2013 carry a refillable water bottle and drink regularly.");
  } else if (summary.avgHigh > 20) {
    advice.push(`Pleasant temperatures expected in ${location.name} (${summary.avgLow}\u00B0C\u2013${summary.avgHigh}\u00B0C). Pack layers for comfortable days and cooler evenings.`);
  } else if (summary.avgHigh > 10) {
    advice.push(`Cool weather expected in ${location.name} (${summary.avgLow}\u00B0C\u2013${summary.avgHigh}\u00B0C). Bring a warm jacket and layers.`);
  } else {
    advice.push(`Cold weather ahead in ${location.name} (avg low ${summary.avgLow}\u00B0C). Pack thermal layers, warm coat, gloves, and a hat.`);
    advice.push("Consider packing hand warmers and thermal socks for extra comfort.");
  }

  // Rain advice
  if (summary.rainyDays > 0) {
    const rainPct = Math.round((summary.rainyDays / summary.totalDays) * 100);
    advice.push(`Rain is likely on ${summary.rainyDays} of ${summary.totalDays} days (${rainPct}%). Pack a waterproof jacket or umbrella.`);
    if (summary.rainyDays > summary.totalDays / 2) {
      advice.push("With frequent rain expected, waterproof shoes or boots are highly recommended.");
    }
  } else {
    advice.push("No significant rain in the forecast \u2013 great conditions for outdoor activities!");
  }

  // Wind advice
  if (summary.maxWind > 50) {
    advice.push(`Strong winds expected (up to ${summary.maxWind} km/h). Pack a windbreaker and secure loose items.`);
  } else if (summary.maxWind > 30) {
    advice.push("Moderate winds expected \u2013 a light windbreaker could come in handy.");
  }

  // Snow check
  const snowyDays = days.filter((d) => ["snow"].includes(d.icon)).length;
  if (snowyDays > 0) {
    advice.push(`Snow is expected on ${snowyDays} day(s). Pack waterproof boots and warm, insulated clothing.`);
  }

  return advice;
}

/**
 * Generate weather-based packing items
 */
function generateWeatherItems(weatherData) {
  const items = [];
  const { summary, days } = weatherData;

  if (summary.avgHigh > 30) {
    items.push("Sun hat", "SPF 50+ sunscreen", "Sunglasses", "Light breathable clothing", "Refillable water bottle");
  }
  if (summary.avgLow < 5) {
    items.push("Thermal underwear", "Warm gloves", "Winter hat / beanie", "Warm scarf", "Insulated jacket");
  }
  if (summary.rainyDays > 0) {
    items.push("Waterproof jacket / raincoat", "Compact umbrella");
    if (summary.rainyDays > 3) {
      items.push("Waterproof shoes / boots");
    }
  }
  if (summary.maxWind > 40) {
    items.push("Windbreaker jacket");
  }
  const snowyDays = days.filter((d) => d.icon === "snow").length;
  if (snowyDays > 0) {
    items.push("Waterproof boots", "Wool socks", "Hand warmers");
  }

  return items;
}

/**
 * Main function: get weather for a destination
 * Returns null on any failure (graceful degradation)
 */
async function getWeather(destinationName, tripDuration) {
  if (!destinationName || !destinationName.trim()) {
    return null;
  }

  try {
    const location = await geocodeDestination(destinationName.trim());
    if (!location) {
      return null;
    }

    const forecast = await fetchForecast(
      location.latitude,
      location.longitude,
      tripDuration,
      location.timezone
    );

    const weatherData = formatWeatherData(forecast);
    if (!weatherData) {
      return null;
    }

    const weatherAdvice = generateWeatherAdvice(weatherData, location);
    const weatherItems = generateWeatherItems(weatherData);

    return {
      location: location,
      forecast: weatherData,
      advice: weatherAdvice,
      packingItems: weatherItems,
    };
  } catch (err) {
    console.error("Weather API error:", err.message);
    return null;
  }
}

module.exports = { getWeather };
