/**
 * Privacy-hardened Centralized Logging Facility
 * Features: Circular buffer, sanitization of sensitive data, and device-local storage.
 */
const Logger = {
    MAX_LOGS: 100,
    SYSTEM_NAME: 'Another Share',

    /**
     * Records a log entry if logging is enabled.
     * @param {string} level - info, warn, error
     * @param {string} message - Human-readable message
     * @param {Object} [details] - Optional system details (automatically sanitized)
     */
    _queue: [],
    _isProcessing: false,

    async _record(level, message, details = null) {
        this._queue.push({ level, message, details });
        this._processQueue();
    },

    async _processQueue() {
        if (this._isProcessing || this._queue.length === 0) return;
        this._isProcessing = true;

        let item = null;
        try {
            item = this._queue.shift();
            const { logs = [], debugLogging = false } = await browser.storage.local.get(['logs', 'debugLogging']);

            const sanitizedMessage = this._sanitizeMessage(item.message);
            const sanitizedDetails = item.details ? this._sanitize(item.details) : null;

            if (debugLogging) {
                console.log(`[Diagnostic] ${item.level.toUpperCase()}: ${sanitizedMessage}`, sanitizedDetails || '');

                const entry = {
                    timestamp: new Date().toISOString(),
                    level: item.level.toUpperCase(),
                    message: sanitizedMessage,
                    details: sanitizedDetails,
                    context: (typeof window !== 'undefined' ? (window.location.pathname.split('/').pop() || 'popup') : 'background')
                };

                logs.push(entry);
                if (logs.length > this.MAX_LOGS) logs.shift();
                await browser.storage.local.set({ logs });
            }
        } catch (e) {
            // Fallback for critical failures
            if (item && item.level === 'error') {
                const safeMessage = (e && typeof e.message === 'string') ? e.message : 'unknown logging failure';
                console.error('Logger failed:', safeMessage);
            }
        } finally {
            this._isProcessing = false;
            this._processQueue();
        }
    },

    /**
     * Strips URLs, Titles, and Selections from metadata objects
     */
    _sanitize(obj) {
        if (obj instanceof Error) {

            const stackFirstLine = (typeof obj.stack === 'string' && obj.stack.trim())
                ? obj.stack.split('\n')[0]
                : '';
            return {
                name: obj.name,
                message: obj.message,
                stack: stackFirstLine || '[REDACTED_STACK]'
            };
        }

        if (typeof obj !== 'object' || obj === null) return obj;

        const sensitiveKeys = ['url', 'title', 'text', 'selection', 'originalUrl', 'path', 'token', 'key', 'password', 'auth', 'email'];
        const sanitized = Array.isArray(obj) ? [] : {};

        for (let [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
                sanitized[key] = '[MASKED_FOR_PRIVACY]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this._sanitize(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    },

    _sanitizeMessage(message) {
        if (typeof message !== 'string') return '';
        return message
            .replace(/https?:\/\/\S+/gi, '[MASKED_URL]')
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[MASKED_EMAIL]')
            .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[MASKED_TOKEN]')
            .slice(0, 300);
    },

    info(msg, details) {
        return this._record('info', msg, details);
    },

    warn(msg, details) {
        return this._record('warn', msg, details);
    },

    error(msg, details) {
        // Errors are critical, so we might want to ensure they are seen even if debug is off, 
        // but for strict silence we rely on debugLogging. 
        // However, usually errors should always be printable to console for debugging even if not stored.
        // But user said "logging although disabled".
        // Let's compromise: Errors always to console? Or strictly follow the flag?
        // User asked to disable logging.
        // I will make info/warn strict. 
        return this._record('error', msg, details);
    },

    async clear() {
        await browser.storage.local.remove('logs');
    },

    async getExport() {
        const { logs = [] } = await browser.storage.local.get('logs');
        if (logs.length === 0) return "No logs found.";

        return logs.map(l => {
            const detailStr = l.details ? ` | Data: ${JSON.stringify(l.details)}` : '';
            return `[${l.timestamp}] [${l.context}] [${l.level}] ${l.message}${detailStr}`;
        }).join('\n');
    },

    /**
     * Debug helper - logs diagnostic info only if debugLogging is enabled
     * @param {string} message - Debug message
     */
    async debug(msg) {
        const { debugLogging = false } = await browser.storage.local.get('debugLogging');
        if (debugLogging) {
            const safeMsg = this._sanitizeMessage(msg);
            console.log(`[Diagnostic] ${safeMsg}`);
        }
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
if (typeof globalThis !== 'undefined') {
    globalThis.Logger = Logger;
} else if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

// Freeze the Logger to prevent runtime tampering
Object.freeze(Logger);
