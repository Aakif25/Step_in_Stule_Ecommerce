# Step in Style — your store

## 1. Open the website now

1. Extract the ZIP completely. Do not open files while they are still inside the ZIP.
2. Open the extracted `Step-in-Style` folder.
3. Double-click `index.html` in Chrome or Edge.
4. Use the moon/sun button for dark or light mode.
5. Open **Store admin** in the footer, then **Explore local admin demo**.

The preview includes two clearly labelled illustrative products. You can try adding products, photos, videos, descriptions, test orders, reviews and payouts. Preview changes are stored only in this browser. Use test contact details. A preview order never goes to A2Z.

Email signup/login, shared orders and live media storage become available after Supabase is connected. Your real Supabase catalogue starts empty: the illustrative products and preview orders are never copied into your live database automatically.

Some browsers isolate storage for files opened with `file://`. If the preview does not share data between pages, use the free Vercel deployment below. No npm install, terminal or build command is needed for the website.

## 2. What is in the download?

- `index.html`: home page.
- `shop.html`: product search, category/price/availability filters and sorting.
- `product.html`: separate product page, gallery, description and reviews.
- `cart.html`, `checkout.html`, `confirmation.html`: COD ordering and receipt.
- `account.html`: optional customer login, signup, reset password and saved details.
- `admin.html`: admin product editor, orders, reviews, payouts, categories and settings.
- `about.html`, `contact.html`, `policies.html`: business information.
- `styles.css`: responsive styling and light/dark themes.
- `scene.js`: animated WebGL rings/spheres, with reduced-motion and no-WebGL fallbacks.
- `app.js`, `admin.js`, `data.js`: storefront, admin and Supabase connection logic.
- `config.js`: the only website file you need to edit for the connection.
- `assets/`: your supplied logo and generated preview/brand imagery.
- `setup/supabase.sql`: initial database, access rules and media buckets.
- `setup/make-admin.sql`: grants access to the admin account you choose.
- `vercel.json`: static website configuration.

Use the `dist/` directory as the web root if working from the Sites source repository instead of the ZIP. The ZIP has the website files directly inside `Step-in-Style/` for easier use.

## 3. Connect your Supabase project

Use a new Supabase project for this store. The initial SQL creates tables and policies; run it once.

1. Create/open your project at https://supabase.com/dashboard.
2. Open **SQL Editor** → **New query**.
3. Copy all of `setup/supabase.sql`, paste it and click **Run**.
4. Open **Authentication** settings and enable **Anonymous Sign-Ins**. This is needed for guest checkout and review uploads. It creates a background guest session without requiring the customer to register.
5. Enable email/password sign-in. Keep email confirmation enabled for customer accounts.
6. Configure a custom SMTP email provider for real customer signup confirmations and password reset emails. Supabase’s default email service is limited; do not assume it can send production emails to all customers.
7. In the project’s **Connect** dialog, copy your project URL and **publishable key** (`sb_publishable_...`).
8. Open `config.js` in a text editor and set:

```javascript
window.STORE_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  publishableKey: 'sb_publishable_YOUR_KEY',
  demoMode: false
};
```

Only the publishable key belongs here. Never put a secret or `service_role` key in the frontend or GitHub. Access rules in the SQL protect admin data even though the publishable key is visible.

Reference: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

## 4. Create your admin account

1. In Supabase, open **Authentication → Users**.
2. Add a user with your own email and a strong password, and confirm the email using the available dashboard option.
3. Open `setup/make-admin.sql` and replace `YOUR-ADMIN-EMAIL@example.com` with that exact email.
4. Run the edited query in SQL Editor.
5. Visit your deployed `/admin.html` page and sign in.

There is no hardcoded admin password and no public admin signup. Ordinary customer accounts cannot become admins themselves.

## 5. Upload to GitHub and deploy with Vercel

1. Create a GitHub repository.
2. Upload the CONTENTS of the extracted `Step-in-Style` folder. `index.html` should be visible at the repository root, not hidden inside another folder.
3. Commit the uploaded files.
4. In Vercel, choose **Add New → Project** and import that GitHub repository.
5. Set the Framework Preset to **Other**.
6. Use the repository root as Root Directory.
7. Override Build Command and leave it empty. Leave Install Command empty. No dependencies are required.
8. Set Output Directory to `.` if a value is requested.
9. Deploy.

The included `vercel.json` preserves `.html` routes and uses the root as output. All website source files can be committed to GitHub. Uploaded product and review media go into Supabase Storage, so future admin product changes do not require a Vercel deployment.

Reference: [Vercel static HTML/CSS/JavaScript deployment](https://vercel.com/docs/builds/configure-a-build).

## 6. Finish authentication URLs

Once Vercel gives you the real website URL:

1. In Supabase **Authentication → URL Configuration**, set **Site URL** to your website origin, for example `https://your-store.vercel.app`.
2. Add the exact redirect URL `https://your-store.vercel.app/account.html`.
3. Also allow `https://your-store.vercel.app/account.html?reset=1` for password recovery.
4. Add equivalent entries for your custom domain if you use one.
5. Test signup confirmation and password reset from the deployed HTTPS site, not a double-clicked local file.

Reference: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 7. Prepare your real store

1. Sign into the admin panel.
2. Open **Settings**. Add your real phone number, WhatsApp number and email.
3. Set serviceable districts, delivery pricing, and your actual delivery/return terms.
4. Add categories if needed.
5. Add products in the four-step editor:
   - Basic information and private A2Z product reference.
   - 1–5 photos, plus up to 3 videos.
   - Text, headings, images and videos for the description.
   - Selling price, private supplier costs, availability, preview and publish.
6. Use actual supplier product photographs and verified descriptions. Generated preview products are examples only.
7. Place a test order, verify it in admin, then mark it Cancelled. Confirm totals before marketing the store.
8. Submit a test review; approve it in admin and confirm approved media displays. Check an ordinary customer cannot open the admin panel.

Photo uploads support JPG, PNG and WebP up to 5 MB each in the interface. Product videos support MP4/WebM up to 25 MB. Review submissions allow up to 3 photos and 1 video. Use short, compressed videos for mobile customers. Description images are separate from the 1–5 gallery photos.

## 8. Your torch example

For a customer to pay Rs. 1,500 total:

**Option A — delivery shown separately**
- Product selling price: Rs. 1,100.
- Customer delivery charge: Rs. 400 per order.
- A2Z product cost: Rs. 600.
- Supplier delivery cost: Rs. 400.
- Expected profit: 1,100 + 400 − 600 − 400 = **Rs. 500**.

**Option B — delivery included**
- Enable “Product prices already include delivery” in Settings.
- Product selling price: Rs. 1,500.
- A2Z product cost: Rs. 600.
- Supplier delivery cost: Rs. 400.
- Expected profit: 1,500 − 600 − 400 = **Rs. 500**.

Supplier delivery is initially estimated as the highest supplier delivery cost among the products in an order. After submitting to A2Z, record the actual total product cost, delivery and extra charges on that order. This is especially important for multi-item orders. Dashboard profit excludes cancelled/returned orders, and bank payments are recorded separately. Advertising expenses are not automatically calculated.

## 9. Everyday order handling

1. Open **Orders**, confirm the customer details and availability.
2. Open an order and select **Copy order details**.
3. Paste/enter them into A2Z’s seller portal yourself.
4. Record A2Z’s order reference and set “Submitted to A2Z”.
5. Update delivery/cancellation/return status as the supplier informs you.
6. When A2Z transfers your money, record the amount and bank reference in **Payouts**. Use Notes to identify the related orders or partial payment.

This build does not auto-submit orders to A2Z or read your bank. There is no customer tracking page, no card gateway, and no compulsory customer account.

## 10. What has been checked / remaining activation work

- JavaScript syntax, local entrypoints and asset references.
- Data-layer preview checkout, Rs. 500 profit example, duplicate-order prevention, admin gating, review moderation and product archival.
- Responsive layouts are implemented for desktop, tablet and mobile; reduced motion and WebGL fallback are included.
- Supabase live authentication, SQL execution, storage policies and real order persistence need a final connected test in your project. No Supabase credentials were provided during the build, so these live services have not been activated or tested against your project.
- Browser visual/end-to-end testing and native WebMCP validation were not performed in this build environment.

Guest access is rate-limited by Supabase Auth and per-session database checks. Configure production Auth rate limits and monitor guest users and storage usage. If you later enable CAPTCHA, add its token flow to the guest/sign-in forms before enabling the enforcement switch. Review media is private while pending; approved media receives short-lived signed links. Remove unreferenced uploads through Supabase Storage as part of normal maintenance.

Accounts show orders placed while signed into that account. Earlier guest orders are not automatically linked by matching an email address. Checkout confirmations are shown onscreen; no automatic order email/SMS/WhatsApp message service is configured. Admin notifications are counts that refresh when opening a section; this is not a push-notification service.
