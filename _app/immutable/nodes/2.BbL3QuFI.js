import{a as r,l as h,t as m,c as n,f as k,s as t,m as Z}from"../chunks/disclose-version.BJv7zzrQ.js";import{p as U,t as f,h as i,a as W,l as A,i as $,J as aa}from"../chunks/runtime.DRhwkgl6.js";import{s as x,d as ea}from"../chunks/render.CODwM1Bo.js";import{i as d}from"../chunks/props.CHhJcNf9.js";import{s as w,a as p}from"../chunks/attributes.BLtkv_Od.js";import{t as K,s as B,f as ra,p as ta,a as N,L as oa,b as sa,c as O,P as ia,d as Q}from"../chunks/package.D7K9_EHC.js";import{b as R}from"../chunks/entry.Ce1TfEHb.js";import{u as na,s as va}from"../chunks/store.BgVyKbRO.js";import{p as _a}from"../chunks/stores.CJZbvBMV.js";var la=m('<div class="repo_name svelte-1widkfd"> </div>'),da=m("<img>"),ca=m("<blockquote> </blockquote>"),ma=m('<p class="text_align_center"> <!></p>'),ga=m('<div class="homepage_url svelte-1widkfd"><a class="chip svelte-1widkfd"> </a></div>'),ua=m('<a class="chip svelte-1widkfd">repo</a>'),fa=m('<a class="chip svelte-1widkfd" title="version"> </a>'),ha=m('<a class="chip svelte-1widkfd">npm</a>'),ka=m('<blockquote class="npm_url svelte-1widkfd"> </blockquote>'),pa=m('<div class="package_summary svelte-1widkfd"><header class="box svelte-1widkfd"><!> <!></header> <!> <!> <!> <!> <div class="links svelte-1widkfd"><!> <!> <!></div> <!></div>');function ba(D,e){U(e,!0);const y={};na(y);const q=()=>va(_a,"$page",y),F=A(()=>e.pkg),C=A(()=>{let{package_json:o}=i(F);return[o]}),c=A(()=>i(C)[0]),L=A(()=>e.pkg.homepage_url+"/favicon.png");var J=pa(),z=n(J),P=n(z);d(P,()=>e.repo_name,o=>{var a=h(),l=k(a);w(()=>e.repo_name,l,()=>e.pkg.repo_name),r(o,a)},o=>{var a=la(),l=n(a);f(()=>x(l,e.pkg.repo_name)),r(o,a)});var b=t(P,!0);b.nodeValue="  ";var E=t(b);d(E,()=>e.logo,o=>{var a=h(),l=k(a);w(()=>e.logo,l,()=>i(L)),r(o,a)},o=>{var a=da();f(()=>{p(a,"src",i(L)),p(a,"alt",`logo for ${e.pkg.repo_name??""}`),K(a,"pixelated",e.pixelated_logo),B(a,"width","var(--size, var(--icon_size_xl2))"),B(a,"height","var(--size, var(--icon_size_xl2))")}),r(o,a)});var M=t(t(z,!0));d(M,()=>i(c).motto,o=>{var a=h(),l=k(a);d(l,()=>e.motto,g=>{var s=h(),v=k(s);w(()=>e.motto,v,()=>i(c).motto,()=>i(c).icon),r(g,s)},g=>{var s=ca(),v=n(s);f(()=>x(v,`${i(c).motto??""}
				${i(c).icon??""}`)),r(g,s)}),r(o,a)});var S=t(t(M,!0));d(S,()=>i(c).description,o=>{var a=h(),l=k(a);d(l,()=>e.description,g=>{var s=h(),v=k(s);w(()=>e.description,v,()=>i(c).description,()=>i(c).icon),r(g,s)},g=>{var s=ma(),v=n(s),G=t(v);d(G,()=>!i(c).motto,H=>{var I=Z(H);f(()=>x(I,i(c).icon)),r(H,I)}),f(()=>x(v,`${i(c).description??""} `)),r(g,s)}),r(o,a)});var T=t(t(S,!0));d(T,()=>e.children,o=>{var a=h(),l=k(a);w(()=>e.children,l),r(o,a)});var V=t(t(T,!0));d(V,()=>e.pkg.homepage_url,o=>{var a=h(),l=k(a);d(l,()=>e.homepage_url,g=>{var s=h(),v=k(s);w(()=>e.homepage_url,v,()=>e.pkg.homepage_url),r(g,s)},g=>{var s=ga(),v=n(s),G=n(v);f(()=>x(G,ra(e.pkg.homepage_url))),f(()=>{p(v,"href",e.pkg.homepage_url),K(v,"selected",e.pkg.homepage_url===q().url.href)}),r(g,s)}),r(o,a)});var u=t(t(V,!0)),_=n(u);d(_,()=>e.pkg.repo_url,o=>{var a=ua();f(()=>p(a,"href",e.pkg.repo_url)),r(o,a)});var j=t(t(_,!0));d(j,()=>e.pkg.changelog_url,o=>{var a=fa(),l=n(a);f(()=>{p(a,"href",e.pkg.changelog_url),x(l,i(c).version)}),r(o,a)});var X=t(t(j,!0));d(X,()=>e.pkg.npm_url,o=>{var a=ha();f(()=>p(a,"href",e.pkg.npm_url)),r(o,a)});var Y=t(t(u,!0));d(Y,()=>e.pkg.npm_url,o=>{var a=h(),l=k(a);d(l,()=>e.npm_url,g=>{var s=h(),v=k(s);w(()=>e.npm_url,v,()=>e.pkg.npm_url),r(g,s)},g=>{var s=ka(),v=n(s);f(()=>x(v,`npm i -D ${i(c).name??""}`)),r(g,s)}),r(o,a)}),r(D,J),W()}var xa=(D,e)=>$(e,!i(e)),wa=m("🪜",1),ya=m("🔨",1),qa=m('<div class="box w_100"><!></div>'),za=m('<div class="box"><!></div>'),ja=m('<a class="mb_xs">about</a>'),Pa=m('<main class="box w_100 svelte-1mls9ls"><div class="box width_md"><section class="prose box svelte-1mls9ls"><h1>gro</h1> <a class="panel p_md box mb_xl3" title="source repo" href="https://github.com/ryanatkn/gro"><img alt="a pixelated green oak acorn with a glint of sun"></a> <aside>This website is a work in progress!<br> For now, docs are in <a href="https://github.com/ryanatkn/gro">the source repo</a></aside></section> <section class="panel mb_lg p_md w_100 relative svelte-1mls9ls"><button class="toggle icon_button svelte-1mls9ls"><!></button> <!></section> <section class="svelte-1mls9ls"><!></section></div> <div hidden>Mastodon verification: <a rel="me" href="https://hci.social/@ryanatkn">@ryanatkn@hci.social</a></div></main>');function Ba(D,e){U(e,!0);const y=ta(N.homepage,N,sa);let q=aa(!1);var F=Pa(),C=n(F),c=n(C),L=n(c),J=t(t(L,!0)),z=n(J);p(z,"src",`${R??""}/favicon.png`),B(z,"width","var(--icon_size_lg)"),B(z,"height","var(--icon_size_lg)");var P=t(t(c,!0)),b=n(P);b.__click=[xa,q];var E=n(b);d(E,()=>i(q),u=>{var _=wa();r(u,_)},u=>{var _=ya();r(u,_)});var M=t(t(b,!0));d(M,()=>i(q),u=>{var _=qa();O(3,_,()=>Q);var j=n(_);ia(j,{pkg:y}),r(u,_)},u=>{var _=za();O(3,_,()=>Q);var j=n(_);ba(j,{pkg:y}),r(u,_)});var S=t(t(P,!0)),T=n(S);{var V=u=>{var _=ja();p(_,"href",`${R??""}/about`),r(u,_)};oa(T,{pkg:y,logo_header:V})}f(()=>p(b,"title",i(q)?"show package summary":"show package detail")),r(D,F),W()}ea(["click"]);export{Ba as component};
