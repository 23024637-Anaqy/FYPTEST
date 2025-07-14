// Simple endpoint to check if logging is working
module.exports = async (req, res) => {
    const timestamp = new Date().toISOString();
    
    // Log to Vercel's function logs
    console.log(`[${timestamp}] === LOGS TEST ENDPOINT ===`);
    console.log(`[${timestamp}] Method: ${req.method}`);
    console.log(`[${timestamp}] URL: ${req.url}`);
    console.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2));
    
    if (req.method === 'POST') {
        console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));
    }
    
    console.log(`[${timestamp}] Environment: ${process.env.NODE_ENV}`);
    console.log(`[${timestamp}] MongoDB URI Set: ${process.env.MONGODB_URI ? 'YES' : 'NO'}`);
    console.log(`[${timestamp}] JWT Secret Set: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
    
    const response = {
        timestamp,
        message: 'Logs test endpoint called',
        method: req.method,
        url: req.url,
        environment: process.env.NODE_ENV,
        mongoDbSet: !!process.env.MONGODB_URI,
        jwtSecretSet: !!process.env.JWT_SECRET,
        note: 'Check Vercel function logs for detailed output'
    };
    
    console.log(`[${timestamp}] Response:`, JSON.stringify(response, null, 2));
    console.log(`[${timestamp}] === END LOGS TEST ===`);
    
    res.json(response);
};
