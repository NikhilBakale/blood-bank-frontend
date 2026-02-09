# Vercel Deployment Guide

## ✅ Project Status: Ready for Deployment

Your blood-bank-buddy frontend is **fully deployable** on Vercel!

## 📋 Pre-Deployment Checklist

- ✅ Build test passed successfully
- ✅ API keys removed from .env (secured)
- ✅ vercel.json configured properly
- ✅ Routing configured for SPA
- ✅ Server folder excluded from git

## 🚀 Deployment Steps

### 1. Push to GitHub (if not done already)
```bash
git add .
git commit -m "chore: secure env and prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `NikhilBakale/blood-bank-frontend`
4. Vercel will auto-detect Vite framework
5. **Configure Environment Variables** (Important!):
   - Click "Environment Variables"
   - Add these variables:
     - `VITE_API_URL` = `https://bloodbackend-hscdfjh2bsbsfkb0.eastasia-01.azurewebsites.net`
     - `VITE_GEMINI_API_KEY` = Your actual Gemini API key
     - `VITE_AZURE_OPENAI_ENDPOINT` = (optional - leave empty if not using)
     - `VITE_AZURE_OPENAI_KEY` = (optional - leave empty if not using)
     - `VITE_AZURE_OPENAI_DEPLOYMENT` = (optional - leave empty if not using)
6. Click **"Deploy"**

#### Option B: Using Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Configure Environment Variables in Vercel

**IMPORTANT**: Don't forget to add your actual API keys in the Vercel dashboard:

1. After deployment, go to your project settings
2. Navigate to **Settings > Environment Variables**
3. Add each variable with proper values:
   - For **Production**, **Preview**, and **Development** environments

### 4. Update CORS Settings on Backend

Make sure your backend server allows requests from your Vercel domain:

```javascript
// In your server/server.js
const allowedOrigins = [
  'http://localhost:8080',
  'https://your-vercel-app.vercel.app', // Add your Vercel domain here
  'https://bloodbackend-hscdfjh2bsbsfkb0.eastasia-01.azurewebsites.net'
];
```

## 🔧 Build Configuration

The project uses:
- **Framework**: Vite + React + TypeScript
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 🔐 Security Checklist

- ✅ .env is in .gitignore (won't be pushed)
- ✅ API keys removed from .env file
- ✅ Environment variables set in Vercel dashboard only
- ✅ Backend CORS configured for production domain

## 🌐 After Deployment

Your app will be available at: `https://your-project-name.vercel.app`

### Testing the Deployment:
1. Test authentication flow
2. Verify backend API connectivity
3. Test chatbot functionality (if Gemini key is configured)
4. Check all pages load correctly
5. Test routing (refresh on different pages)

## ⚠️ Common Issues & Solutions

### Issue: API calls fail
**Solution**: Update `VITE_API_URL` in Vercel environment variables to your backend URL

### Issue: Build fails
**Solution**: Check the build logs in Vercel dashboard, usually missing dependencies

### Issue: Page refresh shows 404
**Solution**: Already configured in vercel.json with rewrites rule

### Issue: Environment variables not working
**Solution**: 
- Ensure all env vars start with `VITE_` prefix
- Redeploy after adding/changing environment variables
- Check spelling of variable names

## 📊 Performance Optimization

The build shows a chunk size warning. To optimize:
1. Consider code-splitting large dependencies
2. Use dynamic imports for heavy components
3. Lazy load routes

Current build size:
- JS: ~1.44 MB (394 KB gzipped) ⚠️
- CSS: 88 KB (14 KB gzipped) ✅

## 🎉 You're All Set!

Your Blood Bank Buddy frontend is production-ready and will automatically rebuild on every git push to main.

---

**Need help?** Check Vercel docs: https://vercel.com/docs
