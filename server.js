/**
 * Holiday Packing App - Server
 * Built with Fastify + Handlebars
 */

const path = require("path");
const fs = require("fs");

const fastify = require("fastify")({
  logger: false,
});

// Plugins
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});
fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Register Handlebars helpers
const Handlebars = require("handlebars");

Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

Handlebars.registerHelper("json", function (context) {
  return JSON.stringify(context);
});

Handlebars.registerHelper("increment", function (value) {
  return parseInt(value) + 1;
});

Handlebars.registerHelper("capitalize", function (str) {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
});

Handlebars.registerHelper("contains", function (arr, value) {
  if (!arr || !Array.isArray(arr)) return false;
  return arr.includes(value);
});

// Load data files
const packingData = require("./src/packing-data.json");
const travelAdvice = require("./src/travel-advice.json");
const documentsData = require("./src/documents-data.json");
const destinationAdvice = require("./src/destination-advice.json");
const travelRequirements = require("./src/travel-requirements.json");
const { getWeather } = require("./src/weather");

const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// User data persistence
const USER_DATA_FILE = path.join(__dirname, ".data", "user-items.json");

function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(USER_DATA_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error loading user data:", e.message);
  }
  return {};
}

function saveUserData(data) {
  try {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving user data:", e.message);
  }
}

// Generate packing list based on trip parameters
function generatePackingList(trip) {
  const items = [];
  const addedItems = new Set();

  function addItems(list, category) {
    if (!list) return;
    list.forEach((item) => {
      if (!addedItems.has(item)) {
        addedItems.add(item);
        items.push({ name: item, category: category, checked: false });
      }
    });
  }

  // Always add essentials
  addItems(packingData.essentials, "Essentials");

  // Add by destination
  if (packingData.byDestination[trip.destination]) {
    addItems(
      packingData.byDestination[trip.destination],
      "Destination: " +
        trip.destination.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  // Add by objective
  if (packingData.byObjective[trip.objective]) {
    addItems(
      packingData.byObjective[trip.objective],
      "Trip Type: " +
        trip.objective.replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  // Add by transport
  if (packingData.byTransport[trip.transport]) {
    addItems(
      packingData.byTransport[trip.transport],
      "Transport: " +
        trip.transport.replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  // Add by duration
  let durationKey = "short";
  if (trip.duration > 7) durationKey = "long";
  else if (trip.duration > 3) durationKey = "medium";

  if (packingData.byDuration[durationKey] && packingData.byDuration[durationKey].extras.length) {
    addItems(
      packingData.byDuration[durationKey].extras,
      "Duration (" + packingData.byDuration[durationKey].label + ")"
    );
  }

  // Clothing quantity note
  const multiplier = packingData.byDuration[durationKey].clothingMultiplier;
  if (multiplier > 1) {
    const clothingNote = `Pack ${Math.ceil(trip.duration * 0.7)} tops and ${Math.ceil(trip.duration * 0.5)} bottoms (or plan to do laundry)`;
    if (!addedItems.has(clothingNote)) {
      addedItems.add(clothingNote);
      items.push({ name: clothingNote, category: "Clothing Guide", checked: false });
    }
  }

  return items;
}

// Generate travel advice (with destination-specific tips)
function generateAdvice(trip, weatherLocation) {
  const advice = [...travelAdvice.general];

  if (travelAdvice.byDestination[trip.destination]) {
    advice.push(...travelAdvice.byDestination[trip.destination]);
  }
  if (travelAdvice.byTransport[trip.transport]) {
    advice.push(...travelAdvice.byTransport[trip.transport]);
  }
  if (travelAdvice.byObjective[trip.objective]) {
    advice.push(...travelAdvice.byObjective[trip.objective]);
  }

  // Add destination-specific advice based on custom destination or geocoded location
  const specificAdvice = getDestinationSpecificAdvice(trip, weatherLocation);
  if (specificAdvice) {
    advice.push(...specificAdvice.tips);
  }

  return advice;
}

// Look up destination-specific advice from the database
function getDestinationSpecificAdvice(trip, weatherLocation) {
  const searchTerms = [];

  // Build search terms from custom destination and geocoded location
  if (trip.customDestination) {
    searchTerms.push(trip.customDestination.toLowerCase().trim());
  }
  if (weatherLocation) {
    if (weatherLocation.country) searchTerms.push(weatherLocation.country.toLowerCase());
    if (weatherLocation.name) searchTerms.push(weatherLocation.name.toLowerCase());
  }

  // Try to match country in our database
  for (const term of searchTerms) {
    for (const [country, data] of Object.entries(destinationAdvice.countries)) {
      if (term.includes(country) || country.includes(term)) {
        return data;
      }
    }
  }

  // Fallback: try to match by region using the geocoded location
  if (weatherLocation) {
    const tz = (weatherLocation.timezone || "").toLowerCase();
    if (tz.includes("europe")) return { tips: destinationAdvice.fallbackByRegion.europe };
    if (tz.includes("asia")) return { tips: destinationAdvice.fallbackByRegion.asia };
    if (tz.includes("america")) return { tips: destinationAdvice.fallbackByRegion.americas };
    if (tz.includes("africa")) return { tips: destinationAdvice.fallbackByRegion.africa };
    if (tz.includes("australia") || tz.includes("pacific")) return { tips: destinationAdvice.fallbackByRegion.oceania };
  }

  return null;
}

// Get destination info (currency, language, plug type, etc.)
function getDestinationInfo(trip, weatherLocation) {
  const searchTerms = [];
  if (trip.customDestination) searchTerms.push(trip.customDestination.toLowerCase().trim());
  if (weatherLocation && weatherLocation.country) searchTerms.push(weatherLocation.country.toLowerCase());

  for (const term of searchTerms) {
    for (const [country, data] of Object.entries(destinationAdvice.countries)) {
      if (term.includes(country) || country.includes(term)) {
        return {
          country: country.replace(/\b\w/g, (c) => c.toUpperCase()),
          currency: data.currency,
          language: data.language,
          plugType: data.plugType,
          emergency: data.emergency,
        };
      }
    }
  }
  return null;
}

// Generate document requirements (country-pair aware)
function generateDocuments(trip, destinationCountryKey) {
  const docs = [];

  // Always-needed documents
  docs.push(...documentsData.always);

  // If we have departure + destination country info, use country-pair requirements
  const departure = travelRequirements.countries[trip.departureCountry];
  const entryReqs = getEntryRequirements(trip.departureCountry, destinationCountryKey);

  if (entryReqs) {
    // Use the country-pair specific documents
    docs.push(...entryReqs.documents);
  } else if (trip.international === "yes") {
    // Fallback to generic international/domestic
    docs.push(...documentsData.international);
  } else {
    docs.push(...documentsData.domestic);
  }

  // Transport-specific documents
  if (documentsData.byTransport[trip.transport]) {
    documentsData.byTransport[trip.transport].forEach((docName) => {
      docs.push({ name: docName, description: "", icon: "document" });
    });
  }

  // Deduplicate by name
  const seen = new Set();
  return docs.filter((doc) => {
    if (seen.has(doc.name)) return false;
    seen.add(doc.name);
    return true;
  });
}

// Determine entry requirements based on departure → destination country pair
function getEntryRequirements(departureKey, destinationCountryKey) {
  if (!departureKey) return null;

  const departure = travelRequirements.countries[departureKey];
  if (!departure) return null;

  // Same country = domestic
  if (departureKey === destinationCountryKey) return null;

  // If no destination country detected, can't do pair matching
  if (!destinationCountryKey) return null;

  const destination = travelRequirements.countries[destinationCountryKey];
  const depGroup = departure.visaGroup;
  const destGroup = destination ? destination.visaGroup : null;

  // Build the requirement lookup key
  const reqs = travelRequirements.entryRequirements;

  // EU → EU
  if (depGroup === "eu" && destGroup === "eu") return reqs.eu_to_eu;
  // EU → Schengen (Switzerland, Norway, Iceland)
  if (depGroup === "eu" && destGroup === "schengen") return reqs.eu_to_schengen;
  // Schengen → EU (same rules)
  if (depGroup === "schengen" && destGroup === "eu") return reqs.eu_to_eu;
  // Schengen → Schengen
  if (depGroup === "schengen" && destGroup === "schengen") return reqs.eu_to_schengen;

  // EU/Schengen → UK
  if ((depGroup === "eu" || depGroup === "schengen") && destGroup === "uk") return reqs.eu_to_uk;
  // EU/Schengen → US
  if ((depGroup === "eu" || depGroup === "schengen") && destGroup === "us") return reqs.eu_to_us;
  // EU/Schengen → Canada
  if ((depGroup === "eu" || depGroup === "schengen") && destGroup === "canada") return reqs.eu_to_canada;
  // EU/Schengen → Australia
  if ((depGroup === "eu" || depGroup === "schengen") && destGroup === "australia") return reqs.eu_to_australia;
  // EU/Schengen → Japan
  if ((depGroup === "eu" || depGroup === "schengen") && destGroup === "japan") return reqs.eu_to_japan;
  // EU/Schengen → other
  if (depGroup === "eu" || depGroup === "schengen") return reqs.eu_to_other;

  // US → EU
  if (depGroup === "us" && (destGroup === "eu" || destGroup === "schengen")) return reqs.us_to_eu;
  // US → UK
  if (depGroup === "us" && destGroup === "uk") return reqs.us_to_uk;

  // UK → EU
  if (depGroup === "uk" && (destGroup === "eu" || destGroup === "schengen")) return reqs.uk_to_eu;

  // Generic international fallback
  return reqs.generic_international;
}

// Determine plug adapter needs by comparing departure and destination plug types
function getPlugAdapterInfo(departureKey, destinationInfo) {
  if (!departureKey || !destinationInfo) return null;

  const departure = travelRequirements.countries[departureKey];
  if (!departure) return null;

  const depPlugs = departure.plugType.split("/").map((p) => p.trim());
  const destPlugStr = destinationInfo.plugType || "";
  // Extract plug type letters from destination (e.g., "Type C/E (European two-pin)" → ["C", "E"])
  const destPlugs = destPlugStr
    .replace(/Type\s*/i, "")
    .replace(/\(.*\)/, "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  // Check if any plug types overlap
  const compatible = depPlugs.some((p) => destPlugs.includes(p));

  if (compatible) {
    return {
      needed: false,
      message: `Your ${departure.label} plugs (Type ${departure.plugType}) are compatible with the destination. No adapter needed!`,
    };
  }

  const adapterDesc = travelRequirements.plugAdapters[departure.plugType] || departure.plugType;
  return {
    needed: true,
    message: `You need a plug adapter! ${departure.label} uses Type ${departure.plugType} (${adapterDesc}), but the destination uses ${destPlugStr}. Bring a travel adapter or universal adapter.`,
    fromPlug: departure.plugType,
    toPlug: destPlugStr,
  };
}

// Get driving side warning
function getDrivingSideWarning(departureKey, destinationCountryKey) {
  if (!departureKey || !destinationCountryKey) return null;

  const departure = travelRequirements.countries[departureKey];
  const destination = travelRequirements.countries[destinationCountryKey];
  if (!departure || !destination) return null;
  if (departure.drivingSide === destination.drivingSide) return null;

  const destSide = destination.drivingSide;
  return `Driving side difference: you're used to driving on the ${departure.drivingSide}, but ${destination.label} drives on the ${destSide}. Take extra care at intersections and roundabouts!`;
}

// Match destination country key from geocoded location or custom destination
function matchDestinationCountry(trip, weatherLocation) {
  const searchTerms = [];
  if (trip.customDestination) searchTerms.push(trip.customDestination.toLowerCase().trim());
  if (weatherLocation && weatherLocation.country) searchTerms.push(weatherLocation.country.toLowerCase());

  // Search in travel-requirements countries
  for (const term of searchTerms) {
    for (const [key, data] of Object.entries(travelRequirements.countries)) {
      const label = data.label.toLowerCase();
      if (term.includes(label) || label.includes(term)) {
        return key;
      }
    }
  }

  // Also check destination-advice countries (they use different key format)
  for (const term of searchTerms) {
    for (const country of Object.keys(destinationAdvice.countries)) {
      if (term.includes(country) || country.includes(term)) {
        // Convert destination-advice key format to travel-requirements key format
        const reqKey = country.replace(/ /g, "_");
        if (travelRequirements.countries[reqKey]) return reqKey;
      }
    }
  }

  return null;
}

// Weight estimation helper
function estimateWeight(items) {
  // Rough weight estimates in kg per item category
  const weights = {
    Essentials: 0.2,
    default: 0.3,
  };
  let total = 0;
  items.forEach((item) => {
    total += weights[item.category] || weights.default;
  });
  return Math.round(total * 10) / 10;
}

// Detect suggested activities based on weather + destination
function detectSuggestedActivities(trip, weather) {
  const suggestions = [];
  const userObjective = trip.objective;
  const destination = trip.destination;
  const weatherData = weather ? weather.forecast : null;
  const summary = weatherData ? weatherData.summary : null;

  // Skiing: cold temps + mountain destination, or snow in forecast
  if (userObjective !== "skiing") {
    const hasSnow = weatherData && weatherData.days.some((d) => d.icon === "snow");
    const isColdMountain = destination === "mountain" && summary && summary.avgHigh < 5;
    const isColdClimate = destination === "cold_climate" && summary && summary.avgHigh < 5;
    if (hasSnow || isColdMountain || isColdClimate) {
      suggestions.push({
        activity: "skiing",
        label: "Skiing / Winter Sports",
        reason: hasSnow
          ? "Snow is in the forecast -- looks like a great time for skiing!"
          : "Cold mountain conditions detected -- you might want skiing gear.",
      });
    }
  }

  // Water sports: warm + beach/coastal/tropical
  if (userObjective !== "water_sports") {
    const isWarmCoastal =
      (destination === "beach" || destination === "tropical") &&
      (!summary || summary.avgHigh > 20);
    if (isWarmCoastal) {
      suggestions.push({
        activity: "water_sports",
        label: "Water Sports",
        reason: "Warm coastal destination -- perfect conditions for water activities!",
      });
    }
  }

  // Hiking: mountain/countryside + moderate or warm temps
  if (userObjective !== "hiking") {
    const isHikingTerrain = destination === "mountain" || destination === "countryside";
    const notFreezing = !summary || summary.avgHigh > 5;
    if (isHikingTerrain && notFreezing) {
      suggestions.push({
        activity: "hiking",
        label: "Hiking",
        reason:
          destination === "mountain"
            ? "Mountain destination with good conditions -- hiking gear recommended!"
            : "Countryside destination -- great for hiking and long walks!",
      });
    }
  }

  // Cycling: city/countryside + dry + moderate temps
  if (userObjective !== "cycling") {
    const isCycleFriendly = destination === "city" || destination === "countryside";
    const isDry = !summary || summary.rainyDays <= 2;
    const isModerate = !summary || (summary.avgHigh > 10 && summary.avgHigh < 35);
    if (isCycleFriendly && isDry && isModerate) {
      suggestions.push({
        activity: "cycling",
        label: "Cycling",
        reason: "Dry conditions and pleasant temperatures -- ideal for cycling!",
      });
    }
  }

  return suggestions;
}

// ============ ROUTES ============

// Home page - trip setup form
fastify.get("/", function (request, reply) {
  const userData = loadUserData();
  const username = request.query.user || "";
  const userItems = username && userData[username] ? userData[username] : [];

  return reply.view("/src/pages/index.hbs", {
    seo: seo,
    username: username,
    hasUserItems: userItems.length > 0,
    savedItemCount: userItems.length,
  });
});

// Generate packing list
fastify.post("/pack", async function (request, reply) {
  const body = request.body;

  const trip = {
    destination: body.destination || "city",
    duration: parseInt(body.duration) || 3,
    maxWeight: parseFloat(body.maxWeight) || 23,
    transport: body.transport || "plane",
    objective: body.objective || "leisure",
    international: body.international || "no",
    customDestination: body.customDestination || "",
    username: body.username || "",
    departureCountry: body.departureCountry || "",
  };

  // Fetch weather forecast for the destination (non-blocking, graceful failure)
  const weatherQuery = trip.customDestination || trip.destination.replace(/_/g, " ");
  const weather = await getWeather(weatherQuery, trip.duration);
  const weatherLocation = weather ? weather.location : null;

  // Detect suggested activities based on weather + destination
  const suggestedActivities = detectSuggestedActivities(trip, weather);

  // Match destination country for country-pair requirements
  const destinationCountryKey = matchDestinationCountry(trip, weatherLocation);

  // Generate all data
  let packingList = generatePackingList(trip);
  const advice = generateAdvice(trip, weatherLocation);
  const documents = generateDocuments(trip, destinationCountryKey);

  // Add suggested activity items alongside the user's chosen trip type
  const addedItems = new Set(packingList.map((i) => i.name));
  suggestedActivities.forEach((suggestion) => {
    const activityItems = packingData.byObjective[suggestion.activity];
    if (activityItems) {
      activityItems.forEach((itemName) => {
        if (!addedItems.has(itemName)) {
          addedItems.add(itemName);
          packingList.push({
            name: itemName,
            category: "Suggested: " + suggestion.label,
            checked: false,
          });
        }
      });
    }
    // Also add advice for the suggested activity
    if (travelAdvice.byObjective[suggestion.activity]) {
      travelAdvice.byObjective[suggestion.activity].forEach((tip) => {
        if (!advice.includes(tip)) {
          advice.push(tip);
        }
      });
    }
  });

  // Add weather-based packing items
  if (weather && weather.packingItems.length > 0) {
    weather.packingItems.forEach((itemName) => {
      if (!addedItems.has(itemName)) {
        addedItems.add(itemName);
        packingList.push({
          name: itemName,
          category: "Weather-Based Items",
          checked: false,
        });
      }
    });
  }

  const estimatedWeight = estimateWeight(packingList);

  // Add user's remembered items
  const userData = loadUserData();
  const userItems = trip.username && userData[trip.username] ? userData[trip.username] : [];
  if (userItems.length > 0) {
    const existingNames = new Set(packingList.map((i) => i.name));
    userItems.forEach((itemName) => {
      if (!existingNames.has(itemName)) {
        packingList.push({
          name: itemName,
          category: "Your Saved Items",
          checked: false,
        });
      }
    });
  }

  // Group items by category
  const groupedItems = {};
  packingList.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  // Convert to array for Handlebars
  const categories = Object.keys(groupedItems).map((cat) => ({
    name: cat,
    items: groupedItems[cat],
  }));

  // Weight warning
  const overWeight = estimatedWeight > trip.maxWeight;
  const weightWarning = overWeight
    ? `Estimated weight (~${estimatedWeight}kg) exceeds your limit of ${trip.maxWeight}kg. Consider removing non-essential items.`
    : null;

  // Get destination info (currency, language, plug type)
  const destinationInfo = getDestinationInfo(trip, weatherLocation);

  // Country-pair specific info
  const entryReqs = getEntryRequirements(trip.departureCountry, destinationCountryKey);
  const plugAdapter = getPlugAdapterInfo(trip.departureCountry, destinationInfo);
  const drivingSideWarning = getDrivingSideWarning(trip.departureCountry, destinationCountryKey);
  const departureCountryData = travelRequirements.countries[trip.departureCountry] || null;

  // Add plug adapter to packing list if needed
  if (plugAdapter && plugAdapter.needed) {
    const adapterItem = `Travel plug adapter (${plugAdapter.fromPlug} to ${plugAdapter.toPlug})`;
    if (!addedItems.has(adapterItem)) {
      addedItems.add(adapterItem);
      packingList.push({ name: adapterItem, category: "Essentials", checked: false });
      // Update the category in grouped items
      if (groupedItems["Essentials"]) {
        groupedItems["Essentials"].push({ name: adapterItem, category: "Essentials", checked: false });
      }
    }
  }

  // Build weather advice (combines weather-based + destination-specific advice)
  const weatherAdvice = weather ? weather.advice : [];

  return reply.view("/src/pages/packing-list.hbs", {
    seo: seo,
    trip: trip,
    categories: categories,
    totalItems: packingList.length,
    estimatedWeight: estimatedWeight,
    maxWeight: trip.maxWeight,
    overWeight: overWeight,
    weightWarning: weightWarning,
    advice: advice,
    weatherAdvice: weatherAdvice,
    documents: documents,
    username: trip.username,
    hasUserItems: userItems.length > 0,
    weather: weather ? weather.forecast : null,
    weatherLocation: weatherLocation,
    hasWeatherAdvice: weatherAdvice.length > 0,
    destinationInfo: destinationInfo,
    suggestedActivities: suggestedActivities,
    hasSuggestions: suggestedActivities.length > 0,
    entryRequirements: entryReqs,
    hasEntryRequirements: !!entryReqs,
    plugAdapter: plugAdapter,
    hasPlugAdapter: !!plugAdapter,
    drivingSideWarning: drivingSideWarning,
    departureCountry: departureCountryData,
  });
});

// Add custom item (AJAX endpoint)
fastify.post("/api/add-item", function (request, reply) {
  const { itemName, username } = request.body;

  if (!itemName || !itemName.trim()) {
    return reply.code(400).send({ error: "Item name is required" });
  }

  const result = { name: itemName.trim(), category: "Custom Items", checked: false };

  // Save to user's remembered items if username provided
  if (username && username.trim()) {
    const userData = loadUserData();
    if (!userData[username]) {
      userData[username] = [];
    }
    if (!userData[username].includes(itemName.trim())) {
      userData[username].push(itemName.trim());
      saveUserData(userData);
    }
  }

  return reply.send(result);
});

// Remove a saved user item
fastify.post("/api/remove-saved-item", function (request, reply) {
  const { itemName, username } = request.body;

  if (!username || !itemName) {
    return reply.code(400).send({ error: "Username and item name are required" });
  }

  const userData = loadUserData();
  if (userData[username]) {
    userData[username] = userData[username].filter((i) => i !== itemName.trim());
    saveUserData(userData);
  }

  return reply.send({ success: true });
});

// Get user's saved items
fastify.get("/api/user-items/:username", function (request, reply) {
  const username = request.params.username;
  const userData = loadUserData();
  const items = userData[username] || [];
  return reply.send({ items: items });
});

// Run server
fastify.listen(
  { port: process.env.PORT || 3000, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Holiday Packing App is listening on ${address}`);
  }
);
