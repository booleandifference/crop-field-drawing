# Firebase Deployment Guide

This guide will help you deploy the Crop Field Drawing App to Google Firebase.

## Prerequisites

1. **Google Account** with Firebase access
2. **Node.js** installed (v16 or higher)
3. **Firebase CLI** installed globally

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

## Step 3: Initialize Firebase Project

### Option A: Create a New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "crop-field-tracker")
4. Follow the setup wizard

### Option B: Use Existing Project

If you already have a Firebase project, note its Project ID.

## Step 4: Configure Firebase in Your App

1. Update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

2. The `firebase.json` file is already configured for hosting.

## Step 5: Deploy to Firebase Hosting

```bash
# From the project root directory
firebase deploy --only hosting
```

Your app will be deployed to: `https://your-project-id.web.app`

## Step 6: Add Firestore Database (Optional)

To save field designs to the cloud:

### Enable Firestore

1. Go to Firebase Console → Firestore Database
2. Click "Create Database"
3. Choose "Production Mode" or "Test Mode"
4. Select a region (choose closest to your users)

### Add Firebase SDK to Your App

Add this to `index.html` before the closing `</body>` tag:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>

<script>
  // Your Firebase configuration
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
</script>
```

### Get Your Firebase Config

1. Firebase Console → Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (</>) to add a web app
4. Copy the `firebaseConfig` object

## Step 7: Python Cloud Functions (Advanced)

For advanced geometry calculations using Shapely/GeoPandas:

### Create Python Cloud Function

1. Create `functions` directory:

```bash
mkdir functions
cd functions
```

2. Create `main.py`:

```python
from firebase_functions import https_fn
from shapely.geometry import Polygon, Point
from shapely import buffer
import json

@https_fn.on_request()
def calculate_tracks(req: https_fn.Request) -> https_fn.Response:
    """Calculate accurate tractor tracks using Shapely"""

    # Parse request
    data = req.get_json()
    boundary = data.get('boundary')
    obstacles = data.get('obstacles', [])
    track_width = data.get('trackWidth', 30)
    headland_buffer = data.get('headlandBuffer', 1.0)

    # Create polygon from boundary
    poly = Polygon([(p['x'], p['y']) for p in boundary])

    # Buffer inward for headland
    working_zone = poly.buffer(-track_width * headland_buffer)

    # Process obstacles
    for obstacle in obstacles:
        obs_poly = Polygon([(p['x'], p['y']) for p in obstacle])
        obs_buffered = obs_poly.buffer(track_width * headland_buffer)
        working_zone = working_zone.difference(obs_buffered)

    # Generate tracks (simplified)
    # ... track generation logic ...

    return https_fn.Response(
        json.dumps({
            'workingZone': list(working_zone.exterior.coords),
            'success': True
        }),
        mimetype='application/json'
    )
```

3. Create `requirements.txt`:

```
firebase-functions
shapely
numpy
```

4. Deploy:

```bash
firebase deploy --only functions
```

## Step 8: Custom Domain (Optional)

1. Firebase Console → Hosting
2. Click "Add Custom Domain"
3. Follow DNS configuration steps

## Firestore Security Rules

Create firestore.rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fields/{fieldId} {
      // Allow anyone to read
      allow read: if true;

      // Allow authenticated users to write
      allow write: if request.auth != null;
    }
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

## Environment Variables

For production, use Firebase Config:

```bash
firebase functions:config:set app.api_key="your-api-key"
```

## Monitoring & Analytics

Enable Firebase Analytics:
1. Firebase Console → Analytics
2. Click "Enable Analytics"
3. Follow setup wizard

## Cost Estimation

### Free Tier (Spark Plan) Includes:
- ✅ Hosting: 10 GB storage, 360 MB/day transfer
- ✅ Firestore: 1 GB storage, 50K reads/day, 20K writes/day
- ✅ Cloud Functions: 2M invocations/month

### Upgrade to Blaze (Pay-as-you-go) for:
- Python Cloud Functions (requires Cloud Run)
- More storage and bandwidth
- Production-scale usage

## Testing Before Deployment

Test locally:

```bash
# Start local emulator
firebase emulators:start

# Visit http://localhost:5000
```

## Troubleshooting

### Deploy fails
```bash
firebase logout
firebase login
firebase deploy --debug
```

### Functions not working
- Check logs: `firebase functions:log`
- Ensure billing is enabled for Python functions

### Database permission denied
- Update Firestore security rules
- Enable authentication if required

## Next Steps

1. ✅ Deploy basic hosting
2. Add Firestore integration for saving fields
3. Implement user authentication (Firebase Auth)
4. Add Python Cloud Functions for advanced calculations
5. Set up custom domain
6. Enable Analytics

## Useful Commands

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log

# Open Firebase console
firebase open
```

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
