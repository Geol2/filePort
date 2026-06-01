// =====================================================================
// locales/index.ts — 내장 언어팩 레지스트리
//
// 새 언어를 추가하려면:
//   1) ko.ts 를 복제해 해당 언어 파일(예: ja.ts)을 작성
//   2) types.ts 의 LocaleCode 에 코드 추가
//   3) 아래 LOCALES 에 등록
// =====================================================================

import type { LocaleCode, Messages } from '../types.js';
import { ko } from './ko.js';
import { en } from './en.js';

export const LOCALES: Record<LocaleCode, Messages> = { ko, en };

export const DEFAULT_LOCALE: LocaleCode = 'ko';

export { ko, en };
