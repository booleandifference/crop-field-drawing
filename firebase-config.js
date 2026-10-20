/**
 * Firebase Configuration (Optional)
 * Uncomment and configure to enable cloud saving
 */

// INSTRUCTIONS:
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Select your project
// 3. Go to Project Settings (gear icon)
// 4. Scroll to "Your apps" and click Web icon (</>)
// 5. Copy the firebaseConfig object and paste it below

/*
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    console.log('Firebase initialized successfully');
} else {
    console.warn('Firebase SDK not loaded. Cloud features disabled.');
}

// Helper function to save field to Firestore
async function saveFieldToCloud(fieldData) {
    if (!window.db) {
        console.error('Firestore not initialized');
        return null;
    }

    try {
        const docRef = await window.db.collection('fields').add({
            ...fieldData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Field saved to cloud with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving to cloud:', error);
        throw error;
    }
}

// Helper function to load field from Firestore
async function loadFieldFromCloud(fieldId) {
    if (!window.db) {
        console.error('Firestore not initialized');
        return null;
    }

    try {
        const doc = await window.db.collection('fields').doc(fieldId).get();

        if (doc.exists) {
            console.log('Field loaded from cloud:', fieldId);
            return doc.data();
        } else {
            console.error('Field not found:', fieldId);
            return null;
        }
    } catch (error) {
        console.error('Error loading from cloud:', error);
        throw error;
    }
}

// Helper function to list all fields
async function listFieldsFromCloud() {
    if (!window.db) {
        console.error('Firestore not initialized');
        return [];
    }

    try {
        const snapshot = await window.db.collection('fields')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const fields = [];
        snapshot.forEach(doc => {
            fields.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${fields.length} fields from cloud`);
        return fields;
    } catch (error) {
        console.error('Error listing fields:', error);
        throw error;
    }
}

// Export functions if Firebase is enabled
if (typeof window !== 'undefined') {
    window.firebaseHelpers = {
        saveFieldToCloud,
        loadFieldFromCloud,
        listFieldsFromCloud
    };
}
*/
