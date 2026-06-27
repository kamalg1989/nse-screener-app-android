import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * DataCache - High-performance caching layer for market data
 * Uses AsyncStorage (built-in with React Native/Expo)
 * TTL: 24 hours by default
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // milliseconds
}

class DataCache {
  /**
   * Get cached data if fresh (within TTL)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await AsyncStorage.getItem(key)
      if (!entry) return null

      const cached: CacheEntry<T> = JSON.parse(entry)
      const now = Date.now()
      const age = now - cached.timestamp

      // Check if expired
      if (age > cached.ttl) {
        await AsyncStorage.removeItem(key)
        return null
      }

      console.log(`📦 [CACHE HIT] ${key} (age: ${(age / 1000).toFixed(1)}s)`)
      return cached.data
    } catch (error) {
      console.error(`[CACHE ERROR] Failed to get ${key}:`, error)
      return null
    }
  }

  /**
   * Set/update cache entry
   */
  async set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      }
      await AsyncStorage.setItem(key, JSON.stringify(entry))
      console.log(`💾 [CACHE SET] ${key} (TTL: ${(ttl / 1000 / 60).toFixed(0)}m)`)
    } catch (error) {
      console.error(`[CACHE ERROR] Failed to set ${key}:`, error)
    }
  }

  /**
   * Check if cache entry exists and is fresh
   */
  async isFresh(key: string): Promise<boolean> {
    try {
      const entry = await AsyncStorage.getItem(key)
      if (!entry) return false

      const cached: CacheEntry<any> = JSON.parse(entry)
      const age = Date.now() - cached.timestamp
      return age <= cached.ttl
    } catch {
      return false
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
    console.log(`🗑️  [CACHE DELETE] ${key}`)
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const marketDataKeys = keys.filter(k => k.startsWith('market_data_'))
      await AsyncStorage.multiRemove(marketDataKeys)
      console.log(`🗑️  [CACHE CLEARED] ${marketDataKeys.length} entries`)
    } catch (error) {
      console.error('[CACHE ERROR] Failed to clear cache:', error)
    }
  }

  /**
   * Get cache stats for debugging
   */
  async getStats(): Promise<{ entryCount: number; oldestEntry?: { key: string; age: number } }> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const marketDataKeys = keys.filter(k => k.startsWith('market_data_'))
      let oldestEntry: { key: string; age: number } | undefined

      for (const key of marketDataKeys) {
        const entry = await AsyncStorage.getItem(key)
        if (entry) {
          const cached = JSON.parse(entry)
          const age = Date.now() - cached.timestamp

          if (!oldestEntry || age > oldestEntry.age) {
            oldestEntry = { key, age }
          }
        }
      }

      return {
        entryCount: marketDataKeys.length,
        oldestEntry,
      }
    } catch (error) {
      console.error('[CACHE ERROR] Failed to get stats:', error)
      return { entryCount: 0 }
    }
  }
}

// Export singleton instance
export const cache = new DataCache()

export default DataCache
