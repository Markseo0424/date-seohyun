# Date Invite

React + Vite date invitation app. 신청 목록은 Vercel Serverless Function을 통해 PostgreSQL/Neon에 저장됩니다.

## Local Development

1. `.env.example`을 참고해서 `.env.local`에 `DATABASE_URL`을 추가합니다.
2. 의존성을 설치합니다.

```sh
npm install
```

3. 개발 서버를 실행합니다.

```sh
npm run dev
```

Vite 개발 서버에서도 `/api/applications`가 같은 PostgreSQL DB를 사용합니다.

## Vercel Deployment

Vercel 무료 배포에서는 별도 서버를 띄우지 않아도 됩니다. `/api` 폴더의 함수가 자동으로 서버리스 API가 되고, 프론트엔드는 `dist`로 정적 배포됩니다.

Vercel Project Settings에서 Environment Variable을 추가하세요.

```txt
DATABASE_URL=제공받은 Neon PostgreSQL URL
```

배포 후 첫 요청에서 `date_applications` 테이블이 자동 생성됩니다.
