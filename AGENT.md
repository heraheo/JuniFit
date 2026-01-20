# AGENT

## 프로젝트 목적

- 개인 운동을 기록하고 흐름을 시각적으로 확인하는 웹 앱
- 기록 작성, 기록 관리, 대시보드 중심의 간단한 사용자 경험 제공

## 폴더 구조 요약

- `src/app`: 라우트 기반 페이지와 화면 구성
- `src/components`: 공용 UI 및 기능 컴포넌트
- `src/lib`: Supabase 연동, 유틸리티, API 호출
- `src/hooks`: 폼/세션/타이머 등 상태 로직
- `src/constants`: 고정 데이터 정의
- `src/types`: 타입 정의
- `public`: 정적 리소스

## 핵심 흐름

1. 로그인/온보딩
2. 프로그램 추가/관리
3. 오늘 운동 기록
4. 기록 관리(히스토리)
5. 대시보드 확인

## 주요 모듈 책임

- `src/app`: 페이지 레이아웃, 라우팅, UI 흐름
- `src/lib/supabase`: 인증/DB 연동, 서버/클라이언트 클라이언트 생성
- `src/components/ui`: 재사용 가능한 UI 컴포넌트
- `src/hooks`: 사용자 입력 및 세션 관련 로직

## 개발 규칙

- 기능 단위로 작업하며 변화는 작게 나눠 반영
- 공용 UI는 `src/components/ui` 우선 사용, 중복 스타일 최소화
- 훅은 `src/hooks`에 위치시키고 화면 로직과 분리
- 타입은 명시적으로 유지하고 `any` 사용을 피함
- 에러 처리는 사용자 메시지와 로그를 분리해 남김

## 운영 가이드

- 배포 전 `npm run lint`와 `npm run build`로 기본 검증
- 환경변수는 `SETUP.md` 기준을 따르며 로컬은 `.env.local`만 사용
- Supabase 스키마 변경 시 영향 범위를 먼저 정리
- 배포 후 핵심 흐름(로그인, 기록 저장, 대시보드)을 빠르게 확인

## 라우트 목록

- `src/app/page.tsx`: 홈
- `src/app/templates/new/page.tsx`: 프로그램 생성
- `src/app/programs/manage/page.tsx`: 프로그램 관리
- `src/app/programs/edit/[id]/page.tsx`: 프로그램 수정
- `src/app/workout/page.tsx`: 운동 시작(프로그램 선택)
- `src/app/workout/[id]/page.tsx`: 오늘 운동 기록
- `src/app/history/page.tsx`: 운동 기록 목록
- `src/app/history/[id]/page.tsx`: 운동 기록 상세
- `src/app/dashboard/page.tsx`: 대시보드
- `src/app/login/page.tsx`: 로그인
- `src/app/onboarding/page.tsx`: 온보딩
- `src/app/settings/page.tsx`: 설정

## 결정 기록

- 2026-01-20 — 문서 구조를 `README.md`, `AGENT.md`, `SETUP.md`로 통합 — 외부 공유와 내부 컨텍스트를 분리해 문서 수를 줄이고 맥락 복원을 쉽게 하기 위함

## 관련 문서

- `SETUP.md`
