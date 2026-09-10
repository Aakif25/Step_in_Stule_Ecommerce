/* Small, dependency-free WebGL scene: rotating abstract rings and glass-like spheres.
   Draws behind the site, pauses when hidden, and respects reduced-motion preferences. */
(function(){
 function start(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth<768 || (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<4) || ['admin','checkout','cart','account'].includes(document.body.dataset.page))return;
 const host=document.querySelector('.scene-bg');if(!host)return;
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.className='three-background';host.prepend(canvas);
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'});if(!gl){canvas.remove();return;}
 const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
 const fragment=`precision mediump float;
 uniform vec2 resolution;uniform float time;uniform float dark;uniform float scrollY;
 mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
 float torus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}
 float scene(vec3 p){vec3 a=p-vec3(2.6,.6,0.);a.xy*=rot(.4+time*.07);a.yz*=rot(.8+time*.1);float r=torus(a,vec2(1.05,.10));vec3 b=p-vec3(-2.7,-1.2,.3);b.xy*=rot(-.3-time*.05);b.yz*=rot(.9);float r2=torus(b,vec2(.7,.16));float s=length(p-vec3(2.3,-1.6+sin(time*.4)*.18,.1))-.3;return min(min(r,r2),s);}
 vec3 normal(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));}
 void main(){vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;vec3 ro=vec3(0.,0.,5.);vec3 rd=normalize(vec3(uv*3.6,-4.));float t=0.;float hit=0.;for(int i=0;i<48;i++){vec3 p=ro+rd*t;p.y+=sin(scrollY*.0002)*.2;float d=scene(p);if(d<.004){hit=1.;break;}t+=d*.85;if(t>12.)break;}if(hit<.5){gl_FragColor=vec4(0.);return;}vec3 pos=ro+rd*t;vec3 n=normal(pos);vec3 l=normalize(vec3(-2.,4.,5.));float diffuse=max(dot(n,l),0.);float edge=pow(1.-abs(dot(n,-rd)),2.);float shine=pow(max(dot(reflect(-l,n),-rd),0.),28.);vec3 base=mix(vec3(.28,.48,.96),vec3(.30,.52,1.),dark);vec3 col=base*(.3+diffuse*.7)+vec3(1.)*shine*.65;float alpha=mix(.095,.18,dark)*( .35+edge*.7+shine*.25);gl_FragColor=vec4(col,alpha);}`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;}
 let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');}catch{canvas.remove();return;}
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const res=gl.getUniformLocation(program,'resolution'),tm=gl.getUniformLocation(program,'time'),dk=gl.getUniformLocation(program,'dark'),sy=gl.getUniformLocation(program,'scrollY');let raf=0,last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function resize(){const ratio=Math.min(.45,720/innerWidth,480/innerHeight);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);gl.viewport(0,0,canvas.width,canvas.height);draw(0);}
 function draw(ms){gl.uniform2f(res,canvas.width,canvas.height);gl.uniform1f(tm,ms*.001);gl.uniform1f(dk,document.documentElement.dataset.theme==='dark'?1:0);gl.uniform1f(sy,window.scrollY);gl.drawArrays(gl.TRIANGLES,0,6);}
 function frame(ms){if(document.hidden)return;if(ms-last>80){draw(ms);last=ms;}if(!reduced.matches)raf=requestAnimationFrame(frame);}
 function resume(){cancelAnimationFrame(raf);if(!document.hidden){draw(0);if(!reduced.matches)raf=requestAnimationFrame(frame);}}
 window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);new MutationObserver(()=>draw(last)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.style.display='none';});resize();resume();window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}
 const schedule=()=>setTimeout(()=>{if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:3000});else setTimeout(start,100);},1200);
 if(document.readyState==='complete')schedule();else window.addEventListener('load',schedule,{once:true});
})();
