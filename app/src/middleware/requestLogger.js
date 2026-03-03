// ============================================================
//  PONTAJ MANAGER — middleware/requestLogger.js
//  Middleware de logging HTTP minimal
// ============================================================

/**
 * Loghează fiecare request HTTP: metoda, path, status, durata.
 * Se poate activa/dezactiva din server prin variabila de mediu LOG_REQUESTS=true.
 */
function requestLogger(req, res, next) {
    if (process.env.LOG_REQUESTS !== 'true') return next();

    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.url} → ${res.statusCode} (${ms}ms)\x1b[0m`);
    });
    next();
}

module.exports = requestLogger;
