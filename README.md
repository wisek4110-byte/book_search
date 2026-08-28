# 📚 my bookshelf — 노션 도서 검색 위젯

노션 페이지에 임베드해서 쓰는 도서 검색/저장 위젯입니다. 알라딘 API로 책을 검색하고,
클릭하면 노션 데이터베이스에 자동으로 페이지를 생성합니다.

## 무엇이 왜 바뀌었나

기존 버전은 브라우저(`index.html`)에서 알라딘 API와 노션 API를 **직접** 호출했습니다.
두 API 모두 브라우저에서의 직접 호출(CORS)을 허용하지 않기 때문에, 공용 CORS 우회
프록시(`corsproxy.io`)를 거쳐야 했습니다. 이 방식은 두 가지 문제가 있었습니다.

1. **불안정함** — 공용 프록시는 요청량이 많아지면 막히거나(403), 서비스가 예고 없이
   중단될 수 있어 장기적으로 믿고 쓸 수 없습니다. ("CORS 인증 필요" 오류가 바로 이 증상입니다.)
2. **보안 문제** — 노션 통합 토큰(Notion Integration Token)이 `index.html` 코드에
   그대로 노출되어 있었습니다. 이 위젯을 노션에 임베드해서 쓰면 누구든 페이지 소스를
   열어 토큰을 그대로 복사해갈 수 있고, 이 저장소가 public GitHub repo이기 때문에
   커밋 이력에도 토큰이 그대로 남아 있었습니다.

그래서 API 키가 필요한 모든 통신(알라딘 검색, 노션 중복 체크/저장)을 **서버리스 함수**로
옮겼습니다. 브라우저는 이제 같은 출처(same-origin)의 `/api/search`, `/api/save`만
호출하고, API 키/토큰은 서버 환경변수에만 존재하며 클라이언트로 절대 내려가지 않습니다.
같은 출처 요청이므로 CORS 문제 자체가 사라지고, 프록시 서비스 상태에 더 이상 의존하지
않습니다.

```
index.html        - 위젯 UI/디자인/동작은 기존과 동일 (변경 없음)
api/search.js      - 알라딘 도서 검색 프록시 (GET /api/search?q=검색어)
api/save.js         - 노션 중복 체크 + 페이지 생성 (POST /api/save)
```

## ⚠️ 지금 바로 해야 할 일: 노션 토큰 재발급

기존 코드에 있던 노션 토큰이 public 저장소 이력에 노출되어 있었습니다. 이미 유출된
것으로 간주하고, 아래 순서로 **반드시** 토큰을 재발급하세요.

1. https://www.notion.so/my-integrations 접속
2. 기존에 쓰던 통합(Integration)을 열어 **토큰 재발급(Regenerate)** 또는 통합 자체를
   삭제 후 재생성
3. 새 토큰을 아래 "환경변수 설정"에서 `NOTION_TOKEN`으로 등록
4. 새로 만든 통합을 노션 데이터베이스 페이지의 "연결(Connections)"에 다시 추가

## 배포 방법 (Vercel, 무료)

정적 파일과 서버리스 함수를 함께 배포해야 하므로 GitHub Pages는 사용할 수 없습니다.
(GitHub Pages는 정적 파일만 서빙하고, 서버 코드를 실행할 수 없습니다.) 대신 GitHub 저장소를
그대로 연결해서 쓸 수 있는 **Vercel**을 사용합니다.

1. https://vercel.com 가입 (GitHub 계정으로 로그인 가능)
2. "Add New… → Project"에서 이 저장소(`book_search`)를 Import
3. 배포 전에 **Environment Variables**를 등록합니다.

   | Key | Value |
   |---|---|
   | `ALADIN_TTB_KEY` | 알라딘 Open API TTB 키 |
   | `NOTION_TOKEN` | 위에서 새로 재발급한 노션 통합 토큰 |
   | `NOTION_DB_ID` | 노션 데이터베이스 ID |

4. Deploy 클릭 → 완료되면 `https://your-project.vercel.app` 같은 URL이 생성됩니다.
5. main 브랜치(또는 배포 브랜치)에 새로 push할 때마다 자동으로 재배포됩니다.

## 노션에 임베드하기

노션 페이지에서 `/embed` 명령으로 임베드 블록을 추가하고, 위에서 발급받은 Vercel URL
(`https://your-project.vercel.app`)을 입력하면 됩니다. 위젯의 모양/디자인/조작 방식은
기존과 완전히 동일합니다.

## 노션 데이터베이스 속성 이름

`api/save.js`는 아래 속성 이름을 그대로 사용합니다. 데이터베이스의 속성 이름이 다르면
맞춰서 수정하세요.

- `제목` (title)
- `저자` (rich text)
- `출판사` (rich text)
- `ISBN` (rich text)
- `링크` (url)
- `상태` (select, "읽고 싶은 책" 옵션 필요)
- `표지` (files)

## 로컬에서 테스트하기

```bash
npm i -g vercel
vercel dev
```

`.env.local` 파일에 위 세 개의 환경변수를 넣어두면 `vercel dev`가 자동으로 읽어 로컬에서도
동일하게 동작합니다.
