// 노션 저장(중복 체크 + 페이지 생성)을 서버에서 처리합니다.
// 노션 통합 토큰은 여기(서버 환경변수)에만 존재하며 브라우저로는 절대 전달되지 않습니다.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "허용되지 않는 메서드입니다." });
    return;
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;
  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    res.status(500).json({ error: "서버에 NOTION_TOKEN / NOTION_DB_ID 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  const book = req.body || {};
  if (!book.title) {
    res.status(400).json({ error: "책 정보(title)가 필요합니다." });
    return;
  }

  const isbn = book.isbn13 || book.isbn || "";
  const notionHeaders = {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  try {
    // 1) 중복 도서 체크 (ISBN 기준)
    if (isbn) {
      const checkResponse = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
        {
          method: "POST",
          headers: notionHeaders,
          body: JSON.stringify({
            filter: { property: "ISBN", rich_text: { equals: isbn } },
          }),
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.results && checkData.results.length > 0) {
          res.status(200).json({ status: "duplicate" });
          return;
        }
      }
    }

    // 2) 노션 페이지 생성 payload 구성
    const fullDesc = book.description || "책 소개 없음";
    const children = [
      {
        object: "block",
        type: "image",
        image: { type: "external", external: { url: book.cover } },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "책 소개" } }] },
      },
    ];

    const maxLen = 2000;
    for (let i = 0; i < fullDesc.length; i += maxLen) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: fullDesc.substring(i, i + maxLen) } }],
        },
      });
    }

    const payload = {
      parent: { database_id: NOTION_DB_ID },
      icon: { type: "emoji", emoji: "📖" },
      cover: { type: "external", external: { url: book.cover } },
      properties: {
        "제목": { title: [{ text: { content: book.title } }] },
        "저자": { rich_text: [{ text: { content: book.author || "" } }] },
        "출판사": { rich_text: [{ text: { content: book.publisher || "" } }] },
        "ISBN": { rich_text: [{ text: { content: isbn } }] },
        "링크": { url: book.link || null },
        "상태": { select: { name: "읽고 싶은 책" } },
        "표지": {
          files: [
            {
              name: `${book.title} 표지`,
              type: "external",
              external: { url: book.cover },
            },
          ],
        },
      },
      children,
    };

    const createResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify(payload),
    });

    const createData = await createResponse.json();
    if (!createResponse.ok) {
      res.status(createResponse.status).json({ error: createData.message || "노션 API 오류" });
      return;
    }

    res.status(200).json({ status: "created" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
