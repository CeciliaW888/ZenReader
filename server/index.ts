import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini Client (Server-Side)
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from server environment.");
}

const ai = new GoogleGenerativeAI(apiKey || '');

// Types
interface GenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
}

interface GenerateRequestBody {
    model: string;
    contents: string | Content[];
    config?: {
        systemInstruction?: string;
        tools?: unknown[];
        generationConfig?: GenerationConfig;
    };
}

interface GenerateResponseBody {
    text: string;
    [key: string]: unknown;
}

interface ErrorResponseBody {
    error: string;
    stack?: string;
}

// Health Check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: {
            hasApiKey: !!(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
            nodeEnv: process.env.NODE_ENV,
            version: '1.1.0'
        }
    });
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting - 30 requests per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Allowed models whitelist
const ALLOWED_MODELS: string[] = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
];

// Input validation middleware
const validateGenerateRequest = (
    req: Request<unknown, unknown, GenerateRequestBody>,
    res: Response<ErrorResponseBody>,
    next: NextFunction
): void => {
    const { model, contents, config } = req.body;

    // Validate model
    if (!model || typeof model !== 'string') {
        res.status(400).json({ error: 'Missing or invalid "model" parameter' });
        return;
    }

    if (!ALLOWED_MODELS.includes(model)) {
        res.status(400).json({
            error: `Invalid model "${model}". Allowed: ${ALLOWED_MODELS.join(', ')}`
        });
        return;
    }

    // Validate contents
    if (!contents) {
        res.status(400).json({ error: 'Missing "contents" parameter' });
        return;
    }

    if (typeof contents !== 'string' && !Array.isArray(contents)) {
        res.status(400).json({ error: '"contents" must be a string or array' });
        return;
    }

    // Validate config (optional)
    if (config !== undefined && (typeof config !== 'object' || config === null)) {
        res.status(400).json({ error: '"config" must be an object' });
        return;
    }

    next();
};

app.post(
    '/api/generate',
    apiLimiter,
    validateGenerateRequest,
    async (
        req: Request<unknown, unknown, GenerateRequestBody>,
        res: Response<GenerateResponseBody | ErrorResponseBody>
    ): Promise<void> => {
        try {
            const { model, contents, config } = req.body;
            console.log(`[Proxy] Request for model: ${model}`);

            const generativeModel = ai.getGenerativeModel({
                model,
                systemInstruction: config?.systemInstruction,
                tools: config?.tools as Parameters<typeof ai.getGenerativeModel>[0]['tools'],
            });

            // The contents should be an array of Content objects.
            // If it's a string, wrap it in the required structure.
            const formattedContents: Content[] = typeof contents === 'string'
                ? [{ role: 'user', parts: [{ text: contents }] }]
                : contents;

            // Extract generationConfig from config
            const generationConfig: GenerationConfig | undefined = config?.generationConfig;

            const result = await generativeModel.generateContent({
                contents: formattedContents,
                ...(generationConfig && { generationConfig }),
            });
            const responseData = await result.response;
            let text = "";
            try {
                text = responseData.text();
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                console.warn("[Proxy] Failed to extract text from response:", msg);
            }

            console.log(`[Proxy] Success: Received response from ${model}`);
            res.json({
                ...responseData,
                text: text
            } as GenerateResponseBody);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error("[Proxy] Gemini API Error:", errorMessage);
            if (errorStack) console.error(errorStack);
            res.status(500).json({
                error: errorMessage || "Internal Server Error",
                stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
            });
        }
    }
);

// Serve Static Files (Production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

app.use(express.static(distPath));

// Fallback for SPA Routing: Serve index.html for any request that doesn't match an earlier route
app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving static files from: ${distPath}`);
});
