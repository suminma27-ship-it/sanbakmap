/** No persistent consent: new page load always starts locked. */
export const LNT_RULES = Object.freeze([
 '사전에 계획하고 준비하기',
 '지정된 탐방로와 야영지 이용하기',
 '쓰레기를 남기지 않기',
 '발견한 자연물은 그대로 두기',
 '모닥불의 영향을 최소화하기',
 '야생동물을 존중하기',
 '다른 방문자를 배려하기'
]);
export const CONSENT_TEXT = '우리는 자연을 사랑하기에, 그것을 지킬 의무가 있습니다.';
export function createGateState() { return {accepted:false,closed:false}; }
export function transitionGate(state,action) {
 if(state.closed)return state;
 if(action==='accept')return {accepted:true,closed:false};
 if(action==='decline')return {accepted:false,closed:true};
 return state;
}
