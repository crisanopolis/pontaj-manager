// ============================================================
//  PONTAJ MANAGER — middleware/errorHandler.js
//  Middleware global pentru tratarea erorilor Express
// ============================================================

/**
 * Middleware de erori Express (4 parametri = error handler).
 * Prinde orice eroare aruncata din rute, o logeaza si returneaza JSON.
 */
function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    console.error(`[${new Date().toISOString()}] ERROR ${status}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    res.status(status).json({
        error: err.message || 'Eroare interna de server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;
