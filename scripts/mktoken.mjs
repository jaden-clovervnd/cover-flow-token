#!/usr/bin/env node
/**
 * Apple MusicKit Developer Token 서명기.
 *
 * 로컬:  node scripts/mktoken.mjs > .env.local
 * CI:    node scripts/mktoken.mjs --json > docs/token.json
 *
 * 키 소스 (우선순위):
 *   1. 환경변수 APPLE_P8        (GitHub Actions - Secrets)
 *   2. secrets/AuthKey_*.p8     (로컬 개발)
 *
 * .p8 파일은 절대 커밋하지 않는다. .gitignore 확인할 것.
 */
import fs from 'node:fs'
import path from 'node:path'
import jwt from 'jsonwebtoken'

const AS_JSON = process.argv.includes('--json')

// Apple 하드 리밋: exp 는 현재로부터 최대 15777000초 (약 182.6일 = 6개월)
const MAX_TTL_SEC = 15777000

let key = process.env.APPLE_P8
let keyId = process.env.APPLE_KEY_ID
const teamId = process.env.APPLE_TEAM_ID

if (!key) {
  const dir = path.resolve('secrets')
  const file = fs.existsSync(dir)
    ? fs.readdirSync(dir).find((n) => /^AuthKey_.+\.p8$/.test(n))
    : undefined
  if (file) {
    key = fs.readFileSync(path.join(dir, file), 'utf8')
    // AuthKey_ABCD123456.p8 -> ABCD123456
    keyId ||= file.slice('AuthKey_'.length, -'.p8'.length)
  }
}

const missing = []
if (!key) missing.push('APPLE_P8 (또는 secrets/AuthKey_*.p8)')
if (!keyId) missing.push('APPLE_KEY_ID')
if (!teamId) missing.push('APPLE_TEAM_ID')

if (missing.length) {
  console.error(`
[mktoken] 다음 값이 없습니다:
${missing.map((m) => '  - ' + m).join('\n')}

로컬 설정:
  1. Apple Developer → Certificates, Identifiers & Profiles → Keys
     에서 MusicKit 키를 만들고 AuthKey_XXXXXXXXXX.p8 을 내려받는다
  2. mkdir -p secrets && mv ~/Downloads/AuthKey_*.p8 secrets/
  3. export APPLE_TEAM_ID=XXXXXXXXXX      (Membership 페이지의 Team ID)
  4. npm run token > .env.local

CI 설정:
  저장소 Settings → Secrets and variables → Actions 에
  APPLE_P8 / APPLE_KEY_ID / APPLE_TEAM_ID 를 등록한다.
`)
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const exp = now + MAX_TTL_SEC

let token
try {
  token = jwt.sign({ iat: now, exp }, key, {
    algorithm: 'ES256',
    issuer: teamId,
    header: { alg: 'ES256', kid: keyId },
  })
} catch (err) {
  console.error(`[mktoken] 서명 실패: ${err.message}`)
  console.error('  .p8 파일이 손상됐거나 ES256 키가 아닐 수 있습니다.')
  process.exit(1)
}

const expiresAt = new Date(exp * 1000).toISOString()
const days = Math.floor(MAX_TTL_SEC / 86400)

if (AS_JSON) {
  process.stdout.write(
    JSON.stringify({ token, expiresAt, rotatedAt: new Date(now * 1000).toISOString() }, null, 2) + '\n',
  )
} else {
  process.stdout.write(`VITE_AM_DEV_TOKEN=${token}\n`)
}

// stdout 은 리다이렉트 대상이므로 사람이 읽을 메시지는 stderr 로
console.error(`[mktoken] 서명 완료. 만료: ${expiresAt} (${days}일 — Apple 상한)`)
