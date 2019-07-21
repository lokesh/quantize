if(!t)var t={map:function(t,r){var n={};return r?t.map(function(t,o){return n.index=o,r.call(n,t)}):t.slice()},naturalOrder:function(t,r){return t<r?-1:t>r?1:0},sum:function(t,r){var n={};return t.reduce(r?function(t,o,i){return n.index=i,t+r.call(n,o)}:function(t,r){return t+r},0)},max:function(r,n){return Math.max.apply(null,n?t.map(r,n):r)}};var r=function(){var r=5,n=8-r,o=1e3;function i(t,n,o){return(t<<2*r)+(n<<r)+o}function u(t){var r=[],n=!1;function o(){r.sort(t),n=!0}return{push:function(t){r.push(t),n=!1},peek:function(t){return n||o(),void 0===t&&(t=r.length-1),r[t]},pop:function(){return n||o(),r.pop()},size:function(){return r.length},map:function(t){return r.map(t)},debug:function(){return n||o(),r}}}function e(t,r,n,o,i,u,e){this.r1=t,this.r2=r,this.g1=n,this.g2=o,this.b1=i,this.b2=u,this.histo=e}function s(){this.vboxes=new u(function(r,n){return t.naturalOrder(r.vbox.count()*r.vbox.volume(),n.vbox.count()*n.vbox.volume())})}function h(r,n){if(n.count()){var o=n.r2-n.r1+1,u=n.g2-n.g1+1,e=t.max([o,u,n.b2-n.b1+1]);if(1==n.count())return[n.copy()];var s,h,c,f,a=0,v=[],l=[];if(e==o)for(s=n.r1;s<=n.r2;s++){for(f=0,h=n.g1;h<=n.g2;h++)for(c=n.b1;c<=n.b2;c++)f+=r[i(s,h,c)]||0;v[s]=a+=f}else if(e==u)for(s=n.g1;s<=n.g2;s++){for(f=0,h=n.r1;h<=n.r2;h++)for(c=n.b1;c<=n.b2;c++)f+=r[i(h,s,c)]||0;v[s]=a+=f}else for(s=n.b1;s<=n.b2;s++){for(f=0,h=n.r1;h<=n.r2;h++)for(c=n.g1;c<=n.g2;c++)f+=r[i(h,c,s)]||0;v[s]=a+=f}return v.forEach(function(t,r){l[r]=a-t}),function(t){var r,o,i,u,e,h=t+"1",c=t+"2",f=0;for(s=n[h];s<=n[c];s++)if(v[s]>a/2){for(i=n.copy(),u=n.copy(),e=(r=s-n[h])<=(o=n[c]-s)?Math.min(n[c]-1,~~(s+o/2)):Math.max(n[h],~~(s-1-r/2));!v[e];)e++;for(f=l[e];!f&&v[e-1];)f=l[--e];return i[c]=e,u[h]=i[c]+1,[i,u]}}(e==o?"r":e==u?"g":"b")}}return e.prototype={volume:function(t){return this._volume&&!t||(this._volume=(this.r2-this.r1+1)*(this.g2-this.g1+1)*(this.b2-this.b1+1)),this._volume},count:function(t){var r=this.histo;if(!this._count_set||t){var n,o,u,e=0;for(n=this.r1;n<=this.r2;n++)for(o=this.g1;o<=this.g2;o++)for(u=this.b1;u<=this.b2;u++)e+=r[i(n,o,u)]||0;this._count=e,this._count_set=!0}return this._count},copy:function(){return new e(this.r1,this.r2,this.g1,this.g2,this.b1,this.b2,this.histo)},avg:function(t){var n=this.histo;if(!this._avg||t){var o,u,e,s,h=0,c=1<<8-r,f=0,a=0,v=0;for(u=this.r1;u<=this.r2;u++)for(e=this.g1;e<=this.g2;e++)for(s=this.b1;s<=this.b2;s++)h+=o=n[i(u,e,s)]||0,f+=o*(u+.5)*c,a+=o*(e+.5)*c,v+=o*(s+.5)*c;this._avg=h?[~~(f/h),~~(a/h),~~(v/h)]:[~~(c*(this.r1+this.r2+1)/2),~~(c*(this.g1+this.g2+1)/2),~~(c*(this.b1+this.b2+1)/2)]}return this._avg},contains:function(t){var r=t[0]>>n;return gval=t[1]>>n,bval=t[2]>>n,r>=this.r1&&r<=this.r2&&gval>=this.g1&&gval<=this.g2&&bval>=this.b1&&bval<=this.b2}},s.prototype={push:function(t){this.vboxes.push({vbox:t,color:t.avg()})},palette:function(){return this.vboxes.map(function(t){return t.color})},size:function(){return this.vboxes.size()},map:function(t){for(var r=this.vboxes,n=0;n<r.size();n++)if(r.peek(n).vbox.contains(t))return r.peek(n).color;return this.nearest(t)},nearest:function(t){for(var r,n,o,i=this.vboxes,u=0;u<i.size();u++)((n=Math.sqrt(Math.pow(t[0]-i.peek(u).color[0],2)+Math.pow(t[1]-i.peek(u).color[1],2)+Math.pow(t[2]-i.peek(u).color[2],2)))<r||void 0===r)&&(r=n,o=i.peek(u).color);return o},forcebw:function(){var r=this.vboxes;r.sort(function(r,n){return t.naturalOrder(t.sum(r.color),t.sum(n.color))});var n=r[0].color;n[0]<5&&n[1]<5&&n[2]<5&&(r[0].color=[0,0,0]);var o=r.length-1,i=r[o].color;i[0]>251&&i[1]>251&&i[2]>251&&(r[o].color=[255,255,255])}},{quantize:function(c,f){if(!c.length||f<2||f>256)return!1;var a=function(t){var o,u=new Array(1<<3*r);return t.forEach(function(t){o=i(t[0]>>n,t[1]>>n,t[2]>>n),u[o]=(u[o]||0)+1}),u}(c);a.forEach(function(){});var v=function(t,r){var o,i,u,s=1e6,h=0,c=1e6,f=0,a=1e6,v=0;return t.forEach(function(t){(o=t[0]>>n)<s?s=o:o>h&&(h=o),(i=t[1]>>n)<c?c=i:i>f&&(f=i),(u=t[2]>>n)<a?a=u:u>v&&(v=u)}),new e(s,h,c,f,a,v,r)}(c,a),l=new u(function(r,n){return t.naturalOrder(r.count(),n.count())});function p(t,r){for(var n,i=t.size(),u=0;u<o;){if(i>=r)return;if(u++>o)return;if((n=t.pop()).count()){var e=h(a,n),s=e[0],c=e[1];if(!s)return;t.push(s),c&&(t.push(c),i++)}else t.push(n),u++}}l.push(v),p(l,.75*f);for(var b=new u(function(r,n){return t.naturalOrder(r.count()*r.volume(),n.count()*n.volume())});l.size();)b.push(l.pop());p(b,f);for(var g=new s;b.size();)g.push(b.pop());return g}}}();module.exports=r.quantize;
//# sourceMappingURL=index.js.map
