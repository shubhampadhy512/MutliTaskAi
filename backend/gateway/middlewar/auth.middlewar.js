import redis from '../../shared/redis/redis.js';

const checkUserSession = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;
        
        console.log("raw cookie header:", req.headers.cookie);
        console.log("parsed cookies:", req.cookies);
        if (!sessionId) {
            return res.status(401).json({
                message: 'Unauthorized: Session not found'
            })
        }
        const session = await redis.get(`session-${sessionId}`);
        if (!session) {
            return res.status(401).json({
                message: 'Unauthorized: Invalid session'
            })
        }
        req.user = JSON.parse(session);
        next();
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

export default checkUserSession;