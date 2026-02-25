import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { DocxCleaner } from "./src/services/docxCleaner.ts";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use memory storage for multer
  const upload = multer({ storage: multer.memoryStorage() });

  // Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  if (!supabase) {
    console.warn("Supabase credentials missing. History logging will be disabled.");
  }

  // API routes
  app.post("/api/clean", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const options = {
        removeManualPageBreaks: req.body.removeManualPageBreaks === "true",
        removeTrailingEmptyParagraphs: req.body.removeTrailingEmptyParagraphs === "true",
        removeConsecutiveEmptyParagraphs: req.body.removeConsecutiveEmptyParagraphs === "true",
        normalizeSectionBreaks: req.body.normalizeSectionBreaks === "true",
      };

      const cleaner = new DocxCleaner(req.file.buffer);
      const cleanedBuffer = await cleaner.clean(options);

      // Log to Supabase (optional, don't block response)
      if (supabase) {
        supabase.from('cleaning_history').insert({
          filename: req.file.originalname,
          options: JSON.stringify(options),
          timestamp: new Date().toISOString()
        }).then(({ error }) => {
          if (error) console.error("Supabase logging error:", error);
        });
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="cleaned_${req.file.originalname}"`);
      res.send(cleanedBuffer);
    } catch (error: any) {
      console.error("Cleaning error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      if (!supabase) {
        return res.json([]);
      }

      const { data, error } = await supabase
        .from('cleaning_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
