// Next-Best-Job API – Express versie voor Glitch

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Mock matching logica (later kun je hier ESCO + AI inbouwen)
function mockRecommendations(payload) {
  const { job, skills, ambitions } = payload;

  const safeJob = job || "professioneel";
  const safeSkills =
    Array.isArray(skills) && skills.length
      ? skills
      : ["communicatie", "organisatie", "probleemoplossend denken"];

  const safeAmbitions =
    Array.isArray(ambitions) && ambitions.length
      ? ambitions
      : ["groei en ontwikkeling"];

  const firstAmbition = safeAmbitions[0];

  return [
    {
      title: `Teamcoördinator / coach in jouw omgeving`,
      match: 82,
      why: `Je ervaring als "${safeJob}" en je ambitie rond "${firstAmbition}" wijzen naar een rol met meer verantwoordelijkheid, maar nog dicht bij je huidige praktijk.`,
      matchedSkills: safeSkills.slice(0, 3),
      gaps: ["people leadership", "coachingsvaardigheden", "planning op teamniveau"]
    },
    {
      title: `Projectmedewerker / -manager rond verbetering & innovatie`,
      match: 76,
      why: `Je skills tonen structuur, communicatie en probleemoplossend denken — ideaal voor verbeterprojecten in jouw organisatie of sector.`,
      matchedSkills: safeSkills.slice(1, 4),
      gaps: ["projectmethodologie", "change management", "budgetbeheer"]
    },
    {
      title: `Loopbaan-switch naar sector met meer maatschappelijke impact`,
      match: 70,
      why: `Je ambities wijzen richting meer zingeving. Je kunt je bestaande skills inzetten in een andere sector (zorg, onderwijs, non-profit, duurzaamheid).`,
      matchedSkills: [safeSkills[0]],
      gaps: ["sector-specifieke kennis", "netwerk in nieuwe sector"]
    }
  ];
}

// Health-check
app.get("/", (req, res) => {
  res.send("Next-Best-Job API draait ✅");
});

// Ons hoofd-endpoint
app.post("/api/next-best-job", (req, res) => {
  try {
    const { job, skills, ambitions, notes } = req.body || {};

    if (!job || !Array.isArray(skills) || !skills.length || !Array.isArray(ambitions) || !ambitions.length) {
      return res.status(400).json({
        error: "job (string), skills (array) en ambitions (array) zijn verplicht"
      });
    }

    const payload = { job, skills, ambitions, notes };
    const recs = mockRecommendations(payload);

    res.json(recs);
  } catch (err) {
    console.error("Fout in /api/next-best-job:", err);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Next-Best-Job API luistert op poort ${PORT}`);
});
