import{a as o,t as c,l as q,c as e,s as l,f as z}from"../chunks/disclose-version.BJv7zzrQ.js";import{p as K,t as C,a as M,h as i,l as u,a5 as w}from"../chunks/runtime.DRhwkgl6.js";import{s as N}from"../chunks/render.CODwM1Bo.js";import{t as E,p as Q,a as G,P as R,L as S,b as T}from"../chunks/package.D7K9_EHC.js";import{i as A}from"../chunks/props.CHhJcNf9.js";import{e as U,s as H,a as I,i as V}from"../chunks/attributes.BLtkv_Od.js";import{u as W,s as X}from"../chunks/store.BgVyKbRO.js";import{b as Y}from"../chunks/entry.Ce1TfEHb.js";import{p as Z}from"../chunks/stores.CJZbvBMV.js";const $=p=>p.split("/").filter(a=>a&&a!=="."&&a!==".."),aa=p=>{const a=[],s=$(p);s.length&&a.push({type:"separator",path:"/"});let v="";for(let n=0;n<s.length;n++){const _=s[n];v+="/"+_,a.push({type:"piece",name:_,path:v}),n!==s.length-1&&a.push({type:"separator",path:v})}return a};var ea=c("•",1),ta=c('<a class="svelte-44vg7j"> </a>'),sa=c("/",1),ra=c('<span class="separator svelte-44vg7j"><!></span>'),oa=c('<div class="breadcrumb svelte-44vg7j"><a class="svelte-44vg7j"><!></a><!></div>');function J(p,a){K(a,!0);const s={};W(s);const v=()=>X(Z,"$page",s),n=u(()=>a.path??v().url.pathname),_=u(()=>a.selected_path===null?null:a.selected_path===void 0?i(n):a.selected_path),h=u(()=>a.base_path??Y),L=u(()=>aa(i(n))),b=u(()=>i(h)||"/");var y=oa(),d=e(y),B=e(d);A(B,()=>a.children,m=>{var t=q(),k=z(t);H(()=>a.children,k),o(m,t)},m=>{var t=ea();o(m,t)});var D=l(d);U(D,65,()=>i(L),V,(m,t,k)=>{var x=q(),f=z(x);A(f,()=>w(t).type==="piece",g=>{var r=ta(),F=e(r);C(()=>{I(r,"href",i(h)+w(t).path),E(r,"selected",w(t).path===i(_)),N(F,w(t).name)}),o(g,r)},g=>{var r=ra(),F=e(r);A(F,()=>a.separator,P=>{var j=q(),O=z(j);H(()=>a.separator,O),o(P,j)},P=>{var j=sa();o(P,j)}),o(g,r)}),o(m,x)}),C(()=>{I(d,"href",i(b)),E(d,"selected",i(b)===i(_))}),o(p,y),M()}var na=c("🧶",1),ia=c("🧶",1),la=c('<main class="width_md svelte-1pyh03k"><div class="prose"><section class="svelte-1pyh03k"><header class="box"><h1 class="svelte-1pyh03k"> </h1></header> <!></section></div> <section class="box w_100 mb_lg svelte-1pyh03k"><div class="panel p_md width_md"><!></div></section> <section class="box svelte-1pyh03k"><nav class="mb_lg"><!></nav> <!></section></main>');function ua(p,a){K(a,!0);const s=Q(G.homepage,G,T);var v=la(),n=e(v),_=e(n),h=e(_),L=e(h),b=e(L),y=l(l(h,!0));J(y,{children:(f,g)=>{var r=na();o(f,r)},$$slots:{default:!0}});var d=l(l(n,!0)),B=e(d),D=e(B);R(D,{pkg:s});var m=l(l(d,!0)),t=e(m),k=e(t);J(k,{children:(f,g)=>{var r=ia();o(f,r)},$$slots:{default:!0}});var x=l(l(t,!0));S(x,{pkg:s}),C(()=>N(b,s.repo_name)),o(p,v),M()}export{ua as component};
