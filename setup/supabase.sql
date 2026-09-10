-- Step in Style: initial schema for a NEW Supabase project.
-- Run once in the Supabase SQL Editor. No demo products or admin passwords are inserted.
begin;
create table if not exists public.store_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.store_admins enable row level security;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.store_admins where user_id=auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.categories (name text primary key check(char_length(name) between 1 and 60));
insert into public.categories(name) values ('Tech & Gadgets'),('Home & Living'),('Beauty & Care'),('Everyday Essentials') on conflict do nothing;
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(title) between 1 and 160),
 category text not null default '', summary text not null default '' check(char_length(summary)<=600),
 price numeric(12,2) not null default 0 check(price>=0),
 compare_price numeric(12,2) check(compare_price is null or compare_price>price),
 images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=5),
 videos jsonb not null default '[]' check(jsonb_typeof(videos)='array' and jsonb_array_length(videos)<=3),
 description jsonb not null default '[]' check(jsonb_typeof(description)='array' and jsonb_array_length(description)<=50),
 variants jsonb not null default '[]' check(jsonb_typeof(variants)='array' and jsonb_array_length(variants)<=30),
 available boolean not null default true, status text not null default 'draft' check(status in ('draft','published','archived')),
 featured boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or (price>0 and char_length(category)>0 and jsonb_array_length(images) between 1 and 5))
);
create table if not exists public.product_costs (
 product_id uuid primary key references public.products(id) on delete cascade,
 supplier_cost numeric(12,2) not null default 0 check(supplier_cost>=0),
 delivery_cost numeric(12,2) not null default 0 check(delivery_cost>=0),
 supplier_code text not null default '' check(char_length(supplier_code)<=80),
 supplier_url text not null default ''
);
create table if not exists public.store_settings (id integer primary key check(id=1),data jsonb not null default '{}' check(jsonb_typeof(data)='object'));
insert into public.store_settings(id,data) values(1,'{"businessName":"Step in Style","phone":"","whatsapp":"","email":"","address":"Sri Lanka","deliveryFee":400,"deliveryIncluded":false,"heroText":"Thoughtful finds for your home, your routine, and everything in between.","districts":[],"returnPolicy":"Please contact us before returning an item. Return eligibility, time limits, and any delivery charges will be confirmed by our team.","deliveryPolicy":"Cash on delivery is available in our serviceable areas. We will confirm availability and delivery details before dispatch."}'::jsonb) on conflict do nothing;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check(char_length(name)<=100),phone text not null default '' check(char_length(phone)<=18),
 address text not null default '' check(char_length(address)<=300),city text not null default '' check(char_length(city)<=80),district text not null default ''
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 number text not null unique, user_id uuid references auth.users(id) on delete set null,
 idempotency uuid not null unique, customer jsonb not null, items jsonb not null,
 subtotal numeric(12,2) not null check(subtotal>=0), delivery_fee numeric(12,2) not null check(delivery_fee>=0),
 total numeric(12,2) not null check(total=subtotal+delivery_fee),
 payment_method text not null default 'COD' check(payment_method='COD'),
 status text not null default 'New' check(status in ('New','Confirmed','Submitted to A2Z','Delivered','Cancelled','Returned')),
 supplier_ref text not null default '' check(char_length(supplier_ref)<=100),
 created_at timestamptz not null default now()
);
create index if not exists sis_orders_user on public.orders(user_id,created_at desc);
create table if not exists public.order_costs (
 order_id uuid primary key references public.orders(id) on delete cascade,
 supplier_total numeric(12,2) not null check(supplier_total>=0),
 supplier_delivery numeric(12,2) not null check(supplier_delivery>=0),
 extra_cost numeric(12,2) not null default 0 check(extra_cost>=0),
 expected_profit numeric(12,2) not null,
 admin_notes text not null default '' check(char_length(admin_notes)<=2000)
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 80),
 rating integer not null check(rating between 1 and 5),text text not null check(char_length(text) between 5 and 2000),
 media jsonb not null default '[]' check(jsonb_typeof(media)='array' and jsonb_array_length(media)<=4),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reply text not null default '' check(char_length(reply)<=1000),created_at timestamptz not null default now(),
 unique(product_id,user_id)
);
create index if not exists sis_reviews_product on public.reviews(product_id,status,created_at desc);
create table if not exists public.payouts (
 id uuid primary key default gen_random_uuid(),amount numeric(12,2) not null check(amount>0),
 paid_at date not null,reference text not null unique check(char_length(reference) between 1 and 120),
 notes text not null default '' check(char_length(notes)<=1000),created_at timestamptz not null default now()
);

-- Table access: policies apply even if someone bypasses the visible interface.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.store_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_costs enable row level security;
alter table public.reviews enable row level security;
alter table public.payouts enable row level security;
revoke all on public.store_admins,public.categories,public.products,public.product_costs,public.store_settings,public.profiles,public.orders,public.order_costs,public.reviews,public.payouts from anon,authenticated;
grant select on public.categories,public.products,public.store_settings,public.reviews to anon;
grant select on public.categories,public.products,public.product_costs,public.store_settings,public.profiles,public.orders,public.order_costs,public.reviews,public.payouts to authenticated;
grant insert,update on public.profiles to authenticated;
grant update on public.products,public.store_settings to authenticated;
grant update(status,reply) on public.reviews to authenticated;
grant insert on public.payouts to authenticated;
create policy sis_categories_read on public.categories for select to anon,authenticated using(true);
create policy sis_products_public on public.products for select to anon,authenticated using(status='published');
create policy sis_products_admin_read on public.products for select to authenticated using(public.is_admin());
create policy sis_products_admin_update on public.products for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy sis_costs_admin on public.product_costs for select to authenticated using(public.is_admin());
create policy sis_settings_read on public.store_settings for select to anon,authenticated using(true);
create policy sis_settings_admin on public.store_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy sis_profiles_self_read on public.profiles for select to authenticated using(id=auth.uid());
create policy sis_profiles_self_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy sis_profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy sis_orders_read on public.orders for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy sis_order_costs_read on public.order_costs for select to authenticated using(public.is_admin());
create policy sis_reviews_public on public.reviews for select to anon,authenticated using(status='approved');
create policy sis_reviews_admin_read on public.reviews for select to authenticated using(public.is_admin());
create policy sis_reviews_admin_update on public.reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy sis_payouts_read on public.payouts for select to authenticated using(public.is_admin());
create policy sis_payouts_insert on public.payouts for insert to authenticated with check(public.is_admin());

create or replace function public.save_product(p_product jsonb,p_cost jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid;result public.products;begin
 if not public.is_admin() then raise exception 'Admin access required';end if;
 pid:=coalesce(nullif(p_product->>'id','')::uuid,gen_random_uuid());
 if not exists(select 1 from public.categories where name=p_product->>'category') then raise exception 'Choose an existing category';end if;
 insert into public.products(id,title,category,summary,price,compare_price,images,videos,description,variants,available,status,featured)
 values(pid,trim(p_product->>'title'),p_product->>'category',coalesce(p_product->>'summary',''),coalesce((p_product->>'price')::numeric,0),nullif(p_product->>'compare_price','')::numeric,coalesce(p_product->'images','[]'),coalesce(p_product->'videos','[]'),coalesce(p_product->'description','[]'),coalesce(p_product->'variants','[]'),coalesce((p_product->>'available')::boolean,true),coalesce(p_product->>'status','draft'),coalesce((p_product->>'featured')::boolean,false))
 on conflict(id) do update set title=excluded.title,category=excluded.category,summary=excluded.summary,price=excluded.price,compare_price=excluded.compare_price,images=excluded.images,videos=excluded.videos,description=excluded.description,variants=excluded.variants,available=excluded.available,status=excluded.status,featured=excluded.featured,updated_at=now()
 returning * into result;
 insert into public.product_costs(product_id,supplier_cost,delivery_cost,supplier_code,supplier_url)
 values(pid,coalesce((p_cost->>'supplier_cost')::numeric,0),coalesce((p_cost->>'delivery_cost')::numeric,0),coalesce(p_cost->>'supplier_code',''),coalesce(p_cost->>'supplier_url',''))
 on conflict(product_id) do update set supplier_cost=excluded.supplier_cost,delivery_cost=excluded.delivery_cost,supplier_code=excluded.supplier_code,supplier_url=excluded.supplier_url;
 return to_jsonb(result);
end $$;
create or replace function public.save_categories(p_names jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required';end if;
 if jsonb_typeof(p_names)<>'array' or jsonb_array_length(p_names)>100 then raise exception 'Invalid category list';end if;
 if exists(select 1 from public.products where status<>'archived' and not (p_names ? category)) then raise exception 'Move products before removing their category';end if;
 delete from public.categories where not (p_names ? name);
 insert into public.categories(name) select trim(value) from jsonb_array_elements_text(p_names) on conflict do nothing;
end $$;

-- Guest checkout uses a Supabase anonymous session; no account signup is shown to the shopper.
-- Prices, delivery and private cost snapshots are calculated here, never trusted from the browser.
create or replace function public.place_order(p_customer jsonb,p_items jsonb,p_idempotency uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid(); oid uuid:=gen_random_uuid(); cfg jsonb; line jsonb;p public.products;c public.product_costs;
 q integer;v text;items_snapshot jsonb:='[]';subtotal numeric:=0;delivery numeric:=0;supplier_total numeric:=0;supplier_delivery numeric:=0;
 customer_clean jsonb;result public.orders;phone text;alt_phone text;district text;
begin
 if uid is null then raise exception 'A guest or customer session is required';end if;
 if p_idempotency is null then raise exception 'Missing order request key';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select * into result from public.orders where idempotency=p_idempotency and user_id=uid;
 if found then return to_jsonb(result);end if;
 if (select count(*) from public.orders where user_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many recent orders. Please contact the store or try again later.';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Your cart must contain 1–30 items';end if;
 if octet_length(p_customer::text)>10000 then raise exception 'Customer details are too long';end if;
 if coalesce(char_length(trim(p_customer->>'name')),0) not between 1 and 100 or coalesce(char_length(trim(p_customer->>'address')),0) not between 1 and 300 or coalesce(char_length(trim(p_customer->>'city')),0) not between 1 and 80 then raise exception 'Complete your name and delivery address';end if;
 phone:=regexp_replace(coalesce(p_customer->>'phone',''),'[\s()-]','','g');phone:=regexp_replace(phone,'^\+?94','0');
 alt_phone:=regexp_replace(coalesce(p_customer->>'altPhone',''),'[\s()-]','','g');alt_phone:=regexp_replace(alt_phone,'^\+?94','0');
 if phone !~ '^0[0-9]{9}$' or (alt_phone<>'' and alt_phone !~ '^0[0-9]{9}$') then raise exception 'Enter a valid Sri Lankan phone number';end if;
 district:=p_customer->>'district';
 if district is null or not(district=any(array['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'])) then raise exception 'Select a valid district';end if;
 select data into cfg from public.store_settings where id=1;
 if jsonb_array_length(coalesce(cfg->'districts','[]'))>0 and not(cfg->'districts' ? district) then raise exception 'This district is not currently serviceable';end if;
 if exists(select 1 from jsonb_array_elements(p_items) t group by t->>'id',coalesce(t->>'variant','') having count(*)>1) then raise exception 'Duplicate cart lines are not allowed';end if;
 for line in select * from jsonb_array_elements(p_items) loop
  if coalesce(line->>'qty','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity';end if;
  q:=(line->>'qty')::integer;if q not between 1 and 20 then raise exception 'Choose a quantity from 1 to 20';end if;
  select * into p from public.products where id=(line->>'id')::uuid and status='published' and available for share;
  if not found then raise exception 'A product in your cart is no longer available';end if;
  v:=coalesce(line->>'variant','');
  if (jsonb_array_length(p.variants)>0 and not(p.variants ? v)) or (jsonb_array_length(p.variants)=0 and v<>'') then raise exception 'A selected product option is unavailable';end if;
  select * into c from public.product_costs where product_id=p.id;
  if not found then raise exception 'This product is not ready to order. Please contact the store.';end if;
  subtotal:=subtotal+p.price*q;supplier_total:=supplier_total+c.supplier_cost*q;supplier_delivery:=greatest(supplier_delivery,c.delivery_cost);
  items_snapshot:=items_snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'title',p.title,'variant',v,'qty',q,'price',p.price,'image',p.images->>0));
 end loop;
 delivery:=case when coalesce((cfg->>'deliveryIncluded')::boolean,false) then 0 else coalesce((cfg->>'deliveryFee')::numeric,0) end;
 if delivery<0 then raise exception 'Invalid delivery configuration';end if;
 customer_clean:=jsonb_build_object('name',trim(p_customer->>'name'),'phone',phone,'altPhone',alt_phone,'address',trim(p_customer->>'address'),'city',trim(p_customer->>'city'),'district',district,'landmark',left(coalesce(p_customer->>'landmark',''),160),'email',left(coalesce(p_customer->>'email',''),160),'notes',left(coalesce(p_customer->>'notes',''),500));
 insert into public.orders(id,number,user_id,idempotency,customer,items,subtotal,delivery_fee,total)
 values(oid,'SIS-'||to_char(now(),'YYMMDD')||'-'||upper(left(replace(oid::text,'-',''),8)),uid,p_idempotency,customer_clean,items_snapshot,subtotal,delivery,subtotal+delivery) returning * into result;
 insert into public.order_costs(order_id,supplier_total,supplier_delivery,expected_profit) values(oid,supplier_total,supplier_delivery,subtotal+delivery-supplier_total-supplier_delivery);
 return to_jsonb(result);
end $$;

create or replace function public.admin_orders() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 if not public.is_admin() then raise exception 'Admin access required';end if;
 select coalesce(jsonb_agg(to_jsonb(o)||(to_jsonb(c)-'order_id') order by o.created_at desc),'[]') into result from public.orders o join public.order_costs c on c.order_id=o.id;
 return result;
end $$;
create or replace function public.update_order(p_id uuid,p_changes jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare t numeric;sc numeric;dc numeric;ec numeric;begin
 if not public.is_admin() then raise exception 'Admin access required';end if;
 select total into t from public.orders where id=p_id for update;if not found then raise exception 'Order not found';end if;
 sc:=(p_changes->>'supplier_total')::numeric;dc:=(p_changes->>'supplier_delivery')::numeric;ec:=(p_changes->>'extra_cost')::numeric;
 if sc is null or dc is null or ec is null or least(sc,dc,ec)<0 then raise exception 'Invalid order costs';end if;
 update public.orders set status=p_changes->>'status',supplier_ref=coalesce(p_changes->>'supplier_ref','') where id=p_id;
 update public.order_costs set supplier_total=sc,supplier_delivery=dc,extra_cost=ec,expected_profit=t-sc-dc-ec,admin_notes=coalesce(p_changes->>'admin_notes','') where order_id=p_id;
end $$;
create or replace function public.submit_review(p_review jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();m jsonb;pid uuid;result public.reviews;images integer:=0;videos integer:=0;media jsonb:=coalesce(p_review->'media','[]');begin
 if uid is null then raise exception 'A guest or customer session is required';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if octet_length(p_review::text)>30000 then raise exception 'Review is too large';end if;
 if jsonb_typeof(media)<>'array' or jsonb_array_length(media)>4 then raise exception 'Too many review attachments';end if;
 pid:=(p_review->>'product_id')::uuid;
 if not exists(select 1 from public.products where id=pid and status='published') then raise exception 'Product is unavailable';end if;
 if exists(select 1 from public.reviews where product_id=pid and user_id=uid) then raise exception 'You have already submitted a review for this product';end if;
 if (select count(*) from public.reviews where user_id=uid and created_at>now()-interval '1 day')>=5 then raise exception 'Please try again tomorrow';end if;
 for m in select * from jsonb_array_elements(media) loop
  if m->>'type'='image' then images:=images+1;elsif m->>'type'='video' then videos:=videos+1;else raise exception 'Invalid review media';end if;
  if coalesce(split_part(m->>'url','/',1),'')<>uid::text then raise exception 'Review media must belong to your session';end if;
  if not exists(select 1 from storage.objects where bucket_id='review-media' and name=m->>'url') then raise exception 'Review attachment not found';end if;
 end loop;
 if images>3 or videos>1 then raise exception 'Use up to 3 photos and 1 video';end if;
 insert into public.reviews(product_id,user_id,name,rating,text,media) values(pid,uid,trim(p_review->>'name'),(p_review->>'rating')::integer,trim(p_review->>'text'),media) returning * into result;
 return jsonb_build_object('id',result.id,'status',result.status);
end $$;
revoke all on function public.save_product(jsonb,jsonb),public.save_categories(jsonb),public.place_order(jsonb,jsonb,uuid),public.admin_orders(),public.update_order(uuid,jsonb),public.submit_review(jsonb) from public;
grant execute on function public.save_product(jsonb,jsonb),public.save_categories(jsonb),public.place_order(jsonb,jsonb,uuid),public.admin_orders(),public.update_order(uuid,jsonb),public.submit_review(jsonb) to authenticated;

-- Product media is public. Review media remains private until moderation approves its review.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('product-media','product-media',true,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
 ('review-media','review-media',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy sis_product_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-media' and public.is_admin());
create policy sis_product_media_admin_select on storage.objects for select to authenticated using(bucket_id='product-media' and public.is_admin());
create policy sis_product_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-media' and public.is_admin());
create policy sis_review_media_insert on storage.objects for insert to authenticated with check(bucket_id='review-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy sis_review_media_owner on storage.objects for select to authenticated using(bucket_id='review-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy sis_review_media_public on storage.objects for select to anon,authenticated using(bucket_id='review-media' and exists(select 1 from public.reviews r where r.status='approved' and r.media @> jsonb_build_array(jsonb_build_object('url',storage.objects.name))));
create policy sis_review_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='review-media' and public.is_admin());
commit;
