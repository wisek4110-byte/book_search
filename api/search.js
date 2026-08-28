// 알라딘 도서 검색을 서버(Vercel Serverless Function)에서 대신 호출합니다.
// 브라우저가 알라딘 API를 직접 호출하면 CORS로 막히기 때문에,
// 같은 출처(same-origin)인 이 엔드포인트를 통해 우회합니다.
module.exports = async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query) {
    res.status(400).json({ error: "검색어(q)가 필요합니다." });
    return;
  }

  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    res.status(500).json({ error: "서버에 ALADIN_TTB_KEY 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  const targetUrl =
    `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx` +
    `?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&Query=${encodeURIComponent(query)}` +
    `&QueryType=Title&MaxResults=10&start=1&SearchTarget=Book` +
    `&output=js&Version=20131101&Cover=Big`;

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "알라딘 API 응답을 해석할 수 없습니다." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (error) {
    res.status(502).json({ error: `알라딘 API 요청 실패: ${error.message}` });
  }
};
