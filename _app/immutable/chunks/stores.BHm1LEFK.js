import{n,Z as i,Y as c,z as o,x as a}from"./runtime.BSZ0Igsj.js";import{s as f}from"./entry.CprgaSNz.js";function p(s,u,r){if(s==null)return u(void 0),n;const e=s.subscribe(u,r);return e.unsubscribe?()=>e.unsubscribe():e}function v(s,u,r){const e=r[u]??(r[u]={store:null,source:c(void 0),unsubscribe:n});if(e.store!==s)if(e.unsubscribe(),e.store=s??null,s==null)e.source.v=void 0,e.unsubscribe=n;else{var t=!0;e.unsubscribe=p(s,b=>{t?e.source.v=b:a(e.source,b)}),t=!1}return o(e.source)}function x(){const s={};return i(()=>{for(var u in s)s[u].unsubscribe()}),s}const d=()=>{const s=f;return{page:{subscribe:s.page.subscribe},navigating:{subscribe:s.navigating.subscribe},updated:s.updated}},m={subscribe(s){return d().page.subscribe(s)}};export{v as a,m as p,x as s};
