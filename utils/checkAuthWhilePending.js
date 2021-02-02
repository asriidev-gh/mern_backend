const jwt = require("jsonwebtoken");

const authenticateTokenWhilePending = (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send("No Token, Access Denied!");

    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) {
            res.sendStatus(401);
        } else {
            req.userId = user.userId;
            req.userRole = user.userRole;
            req.isActivated = user.isActivated;

            next();
        }
    });
};

module.exports = authenticateTokenWhilePending;