import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 screenshots and voice notes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-memory data store with realistic initial mock reports
let reportsStore: any[] = [
  {
    id: "rep-9821-a",
    ticketNumber: "REP-1042",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    title: "Checkout payment modal freezes on card confirmation",
    description: "When pressing 'Pay $49.00', the spinner spins indefinitely and the 3D Secure frame fails to render on mobile Safari.",
    stepsToReproduce: "1. Add Pro plan to cart\n2. Fill card credentials\n3. Click Pay\n4. Modal stays locked and no receipt is generated",
    category: "billing",
    priority: "critical",
    status: "in_progress",
    userEmail: "sarah.connor@example.com",
    userName: "Sarah Connor",
    deviceInfo: {
      browser: "Mobile Safari 17.4",
      os: "iOS 17.4.1",
      screenResolution: "393x852",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)",
      pageUrl: "https://app.store.com/checkout",
      language: "en-US"
    },
    screenshot: {
      dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg width="600" height="340" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="340" fill="#0f172a"/>
          <rect x="50" y="40" width="500" height="260" rx="12" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
          <text x="75" y="85" fill="#f87171" font-family="sans-serif" font-size="16" font-weight="bold">⚠️ Error 504: Gateway Timeout</text>
          <text x="75" y="125" fill="#94a3b8" font-family="sans-serif" font-size="13">Card Tokenization: [Verified]</text>
          <text x="75" y="150" fill="#94a3b8" font-family="sans-serif" font-size="13">Webhook Ack: Pending 3DS Callback (Frame blocked)</text>
          <rect x="75" y="190" width="200" height="40" rx="6" fill="#3b82f6"/>
          <text x="110" y="215" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">Processing...</text>
        </svg>
      `),
      filename: "checkout_freeze_safari.png",
      size: 42800,
      mimeType: "image/png",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    voiceNote: {
      dataUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      durationSeconds: 14,
      mimeType: "audio/webm",
      filename: "sarah_voice_note.webm",
      recordedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      transcription: "Hi, I just tried paying for the annual license twice and both times my screen went grey and locked up. My bank says the charge is pending, please help fix this quickly!"
    },
    aiTriage: {
      summary: "Critical billing freeze occurring during 3D Secure modal trigger on mobile Safari iOS 17.4.",
      estimatedSeverity: "critical",
      suggestedAction: "Check Stripe 3DS iframe permissions-policy and CSP headers on mobile viewport.",
      keyFactors: ["Payment gateway hang", "Pending charge risk", "Mobile Safari compatibility"],
      sentiment: "urgent"
    },
    adminNotes: [
      {
        id: "note-1",
        author: "DevOps Engineer",
        text: "Checking Stripe webhook logs and CSP headers right now.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      }
    ],
    tags: ["billing", "safari", "payment-blocker"]
  },
  {
    id: "rep-4319-b",
    ticketNumber: "REP-1041",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    title: "Dark mode contrast issue on Analytics table headers",
    description: "The column headers in the export analytics table are dark grey text on dark navy background, making them almost impossible to read in dark theme.",
    stepsToReproduce: "1. Switch theme to Dark Mode\n2. Open /dashboard/analytics\n3. Inspect table column headers",
    category: "ui_glitch",
    priority: "medium",
    status: "under_review",
    userEmail: "alex.chen@designers.org",
    userName: "Alex Chen",
    deviceInfo: {
      browser: "Chrome 122.0",
      os: "macOS Sonoma 14.3",
      screenResolution: "2560x1440",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      pageUrl: "https://app.store.com/dashboard/analytics",
      language: "en-US"
    },
    screenshot: {
      dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg width="600" height="240" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="240" fill="#090d16"/>
          <rect x="40" y="30" width="520" height="40" fill="#0f172a" stroke="#1e293b"/>
          <text x="60" y="55" fill="#334155" font-family="sans-serif" font-size="13">Date Range</text>
          <text x="200" y="55" fill="#334155" font-family="sans-serif" font-size="13">Impressions</text>
          <text x="360" y="55" fill="#334155" font-family="sans-serif" font-size="13">CTR %</text>
          <text x="480" y="55" fill="#334155" font-family="sans-serif" font-size="13">Revenue</text>
          <text x="60" y="105" fill="#e2e8f0" font-family="sans-serif" font-size="13">Oct 12 - Oct 19</text>
          <text x="200" y="105" fill="#e2e8f0" font-family="sans-serif" font-size="13">142,500</text>
          <text x="360" y="105" fill="#e2e8f0" font-family="sans-serif" font-size="13">4.82%</text>
          <text x="480" y="105" fill="#e2e8f0" font-family="sans-serif" font-size="13">$12,490</text>
        </svg>
      `),
      filename: "dark_mode_contrast.png",
      size: 21500,
      mimeType: "image/png",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    },
    adminNotes: [],
    tags: ["ui", "a11y", "dark-mode"]
  }
];

// Lazy Gemini SDK client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Fetch all reports
app.get("/api/reports", (req, res) => {
  res.json({ reports: reportsStore });
});

// 3. Create a new report
app.post("/api/reports", async (req, res) => {
  try {
    const reportData = req.body;
    const count = reportsStore.length + 1043;
    const newReport = {
      ...reportData,
      id: "rep-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      ticketNumber: `REP-${count}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: reportData.status || "pending",
      adminNotes: reportData.adminNotes || [],
      tags: reportData.tags || [reportData.category || "general"]
    };

    reportsStore.unshift(newReport);
    res.status(201).json({ success: true, report: newReport });
  } catch (error: any) {
    console.error("Error saving report:", error);
    res.status(500).json({ error: error.message || "Failed to create report" });
  }
});

// 4. Update a report (status, admin notes, tags)
app.patch("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = reportsStore.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Report not found" });
  }

  reportsStore[index] = {
    ...reportsStore[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, report: reportsStore[index] });
});

// 5. Delete a report
app.delete("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  reportsStore = reportsStore.filter(r => r.id !== id);
  res.json({ success: true, message: "Report deleted" });
});

// 6. AI Triage with Gemini (with resilience for transient 503 / demand spikes)
app.post("/api/gemini/triage", async (req, res) => {
  const { title = "", description = "", category = "general", priority = "medium" } = req.body;
  const ai = getGeminiClient();

  // Intelligent heuristic fallback generator if Gemini is offline or experiencing temporary capacity spikes
  const generateHeuristicTriage = (reason = "Automated rules triage") => {
    const textLower = `${title} ${description}`.toLowerCase();
    let severity = priority || "medium";
    let action = "Inspect client device telemetry and logs in the Admin Queue.";
    const keyFactors = [`Category: ${category}`, reason];

    if (textLower.includes("crash") || textLower.includes("freeze") || textLower.includes("broke") || textLower.includes("fatal")) {
      severity = "high";
      action = "Replicate state on matching OS/browser and check unhandled exception logs.";
      keyFactors.push("High failure impact");
    } else if (textLower.includes("payment") || textLower.includes("charge") || textLower.includes("invoice") || textLower.includes("card")) {
      severity = "critical";
      action = "Verify payment gateway status and customer billing transaction state.";
      keyFactors.push("Direct financial transaction impact");
    } else if (textLower.includes("slow") || textLower.includes("lag") || textLower.includes("timeout")) {
      severity = "medium";
      action = "Profile asset loading times and database latency metrics.";
      keyFactors.push("Performance degradation");
    } else if (textLower.includes("color") || textLower.includes("ui") || textLower.includes("button") || textLower.includes("align")) {
      severity = "low";
      action = "Review CSS styling rules and design layout tokens across viewports.";
      keyFactors.push("Visual styling imperfection");
    }

    let sentiment = "neutral";
    if (textLower.includes("urgent") || textLower.includes("asap") || textLower.includes("fix this") || textLower.includes("please help")) {
      sentiment = "urgent";
    } else if (textLower.includes("frustrat") || textLower.includes("annoy") || textLower.includes("hate")) {
      sentiment = "frustrated";
    } else if (textLower.includes("would be great") || textLower.includes("feature") || textLower.includes("suggest")) {
      sentiment = "constructive";
    }

    return {
      summary: title ? `${title}: ${description.substring(0, 100)}` : (description.substring(0, 120) || "Issue report filed"),
      estimatedSeverity: severity,
      suggestedAction: action,
      keyFactors: keyFactors.slice(0, 4),
      sentiment
    };
  };

  if (!ai) {
    return res.json({ triage: generateHeuristicTriage("Built-in triage heuristics") });
  }

  const prompt = `You are an elite QA and Bug Triage AI for software engineering teams.
Analyze this user bug report:
Title: "${title}"
Description: "${description}"
Category: "${category}"
Claimed Priority: "${priority}"

Provide a clean JSON analysis with:
- summary (concise 1-2 sentence executive summary of the issue)
- estimatedSeverity (one of "low", "medium", "high", "critical")
- suggestedAction (concrete 1 sentence recommendation for developers)
- keyFactors (array of 2-4 key technical factors or failure vectors)
- sentiment (one of "frustrated", "urgent", "neutral", "constructive")
`;

  const triageSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      estimatedSeverity: { type: Type.STRING },
      suggestedAction: { type: Type.STRING },
      keyFactors: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      sentiment: { type: Type.STRING }
    },
    required: ["summary", "estimatedSeverity", "suggestedAction", "keyFactors", "sentiment"]
  };

  // Attempt 1: Standard model
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: triageSchema
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ triage: parsed });
  } catch (primaryErr: any) {
    console.warn("Primary Gemini model busy or unavailable, attempting fallback model:", primaryErr?.message || primaryErr);

    // Attempt 2: Fallback model if primary has temporary 503 capacity spike
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: triageSchema
        }
      });

      const parsedFallback = JSON.parse(fallbackResponse.text || "{}");
      return res.json({ triage: parsedFallback });
    } catch (fallbackErr: any) {
      console.warn("Fallback model also experiencing high demand, applying heuristic QA triage:", fallbackErr?.message || fallbackErr);
      return res.json({ triage: generateHeuristicTriage("Dynamic heuristics fallback") });
    }
  }
});

// ----------------------------------------------------
// SERVER START & VITE MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
