// app/utils/storage.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// Function to upload a file to Firebase Storage
export async function uploadFile(file, path) {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${path}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
}

// Function to upload Aadhaar and PAN card
export async function uploadKycDocuments(aadhaarFile, panFile, phoneNumber) {
  try {
    // Upload Aadhaar card
    const aadhaarCardUrl = await uploadFile(
      aadhaarFile, 
      `kyc/${phoneNumber}/aadhaar`
    );
    
    // Upload PAN card
    const panCardUrl = await uploadFile(
      panFile, 
      `kyc/${phoneNumber}/pan`
    );
    
    return {
      aadhaarCardUrl,
      panCardUrl
    };
  } catch (error) {
    console.error('Error uploading KYC documents:', error);
    throw new Error('Failed to upload KYC documents');
  }
}