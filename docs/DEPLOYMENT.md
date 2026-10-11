# Vercel 배포

Node.js 24.x, Next.js 자동 감지, 루트 디렉터리 `./`, 빌드 명령 `npm run build`를 사용합니다. GitHub의 `main` 브랜치를 연결하면 이후 변경을 푸시할 때 자동 배포됩니다.

## 영구 저장소

Vercel 함수의 파일 시스템은 영구 저장소가 아닙니다. 이 앱은 Vercel에서 Turso 원격 SQLite를 사용하며, DB 설정이 없으면 저장 API가 오류를 반환합니다. 임시 파일에 개인 기록을 저장하지 않습니다.

[Turso](https://app.turso.tech/)에서 무료 플랜으로 데이터베이스를 만들고 URL과 데이터베이스 인증 토큰을 발급하세요. 실제 토큰은 채팅·GitHub·소스 코드에 넣지 말고 Vercel 프로젝트의 **Settings → Environment Variables**에 입력합니다.

| 변수 | 값 | 적용 환경 |
| --- | --- | --- |
| `CAREERMAP_DATABASE_PROVIDER` | `turso` | Production |
| `TURSO_DATABASE_URL` | 발급받은 `libsql://…` URL | Production |
| `TURSO_AUTH_TOKEN` | DB 인증 토큰 (민감 정보) | Production |
| `GROQ_API_KEY` | 기존 Groq API 키 (민감 정보) | Production |
| `CAREERMAP_AI_PROVIDER` | `groq` | Production |
| `CAREERMAP_AI_MODEL` | `openai/gpt-oss-120b` | Production |

테이블과 인덱스는 최초 연결 시 생성합니다. 이후 배포에도 기록을 유지합니다. 로컬 `.data/careermap.sqlite`의 기존 기록은 자동 복사되지 않습니다. 필요한 기록이 있으면 별도 이관해야 합니다.

Preview를 활성화할 때는 **별도 테스트 DB**를 만들고 Preview 범위에 그 URL과 토큰을 입력하세요. 검토용 코드에서 운영 기록에 접근하지 않도록 Production 비밀을 모든 브랜치에 공유하지 않습니다. Groq 키도 Preview 사용이 필요할 때만 별도로 설정합니다.

클라우드 개발 환경의 프록시 비밀 바인딩은 Vercel로 자동 전달되지 않습니다. 프록시 자리표시자를 Vercel에 복사하면 인증되지 않습니다. 실제 키는 서비스 설정 화면에서 직접 등록하세요.

## 배포 및 확인

1. Vercel에서 GitHub의 `haeun910/careermap`을 Import하고 위 환경 변수를 등록한 뒤 Deploy합니다. 이미 같은 저장소를 연결한 프로젝트가 있으면 그 프로젝트를 사용합니다.
2. HTTPS 배포 주소에서 첫 작업 공간을 열고 프로젝트를 수정한 뒤 새로고침하여 저장 상태를 확인합니다.
3. 계정을 만들어 로그아웃·로그인하고 기록이 유지되는지 확인합니다.
4. 선택한 프로젝트로 포트폴리오를 게시하고 새 브라우저에서 공개 링크를 확인합니다. 공개 해제 후 해당 링크가 404인지 확인합니다.
5. AI 동의 안내를 확인한 뒤 AI 요청을 한 번 실행합니다. 키가 없으면 기록 편집은 가능하지만 AI는 동작하지 않습니다.

환경 변수를 변경하면 새 배포가 필요합니다. 한 번 연결한 뒤에는 같은 `main` 브랜치로 변경을 푸시하면 Vercel이 빌드·배포합니다.

## 비용과 운영 범위

[Turso 요금 안내](https://turso.tech/pricing)에 무료 플랜이 있으며 한도를 넘으면 이용이 제한됩니다. 유료 플랜이나 초과 과금은 자동 활성화하지 않습니다. Vercel 플랜의 용도·사용량 조건은 기존 계정에서 확인하세요.

현재는 개인 검토용 MVP입니다. 일반 사용자 대상 출시 전 인증 요청 제한의 공유 저장소 적용, 이메일 인증·복구, 데이터 삭제, 개인정보 처리방침과 백업 절차가 필요합니다. 현재 로그인 시도 제한은 함수 인스턴스의 메모리를 사용하므로 전체 인스턴스에 공유되지 않습니다. AI 요청 한도와 작업 공간 저장은 영구 DB에 공유됩니다.

## 개발 중 원격 DB 경로 검증

원격 HTTP 클라이언트는 공식 libSQL 서버로도 검증할 수 있습니다. **새 테스트 컨테이너**에서 실행하며 실제 운영 DB를 사용하지 않습니다.

```bash
docker run --rm -d --name careermap-libsql-test \
  -p 127.0.0.1:18080:8080 ghcr.io/tursodatabase/libsql-server:latest
CAREERMAP_TEST_DATABASE_URL=http://127.0.0.1:18080 npm test
docker stop careermap-libsql-test
```

테스트 DB 주소는 루프백 HTTP 서버로만 제한됩니다. 운영 Turso 연결은 HTTPS를 사용합니다. 로컬 SQLite와 이 HTTP 경로에서 서버 테스트 7개를 통과했으며, 운영 Turso 인증·Vercel 외부 주소의 동작은 해당 계정과 DB 연결 후 별도로 확인해야 합니다.
