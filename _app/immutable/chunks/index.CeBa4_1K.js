import{n as c}from"./runtime.DRhwkgl6.js";const o=[];function l(t,s){return t!=t?s==s:t!==s||t&&typeof t=="object"||typeof t=="function"}function h(t,s=c){let i=null;const r=new Set;function f(e){if(l(t,e)&&(t=e,i)){const u=!o.length;for(const n of r)n[1](),o.push(n,t);if(u){for(let n=0;n<o.length;n+=2)o[n][0](o[n+1]);o.length=0}}}function b(e){f(e(t))}function p(e,u=c){const n=[e,u];return r.add(n),r.size===1&&(i=s(f,b)||c),e(t),()=>{r.delete(n),r.size===0&&i&&(i(),i=null)}}return{set:f,update:b,subscribe:p}}export{h as w};
