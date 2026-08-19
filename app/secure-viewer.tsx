import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';

const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
};

const { width, height } = Dimensions.get('window');

// Helper to extract bucket and path from a Supabase public URL
const extractStoragePath = (fullUrl: string) => {
    try {
        const decodedUrl = decodeURIComponent(fullUrl);
        const parts = decodedUrl.split('/object/public/');
        if (parts.length > 1) {
            const pathParts = parts[1].split('/');
            const bucket = pathParts[0];
            const path = pathParts.slice(1).join('/');
            return { bucket, path };
        }
    } catch (e) {
        console.error("Failed to parse URL", e);
    }
    // Fallback if it's already a path or extraction fails
    return { bucket: 'papers', path: fullUrl };
};

export default function SecureViewer() {
    const { filePath } = useLocalSearchParams();
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 1. LOCK THE SCREEN DOWN IMMEDIATELY
        const lockScreen = async () => {
            if (Platform.OS !== 'web') {
                try {
                    await ScreenCapture.preventScreenCaptureAsync();
                } catch (e) {
                    console.warn('Screen capture prevention error:', e);
                }
            }
        };
        lockScreen();

        // 2. FETCH THE GHOST LINK (60-second expiry)
        const fetchSignedUrl = async () => {
            // Safely extract the string (Expo Router can sometimes return an array)
            const actualFilePath = Array.isArray(filePath) ? filePath[0] : filePath;

            if (!actualFilePath) {
                console.error('SecureViewer: missing filePath');
                setLoading(false);
                setError('Unable to open the solution: the document path is missing.');
                return;
            }

            const decodedFilePath = (() => {
                try {
                    return decodeURIComponent(actualFilePath);
                } catch {
                    return actualFilePath;
                }
            })();

            try {
                const { bucket, path } = extractStoragePath(decodedFilePath);
                const { data, error: urlError } = await withTimeout(
                    supabase.storage
                        .from(bucket)
                        .createSignedUrl(path, 60),
                    10000,
                    'Create solution signed URL'
                );

                if (urlError) throw urlError;
                setSecureUrl(data.signedUrl);
            } catch (err) {
                console.error("Error loading secure document:", err);
                setError('Failed to load the solution securely.');
            } finally {
                setLoading(false);
            }
        };

        fetchSignedUrl();

        // 3. UNLOCK THE SCREEN WHEN THEY LEAVE
        return () => {
            if (Platform.OS !== 'web') {
                ScreenCapture.allowScreenCaptureAsync().catch((e) => {
                    // Safely ignore async errors during cleanup
                    console.warn('Screen capture reset error:', e);
                });
            }
        };
    }, [filePath]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.text}>Securing document...</Text>
            </View>
        );
    }

    if (error || !secureUrl) {
        return (
            <View style={styles.centered}>
                <Text style={styles.text}>
                    {error || 'Unable to load the solution.'}
                </Text>
                <Text
                    style={styles.backText}
                    onPress={() => router.back()}
                >
                    Go Back
                </Text>
            </View>
        );
    }

    // Determine the viewer URL based on platform. Android needs Google Docs Viewer for PDFs.
    const viewerUrl = Platform.OS === 'ios' && secureUrl
        ? secureUrl
        : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(secureUrl || '')}`;

    return (
        <View style={styles.container}>
            {/* 4. RENDER YOUR DOCUMENT HERE */}
            <WebView
                source={{ uri: viewerUrl }}
                style={styles.webview}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </View>
                )}
            />

            {/* Watermark overlay across the screen */}
            <View pointerEvents="none" style={styles.watermarkContainer}>
                <Text style={styles.watermark}>Protected by NamStudy Prep</Text>
                <Text style={styles.watermark}>Protected by NamStudy Prep</Text>
                <Text style={styles.watermark}>Protected by NamStudy Prep</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    text: { color: '#fff', marginTop: 10, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
    backText: {
        color: '#7C3AED',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
    },
    webview: { flex: 1, backgroundColor: '#fff' },
    webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    watermarkContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'space-around',
        alignItems: 'center',
        opacity: 0.15,
        transform: [{ rotate: '-45deg' }]
    },
    watermark: {
        color: '#000',
        fontSize: 24,
        fontWeight: 'bold',
        textShadowColor: '#fff',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    }
});