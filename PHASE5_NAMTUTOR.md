# Phase 5: Advanced NamTutor Architecture

## Context Model
NamTutor has transitioned from a standalone generic conversational bot into a curriculum-aware, topic-aware learning assistant. The frontend passes a contextual payload via URL parameters from the Topic Hub, which is then mapped into a structured tutor context:

```typescript
{
  curriculum?: string;
  gradeLevel?: string;
  subject?: string;
  topicId?: string;
  topicName?: string;
}
```

## Server Validation (Edge Function)
When `topicId` is supplied, the `ai-tutor` Supabase Edge Function uses the authenticated `SupabaseClient` to validate the `topicId` against the database. It traverses the hierarchy: `topic -> curriculum_subject -> grade -> curriculum` to derive the authoritative academic context, overriding client-provided hints to ensure absolute consistency and prevent prompt injection or mismatched contexts.

## Gemini Model and Structured Output
The backend uses **Gemini 3.5 Flash** (`gemini-3.5-flash`, GA May 2026) for high-performance, low-latency structured responses. The previous model (`gemini-2.0-flash`) was shut down by Google on June 1, 2026. The API is invoked with `responseMimeType: "application/json"` and a strict `responseSchema`.

### Response Schema
```json
{
  "reply": "The main text response from the tutor.",
  "actions": [
    {
      "type": "quiz" // or "flashcards" or "topic"
    }
  ]
}
```
*Note*: The frontend dynamically maps `action.type` into user-friendly labels to maintain UI consistency and prevent the AI from generating confusing custom button text.

## Action Persistence
Study actions (`actions` array) are explicitly **transient**. They are attached to the `AIMessage` in React Native local state and rendered as contextual buttons. However, they are NOT saved to the `ai_messages` table. 
- **Reasoning**: Suggested navigation actions are contextually relevant to the *immediate* learning moment. When a student returns to an old conversation, the AI's explanation remains, but outdated navigation affordances do not persist. This also prevents unnecessary schema migrations for the `ai_messages` table.

## Error Handling
The client implements a 15-second bounded timeout (handled in the Edge Function controller). The UI catches network timeouts, structured JSON parsing failures, and API errors, degrading gracefully:
1. If structured JSON parsing fails, the Edge Function catches it and falls back to treating the raw text as a string `reply` with an empty `actions` array.
2. If the Edge Function fails entirely, the UI displays a generic, friendly fallback message ("NamTutor is having trouble responding right now. Please try again in a moment.") and hides internal stack traces or status codes.

## Limitations
- Performance context (e.g., recent quiz scores) is NOT passed to the model in Phase 5 to avoid trusting the client as the authority. This is deferred to Phase 6.
- Multimodal capabilities (camera/image OCR) are architecturally planned but explicitly disabled in the UI to avoid creating dead affordances.

## Future Multimodal Plan (Phase 6+)
Future iterations will introduce a file picker/camera module that converts images into Base64 strings. These will be appended to the `geminiContents` array as inline data parts, allowing Gemini to analyze handwritten math or photographed exam questions.
