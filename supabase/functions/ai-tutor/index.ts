// @ts-nocheck — This file runs in Supabase's Deno runtime, not Node.js
// Deploy with: supabase functions deploy ai-tutor
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

  console.log("[AI Tutor] request received");

  // -------------------------------------------------------------
  // AUTHENTICATION & PARSING
  // -------------------------------------------------------------
  let authHeader: string | null = null;
  let requestBody: any = null;

  try {
    authHeader = req.headers.get("Authorization");
    console.log(`[AI Tutor] authorization present: ${!!authHeader}`);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    requestBody = await req.json();
    console.log("[AI Tutor] request body parsed");
  } catch (error) {
    console.error("[AI Tutor] Error parsing request or checking auth:", error);
    return new Response(
      JSON.stringify({ error: "Malformed request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { messages, context } = requestBody;
  
  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Invalid request: messages array required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[AI Tutor] context received:
  topicId present: ${!!context?.topicId}
  topicName present: ${!!context?.topicName}
  curriculum present: ${!!context?.curriculum}
  grade present: ${!!context?.gradeLevel}
  subject present: ${!!context?.currentSubject || !!context?.subjects}`);

  let geminiApiKey: string | undefined;
  try {
    geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      const prefix = geminiApiKey.startsWith("AQ.") ? "AQ." : (geminiApiKey.startsWith("AIza") ? "AIza" : "other");
      console.log(`[AI Tutor] Gemini key prefix: ${prefix}***`);
    }
    if (!geminiApiKey) {
      console.error("[AI Tutor] GEMINI_API_KEY is not set in Supabase secrets.");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
     console.error("[AI Tutor] Error getting gemini api key:", error);
     return new Response(
      JSON.stringify({ error: "Internal Configuration Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }


  // -------------------------------------------------------------
  // CONTEXT VALIDATION (Phase 5)
  // -------------------------------------------------------------
  let finalCurriculum = context?.curriculum || 'Namibian';
  let finalGrade = context?.gradeLevel || 'NSSCO';
  let finalSubject = context?.currentSubject || context?.subjects?.[0] || 'Not specified';
  let finalTopicName = context?.topicName || '';

  if (context?.topicId) {
    console.log("[AI Tutor] topic validation starting");
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn("[AI Tutor] Supabase URL or Anon Key missing, skipping strict topic validation.");
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select(`
            name,
            curriculum_subjects (
              name,
              grades (
                name,
                curricula (
                  name
                )
              )
            )
          `)
          .eq('id', context.topicId)
          .single();

        if (topicError) {
          console.error("[AI Tutor] topic validation failed (Database error or topic not found):", topicError.message);
          return new Response(
            JSON.stringify({ error: "Topic not found or inaccessible" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (topicData) {
          console.log("[AI Tutor] topic validation succeeded");
          
          if (topicData.curriculum_subjects) {
            finalTopicName = topicData.name;
            finalSubject = topicData.curriculum_subjects.name;
            if (topicData.curriculum_subjects.grades) {
              finalGrade = topicData.curriculum_subjects.grades.name;
              if (topicData.curriculum_subjects.grades.curricula) {
                finalCurriculum = topicData.curriculum_subjects.grades.curricula.name;
              }
            }
          }
        } else {
             console.log("[AI Tutor] topic validation failed (Topic not found)");
             return new Response(
              JSON.stringify({ error: "Topic not found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
      }
    } catch (error) {
      console.error("[AI Tutor] Unexpected error during topic validation:", error);
      return new Response(
        JSON.stringify({ error: "Topic validation error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }


  // -------------------------------------------------------------
  // SYSTEM INSTRUCTION & GEMINI PREP
  // -------------------------------------------------------------
  let geminiContents: any[] = [];
  let systemInstruction = "";
  
  try {
    systemInstruction = `BASE ROLE
You are NamTutor AI, a world-class, encouraging 24/7 personal study tutor.

CURRICULUM CONTEXT
Curriculum: ${finalCurriculum}

GRADE CONTEXT
Grade Level: ${finalGrade}

SUBJECT CONTEXT
Subject: ${finalSubject}

TOPIC CONTEXT
${finalTopicName ? `Current Topic: ${finalTopicName}` : 'No specific topic selected. Provide general academic assistance.'}

LEARNING BEHAVIOR
- Tailor your advice to the student's specific curriculum and grade level.
- Provide step-by-step explanations and clear mathematical/scientific breakdowns.
- Always guide students through the methodology rather than giving away final answers blindly (Teach before answering).
- Use active recall selectively (ask understanding checks where useful, but do not frustrate the user by refusing to answer trivial questions).
- Be conversational, warm, and motivating. Use short paragraphs and bullet points for clarity.
- Avoid fabricating curriculum rules or official examiner status. Acknowledge uncertainty if exact syllabus details are unknown.
- Suggest structured study actions ONLY if highly relevant (e.g., if a student needs practice, suggest a 'quiz'. If they need memorization, suggest 'flashcards').`;

    const recentMessages = messages.slice(-20);
    geminiContents = recentMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  } catch (error) {
      console.error("[AI Tutor] Error preparing Gemini request content:", error);
      return new Response(
        JSON.stringify({ error: "Internal Error generating prompt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }

  // -------------------------------------------------------------
  // GEMINI REQUEST
  // -------------------------------------------------------------
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  let response: Response | null = null;
  console.log("[AI Tutor] Gemini request starting");

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: {
                type: "STRING",
                description: "The main text response from the tutor."
              },
              actions: {
                type: "ARRAY",
                description: "Optional suggested study actions. Only provide if highly relevant.",
                items: {
                  type: "OBJECT",
                  properties: {
                    type: {
                      type: "STRING",
                      enum: ["quiz", "flashcards", "topic"]
                    }
                  },
                  required: ["type"]
                }
              }
            },
            required: ["reply"]
          }
        }
      }),
      signal: controller.signal
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      console.error("[AI Tutor] Gemini request timed out");
      return new Response(
         JSON.stringify({ error: "AI request timed out" }),
         { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("[AI Tutor] Gemini fetch threw an error:", e);
    return new Response(
         JSON.stringify({ error: "Failed to connect to AI service" }),
         { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  clearTimeout(timeoutId);

  // -------------------------------------------------------------
  // GEMINI RESPONSE HANDLING
  // -------------------------------------------------------------
  if (!response) {
      console.error("[AI Tutor] response object is null after fetch");
      return new Response(
         JSON.stringify({ error: "Internal Error" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }

  console.log(`[AI Tutor] Gemini HTTP status: ${response.status}`);

  if (!response.ok) {
    let errData = "Unknown Error";
    try {
        errData = await response.text();
    } catch(e) {}
    
    const sanitizedMessage = errData.substring(0, 500);
    console.error(`[AI Tutor] Gemini API error:
status=${response.status}
message=${sanitizedMessage}`);
    
    // Map Gemini errors to reasonable gateway errors
    const outStatus = response.status === 429 ? 429 : 502;
    return new Response(
      JSON.stringify({ 
        error: "AI upstream request failed", 
        upstream_status: response.status,
        details: sanitizedMessage
      }),
      { status: outStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let responseText = "";
  try {
    const data = await response.json();
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("[AI Tutor] Unexpected Gemini response format (no text content)");
      return new Response(
        JSON.stringify({ error: "Received empty response from AI service" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
     console.error("[AI Tutor] Error parsing Gemini JSON response shell:", error);
     return new Response(
        JSON.stringify({ error: "Invalid response from AI service" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }

  // -------------------------------------------------------------
  // FALLBACK PARSING SAFETY NET
  // -------------------------------------------------------------
  let parsedReply = "";
  let parsedActions = [];
  let parsedSuccessfully = false;

  try {
    const parsed = JSON.parse(responseText);
    parsedReply = parsed.reply || "";
    if (Array.isArray(parsed.actions)) {
      parsedActions = parsed.actions.filter((a: any) => ['quiz', 'flashcards', 'topic'].includes(a?.type));
    }
    parsedSuccessfully = true;
  } catch (e) {
    console.warn("[AI Tutor] Failed to parse Gemini structured JSON, falling back to plain text");
    parsedReply = responseText;
  }
  
  console.log(`[AI Tutor] Gemini response parsed successfully: ${parsedSuccessfully}`);

  console.log("[AI Tutor] returning response");
  return new Response(
    JSON.stringify({ reply: parsedReply, actions: parsedActions }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});