const { Client } = require("@notionhq/client");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notion || !databaseId) {
    return res.status(500).json({ error: "Missing NOTION_API_KEY or NOTION_DATABASE_ID env vars" });
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "LastContact", direction: "descending" }],
    });

    const contacts = response.results.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        name: p.Name?.title?.[0]?.plain_text || "",
        email: p.Email?.email || p.Email?.rich_text?.[0]?.plain_text || "",
        company: p.Company?.rich_text?.[0]?.plain_text || "",
        role: p.Role?.rich_text?.[0]?.plain_text || "",
        category: p.Category?.select?.name || "Networking",
        status: p.Status?.select?.name || "Sent",
        lastContact: p.LastContact?.date?.start || new Date().toISOString().split("T")[0],
        notes: p.Notes?.rich_text?.[0]?.plain_text || "",
        subject: p.Subject?.rich_text?.[0]?.plain_text || "",
      };
    });

    return res.status(200).json({ contacts, count: contacts.length });
  } catch (error) {
    console.error("Notion API error:", error);
    return res.status(500).json({ error: error.message });
  }
};
