import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { SERVER_URL } from '@/constants/Config';

export const useImagePicker = () => {
    const [uploading, setUploading] = useState(false);

    const pickAndUploadImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permesso per la galleria negato!');
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setUploading(true);
            const uri = result.assets[0].uri;
            const formData = new FormData();
            
            // @ts-ignore
            formData.append('image', {
                uri,
                name: 'photo.jpg',
                type: 'image/jpeg',
            });

            try {
                const response = await fetch(`${SERVER_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                const data = await response.json();
                setUploading(false);
                return data.url;
            } catch (error) {
                console.error('Upload failed:', error);
                setUploading(false);
                alert('Caricamento immagine fallito.');
                return null;
            }
        }
        return null;
    };

    return { pickAndUploadImage, uploading };
};
