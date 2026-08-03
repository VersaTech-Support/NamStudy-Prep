import AsyncStorage from '@react-native-async-storage/async-storage';

export const setCacheData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error silently handled
    console.warn('Error saving to cache:', e);
  }
};

export const getCacheData = async (key: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    // error reading value silently handled
    console.warn('Error reading from cache:', e);
    return null;
  }
};
