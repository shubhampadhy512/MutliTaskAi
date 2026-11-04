import proxy from "express-http-proxy";

export const proxyWithHeader = (servicesUrl) => {
    return proxy(servicesUrl, {
        proxyReqBodyDecorator: (proxyReqOpts, req) => {
            if (req.user) {
                proxyReqOpts.headers["x-user-id"] = req.user.userId
            }
        }
    });
}