const { Client } = require("@notionhq/client");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const { pageId, status, lastContact, notes, category } = req.body;

  if (!pageId) return res.status(400).json({ error: "pageId is required" });

  try {
    const properties = {};

    if (status) {
      properties.Status = { select: { name: status } };
    }
    if (lastContact) {
      properties.LastContact = { date: { start: lastContact } };
    }
    if (notes !== undefined) {
      properties.Notes = { rich_text: [{ text: { content: notes } }] };
    }
    if (category) {
      properties.Category = { select: { name: category } };
    }

    await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Notion update error:", error);
    return res.status(500).json({ error: error.message });
  }
};
