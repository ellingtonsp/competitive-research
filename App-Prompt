# MISSION
Act as a Senior Software Engineer and UI/UX Designer to build a full-stack "Strategic PM Co-Pilot" application. The app's goal is to help a Senior Product Manager conduct competitive research, generate high-stakes narrative positioning, and export tactical battlecards.

# TECH STACK
- Frontend: React 19, Tailwind CSS (for styling), Lucide-React (for icons).
- Backend: Node.js (AI Studio Runtime).
- Persistence: Use browser `localStorage` for the "Company Profile" so it persists across sessions.
- AI Integration: Use the Gemini 3.1 Flash SDK.
- Export: Implement a "Save to Google Drive" feature using the Google Drive API (include a Sign-In with Google button).

# CORE FEATURES & UI SECTIONS
1. **Global Sidebar**: Navigation between "Company Profile," "Competitor Research," and "Strategic Output."
2. **Company Profile (Persistence Layer)**:
   - A detailed form to save the user's own company data: Name, Target Audience, Value Proposition, Key Features, Pricing Model, and Internal "Secret Sauce."
   - State: Save this to localStorage on every change.
3. **Competitor Input**:
   - A dashboard to add competitors (Name, URL, and a text box for "Known Strengths/Weaknesses").
4. **AI Research Engine**:
   - A settings modal to input and save a "Gemini API Key."
   - Three "Analysis" buttons that trigger different LLM prompts:
     a. **Narrative Positioning Statement**: Generates a [Target-Category-Benefit-Differentiation] narrative.
     b. **Competitive Battlecard**: A 2x2 table/grid covering "How to Win," "Where they Struggle," "Landmines to Drop," and "Quick Pitch."
     c. **Research Brief**: A long-form PRD-style document summarizing the competitive landscape.
5. **Export & Drive Integration**:
   - Use the `gapi` or `google-cloud/drive` library to allow the user to export generated results as a Markdown or PDF file directly to a folder named "PM Co-Pilot" in their Google Drive.

# UI/UX REQUIREMENTS
- Style: "Linear.app" or "Stripe" aesthetic. Clean, dark/light mode support, high-contrast typography, and plenty of whitespace.
- Interactivity: Show a progress "thinking" state when the AI is generating content.
- Response Formatting: The AI-generated content must be rendered in beautiful, clean Markdown.

# SYSTEM INSTRUCTION FOR THE INTERNAL PM AGENT
When generating content, the internal agent should think like a Harvard Business School grad and a Silicon Valley PM veteran. It should avoid buzzwords and focus on "First Principles" differentiation.
