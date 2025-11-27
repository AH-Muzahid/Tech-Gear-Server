/**
 * Logger utility for production-safe logging
 * Only logs in development mode, silent in production
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
    /**
     * Log informational messages
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (isDevelopment) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * Log error messages
     * Always logs errors even in production for debugging
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * Log warning messages
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        if (isDevelopment) {
            console.warn('[WARN]', ...args);
        }
    },

    /**
     * Log debug messages (only in development)
     * @param {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.debug('[DEBUG]', ...args);
        }
    },

    /**
     * Log success messages
     * @param {...any} args - Arguments to log
     */
    success: (...args) => {
        if (isDevelopment) {
            console.log('[SUCCESS]', ...args);
        }
    }
};

module.exports = logger;
