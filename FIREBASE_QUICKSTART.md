# Firebase Quick Start - Crop Field Drawing App

## 🚀 Deploy in 5 Minutes

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login
```bash
firebase login
```

### Step 3: Initialize Project
```bash
cd "c:\VS code projects\Crop field drawing app"
firebase init
```

Select:
- ✅ Hosting
- ✅ Functions (optional - for Python backend)
- ✅ Firestore (optional - for cloud storage)

When prompted:
- **Public directory**: Enter `.` (current directory)
- **Single-page app**: Yes
- **GitHub deploys**: No (for now)

### Step 4: Update Project ID

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "YOUR-PROJECT-ID"
  }
}
```

Replace `YOUR-PROJECT-ID` with your Firebase project ID from [Firebase Console](https://console.firebase.google.com/).

### Step 5: Deploy!
```bash
firebase deploy --only hosting
```

Done! Your app is live at: `https://YOUR-PROJECT-ID.web.app`

---

## 🐍 Adding Python Functions (Optional)

### Why Python Functions?

JavaScript (current): ✅ Fast, simple, runs in browser
- Good for prototyping
- Simplified polygon buffering

Python (optional): ✅ Production-grade geometry
- Uses Shapely library (industry standard)
- Accurate polygon operations
- Handles complex fields better

### Deploy Python Functions

```bash
firebase deploy --only functions
```

The Python functions are already created in `/functions/main.py`

### Use Python Functions in Your App

Replace JavaScript calculations with API calls:

```javascript
// Instead of local calculation:
// this.tracks = GeometryUtils.generateTracks(...)

// Call Python Cloud Function:
const response = await fetch('https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/calculate_tracks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    boundary: this.boundaryPoints,
    obstacles: this.obstacles,
    trackWidth: this.trackWidth,
    headlandBuffer: this.headlandBuffer,
    trackAngle: this.trackAngle
  })
});

const data = await response.json();
this.tracks = data.tracks;
this.workingZone = data.workingZone;
```

---

## 💾 Adding Cloud Save (Optional)

### Enable Firestore

1. Go to Firebase Console → Firestore Database
2. Click "Create Database"
3. Choose your region
4. Start in "Test Mode" (for development)

### Add Firebase SDK to HTML

Add before `</body>` in `index.html`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="firebase-config.js"></script>
```

### Configure Firebase

Uncomment and fill in `firebase-config.js` with your project credentials.

### Save to Cloud

```javascript
// Save current field
const fieldId = await window.firebaseHelpers.saveFieldToCloud({
  boundary: this.boundaryPoints,
  obstacles: this.obstacles,
  settings: {
    trackWidth: this.trackWidth,
    headlandBuffer: this.headlandBuffer,
    trackAngle: this.trackAngle
  }
});

console.log('Field saved with ID:', fieldId);
```

---

## 📊 Cost Estimate

### Free Tier (Perfect for starting)

Firebase Spark Plan (FREE):
- ✅ **Hosting**: 10 GB storage, 360 MB/day
- ✅ **Firestore**: 1 GB storage, 50K reads/day
- ✅ **Functions**: 2M invocations/month (JavaScript only)

**Your app easily fits in the free tier!**

### Upgrade to Blaze (Pay-as-you-go)

Only needed if you:
- Want Python Cloud Functions (requires billing)
- Expect >1000 users/day
- Need >1 GB of saved fields

Typical cost: $0-5/month for small-medium usage

---

## 🔒 Security

### Firestore Rules (Production)

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fields/{fieldId} {
      // Anyone can read
      allow read: if true;

      // Only authenticated users can write
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

---

## 🌍 Custom Domain

1. Firebase Console → Hosting → Add custom domain
2. Enter your domain (e.g., `fields.yoursite.com`)
3. Add DNS records (Firebase provides them)
4. Wait for SSL certificate (automatic, ~15 mins)

Done!

---

## 📱 Progressive Web App (PWA)

Make it installable on phones:

1. Add `manifest.json`
2. Add service worker
3. Deploy
4. Users can "Add to Home Screen"

Guide: [Firebase PWA Setup](https://firebase.google.com/docs/hosting/pwa)

---

## 🔧 Troubleshooting

### "Permission denied"
```bash
firebase login --reauth
```

### "Project not found"
Check `.firebaserc` has correct project ID

### Functions not deploying
```bash
# Enable Cloud Functions API
firebase init functions
```

### CORS errors
Python functions already have CORS enabled in `main.py`

---

## 📚 Next Steps

1. ✅ Deploy to Firebase Hosting (5 min)
2. Add Firestore for cloud save (10 min)
3. Add Python functions for better geometry (15 min)
4. Add Firebase Auth for user accounts (20 min)
5. Add custom domain (5 min + DNS propagation)

Total setup time: **30-60 minutes**

---

## 🆘 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- Your app works standalone too - just open `index.html` in a browser!
