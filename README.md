# cover-flow-token

[Cover Flow](https://github.com/jaden-clovervnd/cover-flow) (Even Realities 스마트글래스용 Apple Music 플레이어) 의 **Apple MusicKit Developer Token 자동 갱신 저장소.**

메인 앱 저장소는 private 이고, 이 저장소는 **오직 토큰만 공개**하기 위해 존재한다.

## 왜 별도 저장소인가

Apple 은 Developer Token 의 `exp` 를 최대 180일로 제한한다. 번들에 박아 배포하면 180일째에 전 유저가 동시에 죽는다. 그래서:

```
.github/workflows/rotate-token.yml   매월 1일 cron
  └─ scripts/mktoken.mjs --json → docs/token.json 커밋
       └─ GitHub Pages 가 배포 (ACAO: * — 앱이 인증 없이 fetch)
            └─ 앱이 부팅 시 fetch (없으면 로컬 캐시 → 번들 순 폴백)
```

토큰 자체는 MusicKit JS 설계상 브라우저에 노출되는 값이라 **공개가 의도된 트레이드오프**다. 진짜 비밀인 `.p8` 서명키는 이 저장소에 없다 — GitHub Actions Secrets 로만 주입된다.

## 배포 URL

```
https://jaden-clovervnd.github.io/cover-flow-token/token.json
```

메인 앱의 `VITE_TOKEN_URL` 과 `app.json` network whitelist 가 이 호스트를 가리킨다.

## 설정 (이미 완료됨)

저장소 Settings → Secrets and variables → Actions:

- `APPLE_P8` — `AuthKey_XXXXXXXXXX.p8` 파일 내용
- `APPLE_KEY_ID` — 키 ID (파일명에서 추출)
- `APPLE_TEAM_ID` — Apple Developer Membership 의 Team ID

수동 갱신: Actions 탭 → rotate-token → Run workflow.
