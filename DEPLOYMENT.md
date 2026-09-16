# Deployment Guide — CertifyFlow

CertifyFlow is designed to be cloud-native with **zero required external pip dependencies** and automatic dynamic port binding (`$PORT`).

---

## Option 1: Render.com (Recommended — 100% Free Tier)

Render provides free hosting with automatic HTTPS SSL certificates and GitHub continuous deployment.

### Steps:
1. Push your repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for CertifyFlow"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to **[render.com](https://render.com)** and sign in with GitHub.
3. Click **"New +"** &rarr; **"Web Service"**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name:** `certifyflow` (or any name)
   - **Environment:** `Python 3`
   - **Build Command:** *(leave blank or `echo 'ready'`)*
   - **Start Command:** `python execution/serve.py`
   - **Plan:** Free
6. *(Optional)* Under **Environment Variables**, add:
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `your-email@gmail.com`
   - `SMTP_PASS`: `<your-16-char-google-app-password>`
7. Click **"Create Web Service"**. In ~60 seconds, your site will be live at:
   `https://certifyflow.onrender.com`

---

## Option 2: Railway.app (Instant 1-Click Deploy)

1. Go to **[railway.app](https://railway.app)**.
2. Click **"New Project"** &rarr; **"Deploy from GitHub repo"**.
3. Select your repository.
4. Railway automatically detects the [`Procfile`](file:///d:/madam%20jii/Procfile) or [`Dockerfile`](file:///d:/madam%20jii/Dockerfile) and assigns a public URL with HTTPS.

---

## Option 3: Docker (Any Cloud VPS: AWS, DigitalOcean, Linode)

A production-ready [`Dockerfile`](file:///d:/madam%20jii/Dockerfile) is included.

### Build and run locally or on a server:
```bash
# Build Docker image
docker build -t certifyflow .

# Run container on port 8080
docker run -d -p 8080:8080 --name certifyflow-app certifyflow
```
Access at `http://<your-server-ip>:8080`.

---

## Option 4: Instant Public URL Right Now (Cloudflare Tunnel / Ngrok)

If you want to share a live public HTTPS link with team members immediately from your machine:

### Using Cloudflare Tunnel (Free, no account required):
```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8080
```
*Cloudflare will print an instant public URL (e.g. `https://random-subdomain.trycloudflare.com`) pointing directly to your local server.*

### Using LocalTunnel:
```bash
npx localtunnel --port 8080
```
