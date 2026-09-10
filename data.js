/* Shared data layer. Live data uses Supabase; the labelled preview is device-local. */
(function () {
  'use strict';
  const cfg = window.STORE_CONFIG || {};
  const live = Boolean(cfg.supabaseUrl && cfg.publishableKey);
  const demo = !live && cfg.demoMode === true;
  const url = (cfg.supabaseUrl || '').replace(/\/$/, '');
  const uuid = () => globalThis.crypto?.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^Math.random()*16>>Number(c)/4).toString(16));
  const defaults = { businessName:'Step in Style', phone:'', whatsapp:'', email:'', address:'Sri Lanka', deliveryFee:400, deliveryIncluded:false, heroTitle:'Your everyday. A little extraordinary.', heroText:'Thoughtful finds for your home, your routine, and everything in between.', returnPolicy:'Please contact us before returning an item. Return eligibility, time limits, and any delivery charges will be confirmed by our team.', deliveryPolicy:'Cash on delivery is available in our serviceable areas. We will confirm availability and delivery details before dispatch.', districts:[], facebook:'', instagram:'' };
  const demoProducts = [
    {id:'10000000-0000-4000-8000-000000000001',title:'Studio Wireless Headphones',category:'Tech & Gadgets',summary:'A little quiet. A lot of style. Soft ivory finishes and a comfortable over-ear silhouette for your everyday soundtrack.',price:7900,compare_price:null,images:['assets/headphones.webp'],videos:[],description:[{type:'heading',text:'Make room for your soundtrack.'},{type:'text',text:'This is an illustrative preview product. Add your own supplier-confirmed features, specifications and warranty information before publishing real products.'},{type:'image',url:'assets/headphones.webp'},{type:'text',text:'Use the admin description builder to add text, images and demonstration videos in any order.'}],variants:['Ivory'],available:true,status:'published',featured:true,created_at:'2026-09-10T08:00:00Z'},
    {id:'10000000-0000-4000-8000-000000000002',title:'Glow Portable Table Lamp',category:'Home & Living',summary:'The finishing touch for your favourite corner. A sculptural orange silhouette that brings a little warmth to the everyday.',price:4900,compare_price:null,images:['assets/lamp.webp'],videos:[],description:[{type:'heading',text:'A brighter kind of everyday.'},{type:'text',text:'This is an illustrative preview product, with a generated product image. Replace it with your actual supplier product details and photos before accepting real orders.'},{type:'image',url:'assets/lamp.webp'}],variants:['Orange'],available:true,status:'published',featured:true,created_at:'2026-09-10T07:00:00Z'}
  ];
  const seed = () => ({products:structuredClone(demoProducts),costs:{[demoProducts[0].id]:{supplier_cost:5400,delivery_cost:400,supplier_code:'DEMO-001',supplier_url:''},[demoProducts[1].id]:{supplier_cost:3000,delivery_cost:400,supplier_code:'DEMO-002',supplier_url:''}},orders:[],reviews:[],payouts:[],categories:['Tech & Gadgets','Home & Living','Beauty & Care','Everyday Essentials'],settings:{...defaults},profile:{}});
  let dbPromise,refreshPromise;
  function database(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('step-in-style-local-preview-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Local preview storage is unavailable. Allow browser storage or connect Supabase.'));});return dbPromise;}
  async function localRead(){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get('store');r.onsuccess=()=>resolve(r.result||seed());r.onerror=()=>reject(r.error);});}
  async function localWrite(data){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(data,'store');tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Could not save the preview. Your browser storage may be full.'));});}
  function getSession(){try{return JSON.parse(sessionStorage.getItem('sis-auth')||'null');}catch{return null;}}
  function putSession(data){if(data?.access_token){sessionStorage.setItem('sis-auth',JSON.stringify({...data,expires_at:Date.now()+((data.expires_in||3600)*1000)}));}else sessionStorage.removeItem('sis-auth');}
  async function raw(path,options={},auth=true){
    if(!live)throw Error('Connect Supabase to use live accounts and shared store data.');
    let s=getSession();
    if(auth && s?.refresh_token && s.expires_at<Date.now()+60000){
      if(!refreshPromise)refreshPromise=raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}},false).then(x=>{putSession(x);return x;}).catch(e=>{putSession(null);throw Error('Your session expired. Please sign in again.');}).finally(()=>{refreshPromise=null;});
      s=await refreshPromise;
    }
    const body=options.body;
    const headers={apikey:cfg.publishableKey,...options.headers};
    if(auth && s?.access_token)headers.Authorization='Bearer '+s.access_token;
    if(body && !(body instanceof Blob))headers['Content-Type']='application/json';
    const response=await fetch(url+path,{...options,headers,body:body instanceof Blob?body:body===undefined?undefined:JSON.stringify(body)});
    let payload=null;const text=await response.text();try{payload=text?JSON.parse(text):null;}catch{payload=text;}
    if(!response.ok)throw Error(payload?.msg||payload?.message||payload?.error_description||payload?.error||'The request could not be completed. Please try again.');
    return payload;
  }
  async function rest(table,query='',options={}){return raw('/rest/v1/'+table+(query?'?'+query:''),{...options,headers:{Prefer:'return=representation',...options.headers}});}
  async function rpc(name,body={}){return raw('/rest/v1/rpc/'+name,{method:'POST',body});}
  async function ensureGuest(){if(!live)return null;let s=getSession();if(!s){const r=await raw('/auth/v1/signup',{method:'POST',body:{data:{guest:true}}},false);putSession(r);s=getSession();if(!s)throw Error('Guest checkout is unavailable. The store owner must enable anonymous sign-ins in Supabase.');}return s;}
  const user = () => getSession()?.user || null;
  async function getSettings(){if(demo)return (await localRead()).settings;const r=await rest('store_settings','id=eq.1&select=data');return {...defaults,...r?.[0]?.data};}
  async function getProducts(admin=false){if(demo)return (await localRead()).products.filter(p=>admin||p.status==='published');return await rest('products','select=*&order=created_at.desc'+(admin?'':'&status=eq.published'));}
  async function getProduct(id,admin=false){return (await getProducts(admin)).find(p=>p.id===id)||null;}
  async function getCategories(){if(demo)return (await localRead()).categories;return (await rest('categories','select=name&order=name')).map(c=>c.name);}
  async function isAdmin(){if(demo)return sessionStorage.getItem('sis-demo-admin')==='true';if(!user())return false;return Boolean(await rpc('is_admin'));}
  async function requireAdmin(){if(!(await isAdmin()))throw Error('An authorised admin account is required.');}
  async function getCosts(){await requireAdmin();if(demo)return (await localRead()).costs;const rows=await rest('product_costs','select=*');return Object.fromEntries(rows.map(r=>[r.product_id,r]));}
  async function saveProduct(product,cost){await requireAdmin();if(demo){const d=await localRead();const p={...product,id:product.id||uuid(),created_at:product.created_at||new Date().toISOString()};d.products=d.products.filter(x=>x.id!==p.id);d.products.unshift(p);d.costs[p.id]=cost;await localWrite(d);return p;}return rpc('save_product',{p_product:product,p_cost:cost});}
  async function archiveProduct(id){await requireAdmin();if(demo){const d=await localRead();d.products=d.products.map(p=>p.id===id?{...p,status:'archived'}:p);return localWrite(d);}return rest('products','id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{status:'archived'}});}
  async function saveCategories(categories){await requireAdmin();if(demo){const d=await localRead();d.categories=categories;return localWrite(d);}return rpc('save_categories',{p_names:categories});}
  async function saveSettings(settings){await requireAdmin();if(demo){const d=await localRead();d.settings={...defaults,...settings};return localWrite(d);}return rest('store_settings','id=eq.1',{method:'PATCH',body:{data:settings}});}
  function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read this file.'));r.readAsDataURL(file);});}
  async function upload(file,kind='product'){
    const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
    if(!allowed.includes(file.type))throw Error('Use JPG, PNG, WebP, MP4 or WebM files.');
    const max=file.type.startsWith('image/')?5:25;
    if(file.size>max*1024*1024)throw Error('This '+(max===5?'image':'video')+' exceeds the '+max+' MB limit.');
    if(kind==='product')await requireAdmin();else await ensureGuest();
    if(demo)return {url:await readFile(file),type:file.type.startsWith('video/')?'video':'image'};
    const bucket=kind==='product'?'product-media':'review-media';
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'})[file.type];
    const path=user().id+'/'+uuid()+'.'+ext;
    await raw('/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
    return {url:kind==='product'?url+'/storage/v1/object/public/'+bucket+'/'+path:path,type:file.type.startsWith('video/')?'video':'image'};
  }
  async function mediaUrl(media){if(!live||/^https:\/\//.test(media.url)||/^data:(image|video)\//.test(media.url))return media.url;const r=await raw('/storage/v1/object/sign/review-media/'+media.url,{method:'POST',body:{expiresIn:600}});return r.signedURL?.startsWith('http')?r.signedURL:url+'/storage/v1'+r.signedURL;}
  const cartKey='sis-cart-'+(live?'live':'preview');
  function cart(){try{return JSON.parse(localStorage.getItem(cartKey)||'[]');}catch{return [];}}
  function setCart(rows){sessionStorage.removeItem('sis-checkout-key');localStorage.setItem(cartKey,JSON.stringify(rows));window.dispatchEvent(new Event('cartchange'));}
  function addCart(id,qty=1,variant=''){const rows=cart();const found=rows.find(x=>x.id===id&&x.variant===variant);if(found)found.qty=Math.min(20,found.qty+qty);else rows.push({id,qty:Math.min(20,qty),variant});setCart(rows);}
  function changeCart(index,qty){const rows=cart();if(qty<=0)rows.splice(index,1);else if(rows[index])rows[index].qty=Math.min(20,qty);setCart(rows);}
  async function cartDetails(){const [products,settings]=await Promise.all([getProducts(),getSettings()]);let missing=false;const items=cart().map((line,index)=>{const p=products.find(p=>p.id===line.id);if(!p){missing=true;return null;}return {...line,index,product:p};}).filter(Boolean);const subtotal=items.reduce((s,i)=>s+Number(i.product.price)*i.qty,0);const delivery=items.length && !settings.deliveryIncluded?Number(settings.deliveryFee):0;return {items,settings,subtotal,delivery,total:subtotal+delivery,missing};}
  const normalizePhone=p=>String(p||'').replace(/[\s()-]/g,'').replace(/^\+94/,'0').replace(/^94(?=\d{9}$)/,'0');
  function validateCustomer(c){if(!c.name?.trim()||!c.address?.trim()||!c.district||!c.city?.trim())throw Error('Complete your name and delivery address.');if(!/^0\d{9}$/.test(normalizePhone(c.phone)))throw Error('Enter a valid Sri Lankan phone number, for example 077 123 4567.');if(c.altPhone&&!/^0\d{9}$/.test(normalizePhone(c.altPhone)))throw Error('Check the alternative phone number.');}
  async function createOrder(customer,key){validateCustomer(customer);customer={...customer,phone:normalizePhone(customer.phone),altPhone:normalizePhone(customer.altPhone)};if(!demo){await ensureGuest();return rpc('place_order',{p_customer:customer,p_items:cart(),p_idempotency:key});}
    const d=await localRead();const existing=d.orders.find(o=>o.idempotency===key);if(existing)return existing;
    const details=await cartDetails();if(!details.items.length||details.missing)throw Error('Review your cart. A product may no longer be available.');
    if(details.items.some(i=>!i.product.available||(i.product.variants.length&&!i.product.variants.includes(i.variant))))throw Error('A selected product or variant is unavailable.');
    const supplier_total=details.items.reduce((s,i)=>s+Number(d.costs[i.id]?.supplier_cost||0)*i.qty,0);
    const supplier_delivery=Math.max(0,...details.items.map(i=>Number(d.costs[i.id]?.delivery_cost||0)));
    const order={id:uuid(),number:'PREVIEW-'+String(Date.now()).slice(-7),idempotency:key,customer,items:details.items.map(i=>({id:i.id,title:i.product.title,variant:i.variant,qty:i.qty,price:i.product.price,image:i.product.images[0]})),subtotal:details.subtotal,delivery_fee:details.delivery,total:details.total,status:'New',created_at:new Date().toISOString(),supplier_total,supplier_delivery,extra_cost:0,expected_profit:details.total-supplier_total-supplier_delivery,supplier_ref:'',admin_notes:''};d.orders.unshift(order);await localWrite(d);return order;
  }
  async function getOrders(admin=false){if(admin)await requireAdmin();if(demo)return admin?(await localRead()).orders:[];if(admin)return rpc('admin_orders');if(!user())return [];return rest('orders','select=*&order=created_at.desc');}
  async function updateOrder(id,changes){await requireAdmin();if(demo){const d=await localRead();d.orders=d.orders.map(o=>o.id===id?{...o,...changes,expected_profit:o.total-(changes.supplier_total??o.supplier_total)-(changes.supplier_delivery??o.supplier_delivery)-(changes.extra_cost??o.extra_cost)}:o);return localWrite(d);}return rpc('update_order',{p_id:id,p_changes:changes});}
  async function getReviews(productId,admin=false){if(admin)await requireAdmin();let r;if(demo)r=(await localRead()).reviews.filter(x=>(!productId||x.product_id===productId)&&(admin||x.status==='approved'));else r=await rest('reviews','select=*&order=created_at.desc'+(productId?'&product_id=eq.'+encodeURIComponent(productId):'')+(admin?'':'&status=eq.approved'));return Promise.all(r.map(async x=>({...x,media:await Promise.all((x.media||[]).map(async m=>({...m,resolved:await mediaUrl(m).catch(()=>null)})))})));}
  async function submitReview(data){if(demo){const d=await localRead();const r={...data,id:uuid(),status:'pending',created_at:new Date().toISOString(),reply:''};d.reviews.unshift(r);await localWrite(d);return r;}await ensureGuest();return rpc('submit_review',{p_review:data});}
  async function moderateReview(id,status,reply=''){await requireAdmin();if(demo){const d=await localRead();d.reviews=d.reviews.map(x=>x.id===id?{...x,status,reply}:x);return localWrite(d);}return rest('reviews','id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{status,reply}});}
  async function getPayouts(){await requireAdmin();if(demo)return (await localRead()).payouts;return rest('payouts','select=*&order=paid_at.desc');}
  async function addPayout(payout){await requireAdmin();if(demo){const d=await localRead();d.payouts.unshift({...payout,id:uuid()});return localWrite(d);}return rest('payouts','',{method:'POST',body:payout});}
  async function signIn(email,password){const r=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}},false);putSession(r);return r;}
  async function signUp(email,password,name){const r=await raw('/auth/v1/signup?redirect_to='+encodeURIComponent(location.href.split(/[?#]/)[0]),{method:'POST',body:{email,password,data:{full_name:name}}},false);if(r.access_token)putSession(r);return r;}
  async function signOut(){try{if(live&&getSession())await raw('/auth/v1/logout',{method:'POST'});}finally{putSession(null);sessionStorage.removeItem('sis-last-order');sessionStorage.removeItem('sis-demo-admin');}}
  async function recover(email){return raw('/auth/v1/recover?redirect_to='+encodeURIComponent(location.href.split(/[?#]/)[0]+'?reset=1'),{method:'POST',body:{email}},false);}
  async function updatePassword(password){return raw('/auth/v1/user',{method:'PUT',body:{password}});}
  async function getProfile(){if(demo)return (await localRead()).profile;if(!user())return {};const r=await rest('profiles','id=eq.'+user().id+'&select=*');return r?.[0]||{};}
  async function saveProfile(profile){if(!user())throw Error('Sign in to save your details.');return rest('profiles','',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{id:user().id,...profile}});}
  async function initAuth(){if(!live)return;const h=new URLSearchParams(location.hash.slice(1));if(h.get('access_token')){const token=h.get('access_token');const r=await raw('/auth/v1/user',{headers:{Authorization:'Bearer '+token}},false);putSession({access_token:token,refresh_token:h.get('refresh_token'),expires_in:Number(h.get('expires_in')||3600),user:r});history.replaceState(null,'',location.pathname+location.search);}else if(h.get('error_description'))throw Error(h.get('error_description'));}
  async function resetDemo(){await requireAdmin();await localWrite(seed());setCart([]);}
  window.Store={live,demo,uuid,defaults,getSettings,getProducts,getProduct,getCategories,getCosts,saveProduct,archiveProduct,saveCategories,saveSettings,upload,mediaUrl,cart,setCart,addCart,changeCart,cartDetails,normalizePhone,validateCustomer,createOrder,getOrders,updateOrder,getReviews,submitReview,moderateReview,getPayouts,addPayout,user,isAdmin,signIn,signUp,signOut,recover,updatePassword,getProfile,saveProfile,initAuth,resetDemo,enableDemoAdmin:()=>{if(demo)sessionStorage.setItem('sis-demo-admin','true');}};
})();
