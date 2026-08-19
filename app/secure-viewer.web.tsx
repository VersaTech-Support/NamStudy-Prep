import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
  } catch (error) {
    console.error('Failed to parse solution URL:', error);
  }

  return {
    bucket: 'papers',
    path: fullUrl,
  };
};

export default function SecureViewerWeb() {
  const { filePath } = useLocalSearchParams();

  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      const actualFilePath = Array.isArray(filePath) ? filePath[0] : filePath;

      if (!actualFilePath) {
        console.error('SecureViewerWeb: missing filePath');
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
        console.error('Error loading secure document:', err);
        setError('Failed to load the solution securely.');
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
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

  return (
    <View style={styles.container}>
      <iframe
        src={secureUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Solution Viewer"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  text: { color: '#fff', marginTop: 10, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  backText: {
    color: '#7C3AED',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});
