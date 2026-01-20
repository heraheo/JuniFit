# SETUP

## 로컬 개발 환경 설정

### 1. `.env.local` 파일 생성
루트 디렉토리에 `.env.local` 파일을 생성하고 다음을 입력하세요:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase 프로젝트에서 키 가져오기
1. [Supabase](https://supabase.com) 접속
2. 프로젝트 선택
3. `Settings` → `API` 에서:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 로컬 실행

```bash
npm install
npm run dev
```

---

## Vercel 배포 환경변수 설정

### Vercel에서 환경변수 추가하기

1. [Vercel 대시보드](https://vercel.com) 접속
2. JuniFit 프로젝트 선택
3. `Settings` → `Environment Variables` 클릭
4. 다음 환경변수들을 추가:

| Variable Name | Value | 가시성 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Plaintext (모든 환경) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Plaintext (모든 환경) |

### 환경 설정
- **Production**: 실제 운영 환경 키 입력
- **Preview**: 개발 환경 키 또는 동일한 키 입력
- **Development**: 로컬 개발환경 (`.env.local` 사용)

### 배포 후 확인
환경변수 추가 후:
1. 새로운 배포 트리거 (다시 배포)
2. 배포 완료 후 앱에서 Supabase 연결 확인

---

## 주의사항

- `.env.local` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.
- 팀원들과 공유할 때는 `.env.example` 파일을 사용하세요.
- `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트에 노출됩니다.

---

## 빠른 체크리스트

- [ ] `.env.local` 파일 생성 및 Supabase 키 입력
- [ ] 로컬에서 `npm run dev` 실행하여 연결 확인
- [ ] Vercel 프로젝트 Settings에서 환경변수 추가
- [ ] Vercel에서 새로운 배포 트리거
- [ ] 배포된 사이트에서 Supabase 연결 확인
