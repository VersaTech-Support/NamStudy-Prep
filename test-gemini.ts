import { GoogleGenAI } from "npm:@google/genai";

const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6IPhX6G5i3__B_CFK_6wqswYcrKXDewvHrH-8OLCo8-A" });
const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: "hello",
});
console.log(response.text);
