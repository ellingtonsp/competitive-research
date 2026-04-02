# MISSION
Act as a Senior Software Engineer and UI/UX Designer to build a full-stack "Strategic PM Co-Pilot" application. The app's goal is to help a Senior Product Manager conduct competitive research, generate high-stakes narrative positioning, and export tactical battlecards.

# PROBLEM STATEMENT (The "Why")
The current competitive research process for our PM team is broken in three ways:
1. **The "Fluff" Trap**: Standard AI research produces generic, "safe" descriptions that offer no tactical advantage (e.g., "Company X is a leader in innovation"). 
2. **Context Fragmentation**: Company data (our strengths) and Competitor data (their weaknesses) live in separate docs. We fail to find the "Overlap of Opportunity"—the specific gap where our secret sauce beats their primary moat.
3. **The "Synthesis Tax"**: PMs spend 70% of their time formatting battlecards and copying data into Google Drive, leaving only 30% for actual strategic thinking.

# SOLUTION OBJECTIVE
This app must bridge the "Synthesis Gap." It is not a data-entry tool; it is a **Strategy Engine**. It must solve for "Insight Density"—ensuring every word generated is a tactical weapon for Sales, Marketing, or Product Engineering.

# IMPLEMENTATION PHILOSOPHY
This app is successful if it reduces a PM's research-to-brief workflow from 4 hours to 15 minutes. 
The implementation must solve for "Insight Depth." 
When the AI Backend is prompted, use a "Chain of Thought" reasoning process:
1. Analyze the User's Company Strengths.
2. Identify the Competitor's Market Share Moat.
3. Find the 'Vulnerability Gap' where our secret sauce overlaps with their weakness.
4. Output the positioning based ONLY on that gap.

# CORE FEATURES & UI SECTIONS
1. **Global Sidebar**: Navigation between "Company Profile," "Competitor Research," "Strategic Output", "Market Intel" (Recent Press Releases or Competitors in Recent News) and "Strategic Actions", where work items can be created (in this case, push to linear via API).
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
     d. **Market Intel**: Synthesis of recent market developments via news, PR releases and socials for competitors
     e. **Strategic Actions**: The ability to push recommended actions (features, competitive positioning) in direct response to the intel generated earlier in the flow. 
5. **Export & Drive Integration**:
   - Use the `gapi` or `google-cloud/drive` library to allow the user to export generated results as a Markdown or PDF file directly to a folder named "PM Co-Pilot" in their Google Drive.
   - Linear API for Action Creation
   - Managed via .env variables

# UI/UX REQUIREMENTS
- Style: "Linear.app" or "Stripe" aesthetic. Clean, dark/light/auto mode support, high-contrast typography, and plenty of whitespace.
- Interactivity: Show a progress "thinking" state when the AI is generating content.
- Response Formatting: The AI-generated content must be rendered in beautiful, clean Markdown.
- Responses must persist between sessions in local storage (company info, competitive info).
- Fail Loudly.  Clear error messages
- Success on Execute: Successful execution of tool integrations should produce a success toast

# TECH STACK
- Frontend: React 19, Tailwind CSS (for styling), Lucide-React (for icons).
- Backend: Node.js (AI Studio Runtime).
- Persistence: Use browser `localStorage` for the "Company Profile" so it persists across sessions.
- AI Integration: Use the Gemini 3.1 Flash SDK.
- Export: Implement a "Save to Google Drive" feature using the Google Drive API (include a Sign-In with Google button).

# SYSTEM INSTRUCTION FOR THE INTERNAL PM AGENT
When generating content, the internal agent should think like a Harvard Business School grad and a Silicon Valley PM veteran. It should avoid buzzwords and focus on "First Principles" differentiation.
