import{x as m,a0 as b,z as w,a1 as A,F as h,a2 as E,a3 as N,a4 as C}from"./runtime.D3gJ5qpc.js";var R=Array.isArray,H=Array.from,M=Object.isFrozen,$=Object.defineProperty,x=Object.getOwnPropertyDescriptor,L=Object.getOwnPropertyDescriptors,z=Object.prototype,F=Array.prototype,Y=Object.getPrototypeOf;function U(e){return typeof e=="function"}function D(e){console.warn("hydration_mismatch")}let f=!1;function k(e){f=e}let u=null,i;function B(e){u=e,i=e&&e[0]}function p(){return i.previousSibling??i}function _(e){if(e.nodeType!==8)return e;var r=e;if(r.data!==m)return e;for(var t=[],a=0;(r=r.nextSibling)!==null;){if(r.nodeType===8){var n=r.data;if(n===m)a+=1;else if(n[0]===b){if(a===0)return u=t,i=t[0],r;a-=1}}t.push(r)}throw D(),w}var y,P;function W(){if(y===void 0){y=window,P=document;var e=Element.prototype;e.__click=void 0,e.__className="",e.__attributes=null,e.__e=void 0,Text.prototype.__t=void 0}}function d(){return document.createTextNode("")}function q(e){const r=e.firstChild;return f?r===null?e.appendChild(d()):_(r):r}function G(e,r){var n;if(!f)return e.firstChild;if(r&&(i==null?void 0:i.nodeType)!==3){var t=d(),a=h;return((n=a.nodes)==null?void 0:n.start)===i&&(a.nodes.start=t),i==null||i.before(t),t}return _(i)}function S(e,r=!1){var t=e.nextSibling;if(!f)return t;var a=t.nodeType;if(a===8&&t.data===A)return S(t,r);if(r&&a!==3){var n=d();return t==null||t.before(n),n}return _(t)}function V(e){e.textContent=""}function T(e){var r=document.createElement("template");return r.innerHTML=e,r.content}function J(e){if(R(e))for(var r=0;r<e.length;r++){var t=e[r];t.isConnected&&t.remove()}else e.isConnected&&e.remove()}function s(e,r,t=null){const a=h;a.nodes===null?a.nodes={start:e,anchor:t,end:r}:a.nodes.start===void 0&&(a.nodes.start=e)}function K(e,r){var t=(r&E)!==0,a=(r&N)!==0,n,c=!e.startsWith("<!>"),l=(r&C)!==0;return()=>{if(f)return s(p(),u[u.length-1]),i;n||(n=T(e),t||(n=n.firstChild));var o=a?document.importNode(n,!0):n.cloneNode(!0);if(t){var v=o.firstChild,g=c?v:l?void 0:null,O=o.lastChild;s(g,O,v)}else s(o,o);return o}}function Q(e,r,t="svg"){var a=`<${t}>${e}</${t}>`,n;return e.startsWith("<!>"),()=>{if(f)return s(p(),u[u.length-1]),i;if(!n){var c=T(a),l=c.firstChild;n=l.firstChild}var o=n.cloneNode(!0);return s(o,o),o}}function X(e){if(!f){var r=d();return s(r,r),r}var t=i;return t||e.before(t=d()),s(t,t),t}function Z(e=!1){if(f)return s(p(),u[u.length-1]),i;var r=document.createDocumentFragment(),t=d();return r.append(t),s(e?void 0:null,t,t),r}function ee(e,r){f||e.before(r)}const j="5";typeof window<"u"&&(window.__svelte||(window.__svelte={v:new Set})).v.add(j);export{P as $,F as A,s as B,p as C,T as D,U as E,ee as a,k as b,q as c,u as d,$ as e,G as f,x as g,f as h,R as i,d as j,_ as k,B as l,W as m,V as n,H as o,i as p,M as q,J as r,S as s,K as t,Y as u,L as v,Z as w,X as x,Q as y,z};
