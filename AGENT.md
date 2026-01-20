# AGENT

## 프로젝트 목적

- 개인 운동을 기록하고 흐름을 시각적으로 확인하는 웹 앱
- 기록 작성, 기록 관리, 대시보드 중심의 간단한 사용자 경험 제공
- 핵심 흐름을 방해하지 않는 범위 내에서만 기능을 확장한다

## 폴더 구조 요약

- `src/app`
  - 라우트 기반 페이지와 화면 구성
  - 페이지 단위 UI 및 상태 관리

- `src/components`
  - 공용 UI 및 기능 컴포넌트
  - `ui` 하위는 재사용을 전제로 한다

- `src/lib`
  - Supabase 연동
  - 유틸리티, API 호출

- `src/hooks`
  - 폼, 세션, 타이머 등 상태 로직
  - 화면(UI) 로직과 분리하여 관리

- `src/constants`
  - 고정 데이터 정의

- `src/types`
  - 타입 정의
  - 명시적인 타입 사용을 원칙으로 한다

- `public`
  - 정적 리소스

## 핵심 흐름

다음 흐름은 프로젝트 전반에서 유지된다.

1. 로그인 / 온보딩
2. 프로그램 추가 및 관리
3. 오늘 운동 기록
4. 기록 관리 (히스토리)
5. 대시보드 확인

이 흐름을 복잡하게 만들거나 우회하는 변경은 지양한다.

## 주요 모듈 책임

- `src/app`
  - 페이지 레이아웃
  - 라우팅
  - UI 흐름 제어

- `src/lib/supabase`
  - 인증 및 DB 연동
  - 서버/클라이언트 Supabase 클라이언트 생성

- `src/components/ui`
  - 재사용 가능한 UI 컴포넌트

- `src/hooks`
  - 사용자 입력, 세션, 상태 관리 로직

## 라우트 책임 가이드

라우트별 역할은 다음 기준을 따른다.

- 인증/온보딩 관련 라우트는 진입과 분기만 담당한다
- 프로그램 관련 라우트는 운동 구조 정의만 담당한다
- 운동 기록 라우트는 입력과 저장에 집중한다
- 히스토리 라우트는 조회와 수정에 집중한다
- 대시보드는 집계 결과 표시만 담당한다
- 설정 라우트는 핵심 사용자 흐름과 분리한다

라우트 간 책임을 침범하는 기능 추가는 지양한다.

## 개발 규칙

- 기능 단위로 작업하며 변경 범위는 작게 유지한다
- 공용 UI는 `src/components/ui`를 우선 사용한다
- 훅은 `src/hooks`에 위치시키고 화면 로직과 분리한다
- 타입은 명시적으로 유지하며 `any` 사용을 피한다
- 상태는 페이지 로컬을 기본으로 하고, 전역/서버 상태는 필요한 경우에만 사용한다
- 에러 처리는 사용자 메시지와 로그를 분리하여 관리한다

## 변경 전 체크

코드 작성 또는 커밋 전에 다음 사항을 확인한다.

- 변경 대상이 되는 라우트가 명확한가
- 해당 라우트의 책임 범위에 포함되는가
- 다른 라우트의 책임을 침범하지 않는가
- 페이지 로컬 상태로 충분한가
- 기존 공용 컴포넌트를 재사용할 수 있는가
- 핵심 흐름에 영향을 주는 변경인가

## 커밋 및 푸시 규칙

### 커밋 단위

- 하나의 커밋은 하나의 기능 또는 하나의 기술적 변경만 포함한다
- 기능 변경과 포맷/리네이밍 변경은 분리한다

### 커밋 메시지

형식:

<type>: <scope> — <내용>

- type: feat | fix | refactor | chore | docs | test
- scope: workout | history | dashboard | programs | auth | ui | supabase

예:
- fix: workout — 중복 저장 방지
- feat: history — 기록 필터 추가
- refactor: dashboard — 집계 로직 분리

### 푸시 전 확인

- `npm run lint`
- `npm run build`
- 핵심 흐름 수동 확인:
  - 로그인
  - 오늘 운동 기록 저장
  - 히스토리 진입
  - 대시보드 진입

### 추가 확인이 필요한 변경

- 기록 저장/수정 로직 변경
- 날짜 경계(자정) 처리 변경
- Supabase 스키마 또는 쿼리 변경
- 공용 UI 수정

## 운영 가이드

- 배포 전 `npm run lint`와 `npm run build`로 기본 검증을 수행한다
- 환경변수는 `SETUP.md` 기준을 따른다
- 로컬 환경에서는 `.env.local`만 사용한다
- Supabase 스키마 변경 시 영향 범위를 먼저 정리한다
- 배포 후 핵심 흐름을 우선 확인한다

## 라우트 목록

- `src/app/page.tsx`: 홈
- `src/app/templates/new/page.tsx`: 프로그램 생성
- `src/app/programs/manage/page.tsx`: 프로그램 관리
- `src/app/programs/edit/[id]/page.tsx`: 프로그램 수정
- `src/app/workout/page.tsx`: 운동 시작 (프로그램 선택)
- `src/app/workout/[id]/page.tsx`: 오늘 운동 기록
- `src/app/history/page.tsx`: 운동 기록 목록
- `src/app/history/[id]/page.tsx`: 운동 기록 상세
- `src/app/dashboard/page.tsx`: 대시보드
- `src/app/login/page.tsx`: 로그인
- `src/app/onboarding/page.tsx`: 온보딩
- `src/app/settings/page.tsx`: 설정

## 결정 기록

- 2026-01-20  
  문서 구조를 `README.md`, `AGENT.md`, `SETUP.md`로 통합  
  외부 공유와 내부 컨텍스트를 분리하고 문서 수를 최소화하기 위함

## 관련 문서

- `SETUP.md`
