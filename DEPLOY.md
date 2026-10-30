# Putting Spotter online

This guide takes about 20 minutes, all in the browser. You'll set up:

- **Supabase**: the live database and logins.
- **GitHub secrets**: so GitHub can set up and update the live database for you.
- **Vercel**: hosts the app at a web address like `spotter-yourname.vercel.app`.

Never paste passwords, keys or tokens into a chat or a file in this repo. They only go into the Supabase, GitHub and Vercel settings pages described below.

Dashboards change their wording from time to time. If a label below doesn't match exactly, look for the closest one.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (signing in with GitHub is easiest).
2. Click **New project**.
   - **Name:** `spotter`
   - **Database password:** click **Generate a password**, then save it in your password manager. You'll need it in step 4.
   - **Region:** pick one in the western US, closest to Portland.
   - **Plan:** Free.
3. Click **Create new project** and wait a minute or two while it sets up.

## 2. Copy four values from Supabase

Keep a Supabase tab open. You'll paste these into GitHub and Vercel later.

| What | Where to find it in Supabase |
| --- | --- |
| **Project ID** (letters like `abcdefghijklmnop`) | Project Settings → General → Project ID. It's also in the dashboard's web address. |
| **Project URL** (`https://….supabase.co`) | Project Settings → Data API → Project URL |
| **Publishable key** (starts `sb_publishable_`) | Project Settings → API Keys |
| **Secret key** (starts `sb_secret_`) | Project Settings → API Keys. Click to reveal it, or create one if there isn't one yet. Keep this one private. |

## 3. Create a Supabase access token

1. Click your profile picture (top right) → **Account preferences** → **Access Tokens**.
2. Click **Generate new token**, name it `GitHub deploy`, and copy it. Supabase only shows it once.

## 4. Add three secrets to GitHub

1. Open [the repo's Actions secrets](https://github.com/captainmeep/spotter/settings/secrets/actions) (Settings → Secrets and variables → Actions).
2. Click **New repository secret** three times, once for each of these:

| Name | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | the token from step 3 |
| `SUPABASE_DB_PASSWORD` | the database password from step 1 |
| `SUPABASE_PROJECT_ID` | the Project ID from step 2 |

## 5. Set up the live database

1. Open the repo's **Actions** tab and click **Deploy database** in the list on the left.
2. Click **Run workflow** → **Run workflow** (on the `main` branch).
3. Wait for the green tick (about a minute). This creates all of Spotter's tables and security rules.

From now on this runs by itself whenever a database change is merged into `main`.

## 6. Supabase login settings

In Supabase, open **Authentication**:

1. Under **Sign In / Providers**, turn **off** "Allow new users to sign up". Spotter is just for Scott, and clients still join through their invite links.
2. Under the **Email** provider settings, set **Email OTP Expiration** to `86400` seconds, so invite links last 24 hours. Save.

## 7. Put the app on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **Add New…** → **Project**, then **Import** next to `captainmeep/spotter`. If you don't see it, click the option to adjust GitHub app permissions and give Vercel access to the repo.
3. Leave the framework as **Next.js**. Open **Environment Variables** and add:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |
| `SUPABASE_SECRET_KEY` | the secret key |

4. Click **Deploy**. After a couple of minutes Vercel shows your web address, like `https://spotter-something.vercel.app`. Copy it.

## 8. Tell Supabase the web address

In Supabase, open **Authentication** → **URL Configuration**:

1. **Site URL:** your Vercel address, e.g. `https://spotter-something.vercel.app`
2. **Redirect URLs:** click **Add URL** and add the same address followed by `/**`, e.g. `https://spotter-something.vercel.app/**`. Save.

## 9. Create Scott's account

1. In Supabase, open **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter Scott's email and a temporary password, tick **Auto Confirm User**, and click **Create user**.
3. Scott logs in at your Vercel address, then opens the menu in the top right → **Account settings** to add his name and choose his own password.
4. In **Programs** → **Exercise library**, he can click **Add starter exercises** to get going.

Only create Scott's account this way: everyone added in the Supabase dashboard becomes a trainer. Clients should always be added and invited from inside Spotter.

## How updates work after this

- When a pull request is merged into `main`, Vercel puts the new version live within a few minutes, and the **Deploy database** action applies any database changes.
- Vercel also makes a preview link for each open pull request. Previews use the **live** database, so anything you do there is real.

## If something goes wrong

- **The site says it's missing Supabase settings:** check the three environment variables in Vercel (Project → Settings → Environment Variables), then redeploy from the Deployments tab.
- **Deploy database fails:** check the three GitHub secrets are spelled exactly as above.
- **Invite links say they expired straight away:** check the redirect URL in step 8 and the expiry in step 6.
- **Nothing loads after a quiet week:** free Supabase projects pause when unused. Open the project in Supabase and click **Restore**.

## Costs

- **Supabase Free** is enough for one trainer and their clients. It pauses after a week with no activity.
- **Vercel Hobby** (free) is meant for personal, non-commercial projects. Testing it yourself is fine, but once Scott runs his business on it, Vercel's terms may require the **Pro** plan (about $20 a month).
