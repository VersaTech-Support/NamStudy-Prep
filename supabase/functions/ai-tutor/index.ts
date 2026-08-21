// @ts-nocheck — This file runs in Supabase's Deno runtime, not Node.js
// Deploy with: supabase functions deploy ai-tutor
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { messages, context } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the Gemini API key from Supabase secrets
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not set in Supabase secrets.");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const curriculumInfo = context ? `
Student Profile:
- Curriculum: ${context.curriculum || 'Namibian'}
- Grade Level: ${context.gradeLevel || 'NSSCO'}
- Subjects: ${(context.subjects || []).join(", ") || 'Not specified'}
` : "";

    // Build the system instruction for the tutor
    const systemInstruction = `You are NamTutor AI, a world-class, encouraging 24/7 personal study tutor.
You specialize in both Namibian (NSSCO/NSSCAS) and Cambridge (IGCSE/AS Level) curricula.
${curriculumInfo}
Your core guidelines:
- Tailor your advice to the student's specific curriculum and grade level.
- Provide step-by-step explanations and clear mathematical/scientific breakdowns.
- Always guide students through the methodology rather than giving away final answers blindly.
- Use active recall tips and encourage spaced repetition.
- Reference the correct national or international exam standards when relevant.
- Be warm, patient, and motivating. Use short paragraphs and bullet points for clarity.
- If a student asks something outside their school curriculum, politely redirect them to focus on their studies.
- Keep responses concise but thorough — aim for clarity over length.`;

    const recentMessages = messages.slice(-20);
    const geminiContents = recentMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }),
        signal: controller.signal
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
         throw new Error("AI request timed out");
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errData = await response.text();
      console.error("Gemini API error:", response.status, errData);
      throw new Error("Failed to get response from AI service");
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("Unexpected Gemini response format:", JSON.stringify(data));
      throw new Error("Received empty response from AI service");
    }

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating AI response:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        reply: "I'm having trouble connecting to my brain right now. Please try again in a moment!",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
