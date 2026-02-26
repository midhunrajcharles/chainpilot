import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyAnwuobEeF1b41iJhZR_kiY6USPTOf6zAg";
const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiParser() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const testMessage = "save alice as contact with address 0x123...";
    
    const prompt = `
You are ChainPilot AI's AI intent parser. Analyze the user message and extract the intent with high accuracy.

User message: "${testMessage}"

Parse this message and return a JSON object with the following structure:

{
  "action": "action_type",
  "amount": "numeric_value_or_0",
  "token": "ETH",
  "recipient": "address_or_name_or_empty",
  "name": "contact_name_if_applicable",
  "teamName": "team_name_if_applicable",
  "description": "description_if_applicable",
  "group": "group_name_if_applicable",
  "period": "time_period_if_applicable",
  "confidence": 0.95
}

SUPPORTED ACTIONS:
1. "transfer", "send", "pay" - Send tokens to someone
   - Extract: amount, token (default ETH), recipient
   - Example: "Send 50 ETH to Alice" → action: "transfer", amount: "50", token: "ETH", recipient: "Alice"

2. "balance", "check" - Check wallet balance
   - Extract: token (default ETH)
   - Example: "Check my balance" → action: "balance", amount: "0", token: "ETH", recipient: ""

3. "add_contact", "create_contact" - Add someone to contacts
   - Extract: name, recipient (address)
   - Example: "Add John as contact with address 0x123..." → action: "add_contact", name: "John", recipient: "0x123..."

4. "create_team", "add_team" - Create a team
   - Extract: teamName, description (optional)
   - Example: "Create team called Marketing" → action: "create_team", teamName: "Marketing"

5. "analytics", "show_analytics", "dashboard" - Show analytics
   - Extract: period (optional: "7d", "30d", "90d", "1y")
   - Example: "Show my analytics" → action: "analytics", amount: "0", token: "ETH", recipient: ""

6. "security_check" - Check security
   - Example: "Check my security" → action: "security_check", amount: "0", token: "ETH", recipient: ""

7. "sharing" - Share transactions
   - Example: "Share my transaction" → action: "sharing", amount: "0", token: "ETH", recipient: ""

8. "notifications" - Manage notifications
   - Example: "Show notifications" → action: "notifications", amount: "0", token: "ETH", recipient: ""

9. "transaction_history" - View transaction history
   - Example: "Show transaction history" → action: "transaction_history", amount: "0", token: "ETH", recipient: ""

10. "advanced_transactions" - Advanced transaction features
    - Example: "Schedule transaction" → action: "advanced_transactions", amount: "0", token: "ETH", recipient: ""

RULES:
- Always set confidence between 0.0 and 1.0
- For transactions: amount must be positive number, token must be "ETH"
- For non-transactions: amount = "0", token = "ETH", recipient = ""
- Extract names, addresses, and other details accurately
- If confidence < 0.7, return null
- Return ONLY valid JSON, no markdown or extra text

Return the JSON object:`;

    console.log("Testing Gemini parser with message:", testMessage);
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    
    console.log("Raw Gemini response:", text);
    
    // Clean the response
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{]*/, "") // Remove any text before the first {
      .replace(/[^}]*$/, "") // Remove any text after the last }
      .trim();
    
    console.log("Cleaned response:", cleaned);
    
    const parsed = JSON.parse(cleaned);
    console.log("Parsed intent:", parsed);
    
  } catch (error) {
    console.error("Error testing Gemini parser:", error);
  }
}

testGeminiParser();
